set -e
python3 - <<'PY'
from pathlib import Path
p=Path('/opt/carapace-control/server.py')
s=p.read_text(encoding='utf-8')
# remove trailing appended patch blocks if present after serve_forever
s=s.replace("\n\ndef _post_patch(self):", "\n\n#PATCH_MARKER\ndef _post_patch(self):")
parts=s.split("HTTPServer(('0.0.0.0',80), H).serve_forever()")
if len(parts)!=2:
    raise SystemExit('unexpected server.py layout')
pre, post = parts
# collect patch block from either pre or post
patch='''
def _post_patch(self):
    u = urlparse(self.path); q = parse_qs(u.query)
    if u.path != '/admin/publish':
        return self.j(404, {'ok':False,'error':'not found'})
    if not self.ok_admin(q):
        return self.j(401, {'ok':False,'error':'unauthorized'})
    try:
        body = json.loads(self.read_raw().decode('utf-8') or '{}')
    except Exception:
        return self.j(400, {'ok':False,'error':'invalid json'})
    platform = safe(body.get('platform','win'))
    channel = safe(body.get('channel','stable'))
    meta = {
        'version': str(body.get('version','')).strip(),
        'url': str(body.get('url','')).strip(),
        'notes': str(body.get('notes','')).strip(),
        'publishedAt': now()
    }
    write_json(os.path.join(CHANNELS_ROOT, channel, f'{platform}.json'), meta)
    return self.j(200, {'ok':True,'channel':channel,'platform':platform,'release':meta})

H.do_POST = _post_patch
'''
# strip any existing copies
for blk in [patch, patch.replace("\n\n","\n")]:
    pre=pre.replace(blk,'')
    post=post.replace(blk,'')
new = pre.rstrip()+"\n"+patch+"\nHTTPServer(('0.0.0.0',80), H).serve_forever()\n"
p.write_text(new, encoding='utf-8')
print('reordered patch before serve_forever')
PY
python3 -m py_compile /opt/carapace-control/server.py
systemctl restart carapace-ops-control.service
sleep 1
curl -i https://ops.carapaceai.org/health --max-time 12
curl -i -X POST "https://ops.carapaceai.org/admin/publish" -H "x-admin-token: KzvlrRjixqCpgAYJn2IGHuLwDPTBmf8Zs07Qo1VS" -H "Content-Type: application/json" -d '{"platform":"win","channel":"stable","version":"0.0.7","url":"http://example","notes":"service-managed-patch-2"}' --max-time 15
