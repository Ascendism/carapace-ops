set -e
if ! grep -q "H.do_POST = _post_patch" /opt/carapace-control/server.py; then
cat >> /opt/carapace-control/server.py <<'EOF'

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
EOF
fi
python3 -m py_compile /opt/carapace-control/server.py
systemctl restart carapace-ops-control.service
sleep 1
curl -i https://ops.carapaceai.org/health --max-time 12
curl -i -X POST "https://ops.carapaceai.org/admin/publish" -H "x-admin-token: KzvlrRjixqCpgAYJn2IGHuLwDPTBmf8Zs07Qo1VS" -H "Content-Type: application/json" -d '{"platform":"win","channel":"stable","version":"0.0.6","url":"http://example","notes":"service-managed-patch"}' --max-time 15
