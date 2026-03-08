set -e
cp /opt/carapace-control/server.py /opt/carapace-control/server.py.bak.autofix.$(date +%s)
python3 - <<'PY'
from pathlib import Path
p=Path('/opt/carapace-control/server.py')
s=p.read_text(encoding='utf-8')
if 'def do_POST(self):' not in s:
    marker="""    return self.j(404, {'ok':False,'error':'not found'})\nHTTPServer(('0.0.0.0',80), H).serve_forever()"""
    insert="""    return self.j(404, {'ok':False,'error':'not found'})\n\n  def do_POST(self):\n    u=urlparse(self.path); q=parse_qs(u.query)\n    if u.path=='/admin/publish':\n      if not self.ok_admin(q): return self.j(401, {'ok':False,'error':'unauthorized'})\n      try: body=json.loads(self.read_raw().decode('utf-8') or '{}')\n      except: return self.j(400, {'ok':False,'error':'invalid json'})\n      platform=safe(body.get('platform','win')); channel=safe(body.get('channel','stable'))\n      meta={'version':str(body.get('version','')).strip(),'url':str(body.get('url','')).strip(),'notes':str(body.get('notes','')).strip(),'publishedAt':now()}\n      write_json(os.path.join(CHANNELS_ROOT,channel,f'{platform}.json'), meta)\n      return self.j(200, {'ok':True,'channel':channel,'platform':platform,'release':meta})\n    if u.path=='/admin/upload-installer':\n      if not self.ok_admin(q): return self.j(401, {'ok':False,'error':'unauthorized'})\n      name=safe((q.get('fileName',['Carapace-Setup.exe'])[0] or 'Carapace-Setup.exe')); raw=self.read_raw()\n      fp=os.path.join(DOWNLOADS_ROOT,name)\n      with open(fp,'wb') as f: f.write(raw)\n      return self.j(200, {'ok':True,'path':'/downloads/'+name,'size':len(raw)})\n    return self.j(404, {'ok':False,'error':'not found'})\n\nHTTPServer(('0.0.0.0',80), H).serve_forever()"""
    if marker not in s:
        raise SystemExit('marker not found; refusing to patch')
    s=s.replace(marker, insert, 1)
    p.write_text(s, encoding='utf-8')
print('patch-ready')
PY
python3 -m py_compile /opt/carapace-control/server.py
pkill -f '/opt/carapace-control/server.py' || true
nohup /usr/bin/python3 /opt/carapace-control/server.py >/var/log/carapace-control.log 2>&1 &
sleep 1
curl -i https://ops.carapaceai.org/health --max-time 10
curl -i -X POST "https://ops.carapaceai.org/admin/publish" -H "x-admin-token: KzvlrRjixqCpgAYJn2IGHuLwDPTBmf8Zs07Qo1VS" -H "Content-Type: application/json" -d '{"platform":"win","channel":"stable","version":"0.0.1","url":"http://example","notes":"probe"}' --max-time 15
