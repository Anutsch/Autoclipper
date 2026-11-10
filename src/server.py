#!/usr/bin/python3
import hashlib, json, os, re, secrets, subprocess, threading, time, uuid
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.parse import urlsplit, parse_qs
from audio_sync import synchronize
from editors import NAMES, destination, handoff, running_editors
from platform_tools import acquire_lock, install_panel, launch_premiere, open_chrome_setup, open_folder, panel_directory, reveal_media, show_app, thumbnail_command, trash_file
ROOT=Path(__file__).resolve().parent.parent
CONFIG=json.loads((ROOT/'config.json').read_text(encoding='utf-8'))
TOKEN=CONFIG['token']; PORT=CONFIG['port']
LOCK=threading.RLock()
TERMINAL={'done','error'}

def atomic_json(path,data):
 temp=path.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8');temp.replace(path)

def allowed_media(url):
 u=urlsplit(url);host=(u.hostname or '').lower()
 return u.scheme=='https' and u.port in (None,443) and not u.username and any(host==h or host.endswith('.'+h) for h in ('twitch.tv','ttvnw.net','twitchcdn.net','d1ndex63qxojbr.cloudfront.net'))

class SafeRedirect(HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  if not allowed_media(newurl): raise ValueError('Unerwartete Download-Weiterleitung blockiert.')
  return super().redirect_request(req,fp,code,msg,headers,newurl)

class Store:
 def __init__(self,root):
  self.root=root;self.file=root/'state.json';self.browser={};self.browser_time=0;self.premiere={};self.premiere_time=0;self.selection=[];self.browser_commands=[];self.chat_reload=None
  self.data={'counter':0,'jobs':[]}
  if self.file.exists(): self.data=json.loads(self.file.read_text(encoding='utf-8'))
  for j in self.data['jobs']:
   if j['status'] not in TERMINAL:
    j.update(status='error',message='Anwendung wurde beendet. Download ggf. vorhanden; erneut starten oder MP4 erneut importieren.')
  self.save()
 def save(self): atomic_json(self.file,self.data)
 def update(self,j,**kw):
  with LOCK: j.update(kw);j['updated']=time.time();self.save()
 def add(self,kind,**kw):
  with LOCK:
   j=dict(id=uuid.uuid4().hex,kind=kind,status='queued',created=time.time(),message='Wartet …',**kw)
   self.data['jobs'].append(j);self.save();return j
 def project_path(self):
  with LOCK:
   maximum=self.data.get('counter',0)
   roots=[self.root/'Projekte',Path.home()/'Desktop',Path.home()/'Documents'/'Adobe'/'Premiere Pro']
   for base in roots:
    if not base.exists():continue
    for p in base.rglob('*.prproj'):
     m=re.fullmatch(r'TiktokAC\s*(\d+)',p.stem,re.I)
     if m:maximum=max(maximum,int(m[1]))
   folder=self.root/'Projekte';folder.mkdir(exist_ok=True)
   maximum+=1
   while (folder/f'TiktokAC{maximum}.prproj').exists():maximum+=1
   self.data['counter']=maximum;self.save();return str(folder/f'TiktokAC{maximum}.prproj')
 def finish_batch(self,parent_id):
  with LOCK:
   parent=next((j for j in self.data['jobs'] if j['id']==parent_id),None)
   if parent is None:return
   if parent['status'] in TERMINAL:return
   children=parent.get('sources',[])
   if any(c['status'] not in ('ready','error') for c in children):return
   if parent.get('bootstrapError'):
    self.update(parent,status='error',message=parent['bootstrapError']);return
   failed=[c for c in children if c['status']=='error']
   if failed:self.update(parent,status='error',message='Nicht alle Ansichten konnten geladen werden. Bereits geladene MP4s bleiben im Clips-Ordner. '+ '; '.join(c['message'] for c in failed))
   elif parent.get('syncMode'):self.update(parent,status='sync_wait',message='Wartet auf die übrigen Ansichten …')
   else:self.update(parent,status='import_wait',path=json.dumps({'sources':children,'targetProject':parent.get('targetProject','')},ensure_ascii=True),message=str(len(children))+' Ansichten geladen · '+NAMES[parent.get('editor','premiere')])
 def active_paths(self):
  paths=set()
  for j in self.data['jobs']:
   if j['status'] in TERMINAL:continue
   if j.get('path'):paths.add(j['path'])
   for c in j.get('sources',[]):
    if c.get('path'):paths.add(c['path'])
  return paths
 def storage(self):
  files=[]
  folder=self.root/'Clips'
  active=self.active_paths()
  if folder.exists():
   for p in folder.glob('*.mp4'):
    if p.is_symlink() or not p.is_file():continue
    stat=p.stat();files.append(dict(name=p.name,size=stat.st_size,created=stat.st_mtime,busy=str(p) in active))
  files.sort(key=lambda f:f['created'],reverse=True)
  log=self.root/'app.log'
  return dict(files=files,totalBytes=sum(f['size'] for f in files),logBytes=log.stat().st_size if log.exists() else 0,historyCount=sum(j['status'] in TERMINAL for j in self.data['jobs']))
 def cleanup(self,d):
  names=d.get('files',[])
  if not isinstance(names,list) or any(not isinstance(n,str) for n in names):raise ValueError('Ungültige Dateiauswahl.')
  if type(d.get('history',False)) is not bool or type(d.get('logs',False)) is not bool:raise ValueError('Ungültige Auswahl.')
  if d.get('logs') and (self.root/'app.log').is_symlink():raise ValueError('Technisches Log ist unerwartet verknüpft.')
  names=list(dict.fromkeys(names));folder=self.root/'Clips';paths=[]
  active=self.active_paths()
  for name in names:
   p=folder/name
   if Path(name).name!=name or not name.endswith('.mp4') or p.is_symlink() or not p.is_file() or p.resolve().parent!=folder.resolve():raise ValueError('Datei ist nicht mehr vorhanden oder nicht auswählbar: '+name)
   if str(p) in active:raise ValueError('Diese Datei wartet noch auf Premiere: '+name)
   paths.append(p)
  removed=[];errors=[];total=0
  for p in paths:
   size=p.stat().st_size
   try:trashed=trash_file(self.root,p)
   except (OSError,ImportError,subprocess.TimeoutExpired):errors.append(p.name+': Verschieben fehlgeschlagen.');continue
   if not trashed or p.exists():errors.append(p.name+': Papierkorb nicht verfügbar.');continue
   removed.append(p.name);total+=size
   (self.root/'.thumbnails'/(hashlib.sha256(p.name.encode()).hexdigest()+'.jpg')).unlink(missing_ok=True)
   for j in self.data['jobs']:
    if j.get('path')==str(p):j['mediaDeleted']=True
    for child in j.get('sources',[]):
     if child.get('path')==str(p):child['mediaDeleted']=True
  count=0
  if d.get('history'):
   before=len(self.data['jobs']);self.data['jobs']=[j for j in self.data['jobs'] if j['status'] not in TERMINAL];count=before-len(self.data['jobs'])
  logs_cleared=False
  if d.get('logs'):
   try:(self.root/'app.log').write_bytes(b'');logs_cleared=True
   except OSError:errors.append('Technisches Log konnte nicht geleert werden.')
  self.save()
  return dict(removed=removed,bytes=total,historyCleared=count,logsCleared=logs_cleared,errors=errors)
 def saved_media(self,job):
  sources=job.get('sources',[]) if job['kind']=='batch' else [job]
  folder=(self.root/'Clips').resolve()
  paths=[]
  for source in sources:
   if not source.get('path') or source.get('mediaDeleted'):continue
   path=Path(source['path'])
   if path.suffix=='.mp4' and not path.is_symlink() and path.is_file() and path.resolve().parent==folder:paths.append(str(path))
  return paths
 def retryable(self,j):
  if j['status']!='error':return False
  if j['kind']=='batch':
   sources=j.get('sources',[])
   return bool(sources) and all(c.get('path') and not c.get('mediaDeleted') and Path(c['path']).is_file() for c in sources)
  return j['kind']=='clip' and bool(j.get('path')) and not j.get('mediaDeleted') and Path(j['path']).is_file()
 def editor(self):
  preference=self.data.get('preferences',{}).get('editor','auto')
  return destination() if preference=='auto' or preference not in NAMES else preference
 def view(self):
  with LOCK:
   recent={j['id'] for j in self.data['jobs'][-30:]}
   jobs=[dict(j,retryable=self.retryable(j),hasMedia=bool(self.saved_media(j))) for j in self.data['jobs'] if j['id'] in recent or j['status'] not in TERMINAL]
   try:
    installed=(panel_directory()/'panel.js').read_bytes()==(self.root/'Premiere-Panel/panel.js').read_bytes()
   except OSError:
    installed=False
   return dict(panelInstalled=installed,editor=self.editor(),runningEditors=list(running_editors()),preferences=self.data.get('preferences',{}),chatReload=self.chat_reload,browser=self.browser if time.time()-self.browser_time<15 else {},premiere=self.premiere if time.time()-self.premiere_time<8 else {},jobs=jobs,selection=self.selection,root=str(self.root),storage=self.storage())

STORE=None

def mp4_duration(path):
 # Read movie metadata by seeking between boxes, not by decoding the video.
 import struct
 with Path(path).open('rb') as f:
  limit=f.seek(0,2)
  def boxes(start,end):
   cursor=start
   while cursor+8<=end:
    f.seek(cursor);header=f.read(8)
    if len(header)!=8:return
    size,kind=struct.unpack('>I4s',header);offset=8
    if size==1:
     ext=f.read(8)
     if len(ext)!=8:return
     size=struct.unpack('>Q',ext)[0];offset=16
    elif size==0:size=end-cursor
    if size<offset or cursor+size>end:return
    yield kind,cursor+offset,cursor+size
    cursor+=size
  for kind,start,end in boxes(0,limit):
   if kind!=b'moov':continue
   for kind,body,stop in boxes(start,end):
    if kind!=b'mvhd':continue
    f.seek(body);data=f.read(min(40,stop-body))
    if len(data)<20:continue
    if data[0]==0:scale,duration=struct.unpack('>II',data[12:20])
    elif data[0]==1 and len(data)>=32:scale=struct.unpack('>I',data[20:24])[0];duration=struct.unpack('>Q',data[24:32])[0]
    else:continue
    if scale and 0<duration/scale<86400:return duration/scale
 raise ValueError('MP4 vollständig geladen, aber ihre Dauer konnte nicht gelesen werden. Datei bleibt zur Kontrolle erhalten.')

def download_cancelled(j):
 if j.get('cancelRequested'):return True
 return any(p['id']==j.get('parentId') and p.get('cancelRequested') for p in STORE.data['jobs'])

def download(j,url):
 part=None
 try:
  if download_cancelled(j):raise ValueError('Abgebrochen.')
  if not allowed_media(url):raise ValueError('Keine erlaubte Twitch-MP4-Adresse gefunden.')
  folder=ROOT/'Clips';folder.mkdir(exist_ok=True)
  name=re.sub(r'[^\w.-]+','_',j.get('channel','Twitch'))[:60]
  dest=folder/(time.strftime('%Y%m%d_%H%M%S')+'_'+name+'_'+j['id'][:6]+'.mp4');part=dest.with_suffix('.mp4.part')
  STORE.update(j,status='downloading',message='Twitch-MP4 wird heruntergeladen …')
  req=Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://www.twitch.tv/'})
  with build_opener(SafeRedirect()).open(req,timeout=45) as response, part.open('xb') as out:
   size=int(response.headers.get('Content-Length','0'));total=0;last=0
   if response.status!=200:raise ValueError('Twitch liefert keine vollständige Datei (HTTP '+str(response.status)+').')
   while True:
    if download_cancelled(j):raise ValueError('Abgebrochen.')
    chunk=response.read(1024*1024)
    if download_cancelled(j):raise ValueError('Abgebrochen.')
    if not chunk:break
    if total==0 and (len(chunk)<12 or chunk[4:8]!=b'ftyp'):raise ValueError('Twitch-Antwort ist keine MP4-Videodatei.')
    total+=len(chunk)
    if total>2*1024**3:raise ValueError('Download überschreitet 2 GB.')
    out.write(chunk)
    if time.time()-last>1:
     STORE.update(j,downloadedBytes=total,totalBytes=size,message=f'Download: {total//1048576} MB'+(f' / {size//1048576} MB' if size else ''))
     parent=next((p for p in STORE.data['jobs'] if p['id']==j.get('parentId')),None)
     if parent and parent['status'] not in TERMINAL:STORE.update(parent,message=j['message'],downloadedBytes=total,totalBytes=size)
     last=time.time()
   if not total or (size and total!=size):raise ValueError('Download unvollständig. Bitte erneut clippen.')
  if download_cancelled(j):raise ValueError('Abgebrochen.')
  part.replace(dest)
  if j.get('playback',{}).get('resolveDuration'):
   duration=mp4_duration(dest);j['playback'].update(start=max(0,duration-90),end=duration,resolveDuration=False)
  STORE.update(j,path=str(dest),status='ready' if j.get('parentId') else 'import_wait',message='MP4 heruntergeladen.')
  if j.get('parentId'):STORE.finish_batch(j['parentId'])
 except Exception as e:
  if part:part.unlink(missing_ok=True)
  STORE.update(j,status='error',message=str(e))
  if j.get('parentId'):STORE.finish_batch(j['parentId'])

def queue_loop():
 while True:
  job=None;child=None;leader=None;external=None
  with LOCK:
   for member in STORE.data['jobs']:
    if member['status']=='sync_follow':
     owner=next((j for j in STORE.data['jobs'] if member['id'] in j.get('syncMemberIds',[])),None)
     if owner and owner['status'] in TERMINAL:STORE.update(member,status=owner['status'],message=owner['message'],syncWarning=owner.get('syncWarning',''))
   first=next((j for j in STORE.data['jobs'] if j.get('queueEntry') and j['status'] not in TERMINAL),None)
   ready=next((j for j in STORE.data['jobs'] if j['status']=='import_wait'
               and j.get('editor','premiere')!='premiere'
               and (not j.get('queueEntry') or j is first)),None)
   if ready:
    external=ready
    STORE.update(ready,status='executing',message=NAMES[ready['editor']]+' · MP4s werden übergeben …')
   elif first:
    group=[j for j in STORE.data['jobs'] if j.get('captureGroup')==first.get('captureGroup')] if first.get('syncMode') else [first]
    candidate=next((j for j in group if j['status']=='download_wait'),None)
    if candidate:
     job=candidate;child=job['sources'][0];STORE.update(job,status='downloading',message='MP4 wird heruntergeladen …')
    elif first.get('syncMode') and all(j['status'] in TERMINAL or j['status']=='sync_wait' for j in group):
     members=[j for j in group if j['status']=='sync_wait' and not j.get('cancelRequested')]
     if members:
      import copy
      leader=members[0];sources=[copy.deepcopy(c) for j in members for c in j['sources'] if c['status']=='ready']
      for source in sources:source['parentId']=leader['id']
      leader['sources']=sources;leader['syncMemberIds']=[j['id'] for j in members]
      for member in members[1:]:STORE.update(member,status='sync_follow',message='Wartet auf gemeinsame Übergabe …')
      if leader.get('editor','premiere')=='premiere':
       STORE.update(leader,status='synchronizing',message='Tonspuren werden zeitlich abgeglichen …')
      else:
       STORE.update(leader,status='import_wait',message='MP4s sind bereit.')
       leader=None
  if external:
   try:
    paths=[source['path'] for source in external['sources']] if external['kind']=='batch' else [external['path']]
    message=handoff(external['editor'],paths,external.get('editorImportId',external['id']))
    STORE.update(external,status='done',message=message)
   except Exception as error:
    STORE.update(external,status='error',message=str(error)+' MP4s bleiben gespeichert.')
  elif job:
   download(child,child['url'])
   with LOCK:
    if job['status'] not in TERMINAL:STORE.finish_batch(job['id'])
  elif leader:
   cancelled=lambda:leader.get('cancelRequested') or leader['status'] in TERMINAL
   try:
    if len(leader['sources'])>1:result=synchronize(leader['sources'],ROOT,cancelled)
    else:result={'verified':False,'warning':'Nur eine Ansicht verfügbar; kein Audio-Abgleich möglich.'}
    with LOCK:
     if not cancelled():
      warning=result.get('warning','');leader['syncResult']=result;leader['syncWarning']=warning
      STORE.update(leader,status='import_wait',path=json.dumps({'sources':leader['sources'],'targetProject':leader.get('targetProject','')},ensure_ascii=True),message=warning or 'Audio synchronisiert · wartet auf Premiere …')
   except Exception as error:
    with LOCK:
     if not cancelled():
      for i,source in enumerate(leader['sources']):source.update(syncMode=True,syncTrack=i,syncOffset=0,syncVerified=False)
      leader['syncWarning']='Audio-Abgleich fehlgeschlagen: '+str(error)+'. Ansichten müssen manuell synchronisiert werden.'
      STORE.update(leader,status='import_wait',path=json.dumps({'sources':leader['sources'],'targetProject':leader.get('targetProject','')},ensure_ascii=True),message=leader['syncWarning'])
  else:time.sleep(.2)

class Handler(BaseHTTPRequestHandler):
 def log_message(self,*a):pass
 def reply(self,data,code=200):
  body=json.dumps(data,ensure_ascii=False).encode();self.send_response(code);self.headers_out();self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 def headers_out(self):
  origin=self.headers.get('Origin','')
  if origin.startswith('chrome-extension://') or origin in ('null',f'http://127.0.0.1:{PORT}'):
   self.send_header('Access-Control-Allow-Origin',origin)
  self.send_header('Access-Control-Allow-Headers','Content-Type, X-Autoclipper-Token')
  self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
  self.send_header('Cache-Control','no-store')
 def auth(self):return secrets.compare_digest(self.headers.get('X-Autoclipper-Token',''),TOKEN)
 def do_OPTIONS(self):self.send_response(204);self.headers_out();self.end_headers()
 def do_GET(self):
  if self.path=='/assets/logo.png':
   body=(ROOT/'assets'/'logo.png').read_bytes();self.send_response(200);self.send_header('Content-Type','image/png');self.send_header('Content-Length',str(len(body)));self.end_headers();return self.wfile.write(body)
  if self.path=='/health':return self.reply({'app':'Autoclipper','version':1})
  if self.path=='/':
   # The app token is never exposed to an unrelated web origin.
   if self.headers.get('Host')!=f'127.0.0.1:{PORT}' or self.headers.get('Origin') or self.headers.get('Sec-Fetch-Site') in ('cross-site','same-site'):
    return self.reply({'error':'Direkt in Autoclipper öffnen.'},403)
   body=(ROOT/'src'/'index.html').read_bytes();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Security-Policy',"default-src 'self'; img-src 'self' blob: https://static-cdn.jtvnw.net https://*.twitchcdn.net; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-src https://player.twitch.tv; frame-ancestors 'none'");self.send_header('Content-Length',str(len(body)));self.end_headers();return self.wfile.write(body)
  if not self.auth():return self.reply({'error':'Nicht autorisiert'},403)
  if urlsplit(self.path).path=='/api/thumbnail':
   name=parse_qs(urlsplit(self.path).query).get('name',[''])[0];folder=ROOT/'Clips';source=folder/name
   if Path(name).name!=name or not name.endswith('.mp4') or source.is_symlink() or not source.is_file() or source.resolve().parent!=folder.resolve():return self.reply({'error':'Datei nicht vorhanden.'},404)
   cache=ROOT/'.thumbnails';cache.mkdir(exist_ok=True);output=cache/(hashlib.sha256(name.encode()).hexdigest()+'.jpg')
   try:
    if not output.exists() or output.stat().st_mtime<source.stat().st_mtime:
     temp=output.with_name(output.stem+'-'+uuid.uuid4().hex+'.jpg')
     try:
      result=subprocess.run(thumbnail_command(ROOT,source,temp),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=8)
      if result.returncode or not temp.is_file():raise ValueError('Keine Vorschau verfügbar.')
      temp.replace(output)
     finally:temp.unlink(missing_ok=True)
    body=output.read_bytes();self.send_response(200);self.headers_out();self.send_header('Content-Type','image/jpeg');self.send_header('Content-Length',str(len(body)));self.end_headers();return self.wfile.write(body)
   except Exception:return self.reply({'error':'Keine Vorschau verfügbar.'},404)
  if self.path=='/api/state':return self.reply(STORE.view())
  return self.reply({'error':'Nicht gefunden'},404)
 def do_POST(self):
  if not self.auth():return self.reply({'error':'Nicht autorisiert'},403)
  try:
   length=int(self.headers.get('Content-Length','0'))
   if length>200000:raise ValueError('Anfrage zu groß')
   data=json.loads(self.rfile.read(length) or b'{}')
   with LOCK: result=self.action(self.path,data)
   self.reply(result)
  except Exception as e:self.reply({'error':str(e)},400)
 def action(self,path,d):
  if path=='/api/selection':
   ids=d.get('tabIds',[])
   if not isinstance(ids,list) or len(ids)>8 or any(type(i) is not int for i in ids):raise ValueError('Ungueltige Tab-Auswahl.')
   valid={t['id'] for t in STORE.browser.get('tabs',[])}
   STORE.selection=list(dict.fromkeys(i for i in ids if i in valid));return {'ok':True}
  if path=='/api/editor':
   editor=d.get('editor')
   if not isinstance(editor,str) or editor not in ('auto',*NAMES):raise ValueError('Ungültiges Schnittziel.')
   STORE.data.setdefault('preferences',{})['editor']=editor;STORE.save();return {'ok':True}
  if path=='/api/open-premiere':
   launch_premiere();return {'ok':True}
  if path=='/api/preferences':
   value=d.get('autoChatReconnect')
   if type(value) is not bool:raise ValueError('Ungültige Einstellung.')
   STORE.data.setdefault('preferences',{})['autoChatReconnect']=value;STORE.save();return {'ok':True}
  if path=='/api/chat-reload':
   if time.time()-STORE.browser_time>15:raise ValueError('Chrome-Erweiterung ist nicht verbunden.')
   if STORE.chat_reload and STORE.chat_reload.get('status')=='running' and time.time()-STORE.chat_reload['at']<30:raise ValueError('Chats werden bereits neu verbunden.')
   ids=[t['id'] for t in STORE.browser.get('tabs',[]) if re.fullmatch(r'https://(?:www\.)?twitch\.tv/[A-Za-z0-9_]+/?',t.get('url',''))]
   if not ids:raise ValueError('Keine geöffneten Stream-Tabs.')
   ident=secrets.token_hex(8);STORE.chat_reload={'id':ident,'status':'running','at':time.time(),'count':len(ids)}
   STORE.browser_commands.append({'type':'reload-chats','id':ident,'tabIds':ids});return STORE.chat_reload
  if path=='/api/chat-reload-result':
   if STORE.chat_reload and STORE.chat_reload['id']==d.get('id'):
    results=d.get('results',[]);STORE.chat_reload.update(status='done',results=results,failed=sum(not c.get('ok') for c in results))
   return {'ok':True}
  if path=='/api/focus-stream':
   ident=d.get('tabId')
   if type(ident) is not int or not any(t['id']==ident for t in STORE.browser.get('tabs',[])):raise ValueError('Stream-Tab nicht mehr geöffnet.')
   if len(STORE.browser_commands)>=8:raise ValueError('Chrome verarbeitet noch deine Anfrage.')
   STORE.browser_commands.append({'tabId':ident});return {'ok':True}
  if path=='/api/chrome-setup':
   open_chrome_setup(ROOT/'Chrome-Erweiterung');return {'ok':True}
  if path=='/api/install-panel':
   install_panel(ROOT/'Premiere-Panel');return {'ok':True}
  if path=='/api/reveal-clip':
   job=next((job for job in STORE.data['jobs'] if job['id']==d.get('id')),None)
   paths=STORE.saved_media(job) if job else []
   if not paths:raise ValueError('Keine gespeicherte MP4 vorhanden.')
   reveal_media(paths);return {'ok':True}
  if path=='/api/show-app':
   show_app(ROOT,PORT);return {'ok':True}
  if path=='/api/cleanup':return STORE.cleanup(d)
  if path=='/api/browser':
   for stalled in STORE.data['jobs']:
    if stalled.get('queueEntry') and stalled['status']=='clipping' and time.time()-stalled.get('captureStarted',stalled['created'])>65:STORE.update(stalled,status='error',message='Quellensuche nach 65 Sekunden beendet. Twitch lieferte keine neue MP4. Der nächste Auftrag kann weiterlaufen.')
   STORE.browser={'name':d.get('name','Chrome'),'tabs':d.get('tabs',[]),'capturing':bool(d.get('busy'))};STORE.browser_time=time.time()
   job=next((j for j in STORE.data['jobs'] if j['kind'] in ('clip','batch') and j['status']=='queued'),None) if not d.get('busy') else None
   if job:
    group=[j for j in STORE.data['jobs'] if j.get('captureGroup')==job.get('captureGroup') and j['status']=='queued'] if job.get('captureGroup') else [job]
    for entry in group:STORE.update(entry,status='capture_pending',message='Wartet auf sichtbaren Stream-Tab …')
    job=dict(job,captureJobs=group) if job.get('captureGroup') else job
   commands=STORE.browser_commands[:];STORE.browser_commands.clear()
   return {'preferences':STORE.data.get('preferences',{}),'commands':commands,'job':job,'cancelled':[j['id'] for j in STORE.data['jobs'] if j.get('cancelRequested')],'downloaded':[j['id'] for j in STORE.data['jobs'] if any(c.get('path') and Path(c['path']).is_file() for c in j.get('sources',[]))]}

  if path=='/api/rename-sequences':
   j=STORE.add('rename');STORE.update(j,status='premiere_wait',message='Sequenznamen werden dem Projekt angepasst …');return j
  if path=='/api/capture-start':
   ids=d.get('ids') or [d.get('id')]
   for ident in ids:
    j=next((j for j in STORE.data['jobs'] if j['id']==ident and j['kind'] in ('clip','batch')),None)
    if not j or j.get('cancelRequested'):continue
    if j['status'] not in ('queued','capture_pending','clipping'):continue
    STORE.update(j,status='clipping',captureStarted=time.time(),message='Stream-Tab wird jetzt sichtbar aktiviert …')
   return {'ok':True}
  if path=='/api/capture-phase':
   j=next((j for j in STORE.data['jobs'] if j['id']==d.get('id')),None)
   messages={'activate':'Stream-Tab wird aktiviert …','preview':'Aktiver Tab: Clip-Vorschau wird geöffnet …','lookup':'Aktiver Tab: Quelle untersuchen · MP4-Adresse suchen …','found':'MP4-Adresse gefunden. Download wird eingereiht …'}
   if j and j['status']=='clipping' and not j.get('cancelRequested') and d.get('phase') in messages:STORE.update(j,message=messages[d['phase']],phase=d['phase'])
   return {'ok':True}
  if path=='/api/capture-status':
   ids=d.get('ids',[])
   return {'cancelled':[ident for ident in ids if not any(j['id']==ident and not j.get('cancelRequested') and j['status'] not in TERMINAL for j in STORE.data['jobs'])]}
  if path=='/api/capture-interrupted':
   j=next((j for j in STORE.data['jobs'] if j['id']==d.get('id')),None)
   if j and j['status'] in ('queued','capture_pending','clipping'):STORE.update(j,status='error',message='Browser-Verbindung unterbrochen. Bitte neu auswählen.')
   return {'ok':True}
  if path=='/api/clip-batch':
   if time.time()-STORE.browser_time>15:raise ValueError('Chrome-Erweiterung ist nicht verbunden.')
   if any(j.get('queueEntry') and j['status'] in ('queued','capture_pending','clipping') for j in STORE.data['jobs']):raise ValueError('Die letzten Clip-Vorschauen werden noch gesichert. Gleich kannst du weitere Clips hinzufügen.')
   ids=d.get('tabIds',[])
   if not isinstance(ids,list) or not ids or len(ids)>8 or any(type(i) is not int for i in ids) or len(set(ids))!=len(ids):raise ValueError('Bitte 1 bis 8 unterschiedliche Tabs auswählen.')
   tabs=STORE.browser.get('tabs',[])
   chosen=[next((t for t in tabs if t['id']==i),None) for i in ids]
   if any(t is None for t in chosen):raise ValueError('Ein ausgewählter Tab ist nicht mehr geöffnet.')
   checks={c.get('tabId'):c for c in d.get('checks',[]) if isinstance(c,dict)}
   for tab in chosen:
    check=checks.get(tab['id'],tab.get('availability',{}))
    if check.get('state') in ('unknown','loading'):continue # Recheck when this tab is visibly activated.
    if abs(time.time()*1000-check.get('checkedAt',0))>5000:raise ValueError('Clip-Freigabe wird noch geprüft. Chrome-Erweiterung öffnen oder aktualisieren.')
    if check.get('page')!=tab.get('url'):raise ValueError('Der ausgewählte Tab wurde gewechselt. Bitte erneut auswählen.')
    if check.get('allowed') is not True:raise ValueError(tab.get('title','Twitch')+': '+str(check.get('reason','Clippen derzeit nicht möglich.')))
   stamp=d.get('requestedAt')
   if not isinstance(stamp,(int,float)) or abs(time.time()*1000-stamp)>10000:raise ValueError('Klickzeitpunkt ist veraltet. Bitte erneut versuchen.')
   editor=STORE.editor()
   connected=time.time()-STORE.premiere_time<8
   running=connected or (editor=='premiere' and 'premiere' in running_editors())
   target=STORE.premiere.get('project','') if connected else ''
   bootstrap=None
   pending_bootstrap=next((j for j in STORE.data['jobs'] if j.get('automatic') and j['status'] not in TERMINAL),None)
   if editor!='premiere':
    target=''
   elif pending_bootstrap:
    bootstrap=pending_bootstrap;target=Path(bootstrap['path']).name
   elif not running or not connected or not target:
    project=STORE.project_path()
    bootstrap=STORE.add('ensure',path=project,automatic=True)
    STORE.update(bootstrap,status='premiere_wait',message='Premiere wird gestartet und das Projekt vorbereitet …')
    if not running:
     target=Path(project).name;STORE.premiere={};STORE.premiere_time=0
    try:launch_premiere()
    except OSError:
     STORE.update(bootstrap,status='error',message='Premiere konnte nicht gestartet werden.');raise ValueError('Premiere konnte nicht gestartet werden.')
   group=uuid.uuid4().hex;jobs=[]
   for tab in chosen:
    child=dict(id=uuid.uuid4().hex,kind='clip',status='capturing',tabId=tab['id'],channel=tab.get('title','Twitch'),sequenceKey=group)
    job=STORE.add('batch',queueEntry=True,captureGroup=group,editor=editor,syncMode=len(chosen)>1,tabIds=[tab['id']],tabs=[tab],sources=[child],requestedAt=stamp,targetProject=target,bootstrapId=bootstrap['id'] if bootstrap else None,channel=tab.get('title','Twitch'))
    child['parentId']=job['id'];jobs.append(job)
   STORE.save()
   return dict(jobs[0],captureJobs=jobs)


  if path=='/api/source-result':
   parent=next((j for j in STORE.data['jobs'] if j['id']==d.get('id') and j['kind']=='batch'),None)
   if not parent or parent['status'] not in ('clipping','downloading'):return {'ok':True}
   child=next((c for c in parent.get('sources',[]) if c['tabId']==d.get('tabId')),None)
   if not child:raise ValueError('Ansicht gehört nicht zum Auftrag.')
   if child['status']!='capturing':return {'ok':True}
   child['parentId']=parent['id']
   if d.get('error'):
    STORE.update(child,status='error',message=str(d['error']));STORE.finish_batch(parent['id']);return {'ok':True}
   pb=d.get('playback',{})
   if not allowed_media(d.get('url','')) or not isinstance(pb.get('start'),(float,int)) or not isinstance(pb.get('end'),(float,int)) or pb['start']<0 or pb['end']<=pb['start'] or pb['end']-pb['start']>90.1:raise ValueError('MP4-Wiedergabebereich ungültig.')
   if parent.get('queueEntry'):
    STORE.update(child,status='download_wait',url=d['url'],playback=pb,message='MP4 gesichert. Wartet in der Warteschlange …')
    STORE.update(parent,status='download_wait',message='Vorschau gesichert · wartet auf Download und Import …');return {'ok':True}
   STORE.update(child,status='downloading',url=d['url'],playback=pb,message='MP4 gefunden. Download startet …')
   STORE.update(parent,status='downloading',message='Ansichten werden vorbereitet und parallel heruntergeladen …')
   threading.Thread(target=download,args=(child,child['url']),daemon=True).start()
   return {'ok':True}

  if path=='/api/batch-result':
   j=next((j for j in STORE.data['jobs'] if j['id']==d.get('id') and j['kind']=='batch'),None)
   if not j or j['status']!='clipping':return {'ok':True}
   results=d.get('results',[])
   if not isinstance(results,list) or len(results)!=len(j['tabIds']) or {r.get('tabId') for r in results}!=set(j['tabIds']):raise ValueError('Ansichten sind unvollständig.')
   failures=[r for r in results if r.get('error')]
   if failures:
    STORE.update(j,status='error',message='Keine Ansichten importiert: '+ '; '.join('Tab '+str(r['tabId'])+': '+str(r['error']) for r in failures));return {'ok':True}
   for r in results:
    pb=r.get('playback',{})
    if not allowed_media(r.get('url','')) or not isinstance(pb.get('start'),(float,int)) or not isinstance(pb.get('end'),(float,int)) or pb['start']<0 or pb['end']<=pb['start'] or pb['end']-pb['start']>90.1:raise ValueError('MP4-Wiedergabebereich ungültig.')
   children=[]
   for tab_id in j['tabIds']:
    r=next(r for r in results if r['tabId']==tab_id)
    children.append(dict(id=uuid.uuid4().hex,parentId=j['id'],kind='clip',status='downloading',tabId=tab_id,channel=r.get('channel','Twitch'),playback=r['playback'],url=r['url']))
   STORE.update(j,status='downloading',sources=children,message=str(len(children))+' MP4-Ansichten werden heruntergeladen …')
   for c in children:threading.Thread(target=download,args=(c,c['url']),daemon=True).start()
   return {'ok':True}
  if path=='/api/clip':
   if time.time()-STORE.browser_time>15:raise ValueError('Chrome-Erweiterung ist nicht verbunden. Bitte Einrichtung abschließen.')
   if any(j['status'] not in TERMINAL and j['kind'] in ('clip','batch') for j in STORE.data['jobs']):raise ValueError('Ein Clip läuft bereits. Bitte diesen zuerst abschließen.')
   tab=next((t for t in STORE.browser.get('tabs',[]) if t['id']==d.get('tabId')),None)
   if not tab:raise ValueError('Twitch-Tab ist nicht mehr geöffnet.')
   return STORE.add('clip',tabId=tab['id'],channel=tab.get('title','Twitch'))
  if path=='/api/clip-result':
   j=next((j for j in STORE.data['jobs'] if j['id']==d['id'] and j['kind']=='clip'),None)
   if j is None:return {'ok':True}
   if j['status']!='clipping':return {'ok':True}
   if d.get('error'):STORE.update(j,status='error',message=d['error'])
   else:
    if not allowed_media(d.get('url','')):raise ValueError('Ungültige Twitch-Video-Adresse')
    STORE.update(j,status='downloading',message='MP4 gefunden …')
    threading.Thread(target=download,args=(j,d['url']),daemon=True).start()
   return {'ok':True}
  if path=='/api/add-title':
   if time.time()-STORE.premiere_time>8:raise ValueError('Premiere-Panel nicht verbunden.')
   if any(j['status'] not in TERMINAL for j in STORE.data['jobs']):raise ValueError('Bitte laufenden Auftrag abwarten.')
   info=STORE.premiere
   if not info.get('sequenceId') or not info.get('projectPath'):raise ValueError('Keine gespeicherte Sequenz aktiv.')
   target=json.dumps({'sequenceId':info['sequenceId'],'projectPath':info['projectPath']})
   job=STORE.add('title',path=target,channel='Titel')
   STORE.update(job,status='premiere_wait',message='Titel wird in der aktiven Sequenz ergänzt …');return job
  if path=='/api/new-project':
   if any(j['status'] not in TERMINAL for j in STORE.data['jobs']):raise ValueError('Ein neues Projekt wartet bereits auf Premiere.')
   project=STORE.project_path();j=STORE.add('project',path=project,keepPanel=d.get('keepPanel') is True)
   STORE.update(j,status='premiere_wait',message=Path(project).stem+' wartet auf Premiere / Autoclipper-Panel …')
   try:launch_premiere()
   except OSError as error:STORE.update(j,status='error',message=str(error))
   return j
  if path in ('/api/cancel','/api/cancel-all'):
   jobs=[j for j in STORE.data['jobs'] if j['status'] not in TERMINAL and (path=='/api/cancel-all' or j['id']==d.get('id'))]
   if path=='/api/cancel' and not jobs:return {'ok':True,'cancelled':[]}
   # Once a synchronized import has been prepared it is one atomic group.
   sync_groups={j.get('captureGroup') for j in jobs if j.get('syncMode') and (j.get('syncMemberIds') or j['status']=='sync_follow')}
   if sync_groups:jobs=[j for j in STORE.data['jobs'] if j['status'] not in TERMINAL and (j in jobs or j.get('captureGroup') in sync_groups)]
   cancelled=[]
   for j in jobs:
    if j['status']=='executing':STORE.update(j,cancelRequested=True,message='Abbruch angefordert. Der aktuelle Importschritt wird noch beendet.');continue
    for child in j.get('sources',[]):
     if child.get('status') not in ('ready','error'):child.update(cancelRequested=True,status='error',message='Abgebrochen.')
    STORE.update(j,cancelRequested=True,cancelled=True,status='error',message='Abgebrochen. Fertige MP4s bleiben erhalten.');cancelled.append(j['id'])
   return {'ok':True,'cancelled':cancelled}
  if path=='/api/retry-import':
   old=next((j for j in STORE.data['jobs'] if j['id']==d.get('id')),None)
   if old is None:raise ValueError('Auftrag nicht mehr vorhanden.')
   if any(j['status'] not in TERMINAL for j in STORE.data['jobs']):raise ValueError('Bitte laufenden Auftrag zuerst abschliessen.')
   editor=STORE.editor()
   import_id=old.get('editorImportId',old['id'])
   if old['kind']=='batch':
    if not STORE.retryable(old):raise ValueError('Nicht alle MP4-Dateien sind noch vorhanden. Bitte in Chrome erneut clippen.')
    import copy
    sources=copy.deepcopy(old['sources'])
    j=STORE.add('batch',sources=sources,channel=old.get('channel','Twitch'),targetProject=STORE.premiere.get('project','') if editor=='premiere' and time.time()-STORE.premiere_time<8 else '',retryOf=old['id'],editor=editor,editorImportId=import_id)
    for source in sources:source['parentId']=j['id']
    STORE.update(j,status='import_wait',path=json.dumps({'sources':sources,'targetProject':j['targetProject']},ensure_ascii=True),message='Gespeicherte MP4s · '+NAMES[editor])
    return j
   if old['status'] not in TERMINAL or not old.get('path') or not Path(old['path']).is_file() or Path(old['path']).suffix!='.mp4':raise ValueError('Keine heruntergeladene MP4 zum Importieren.')
   j=STORE.add('clip',path=old['path'],editor=editor,editorImportId=import_id);STORE.update(j,status='import_wait',message='Wartet auf '+NAMES[editor]+' …');return j
  if path=='/api/premiere':
   STORE.premiere={'connected':True,'project':str(d.get('project','')),'sequence':str(d.get('sequence','')),'sequenceId':str(d.get('sequenceId','')),'projectPath':str(d.get('projectPath','')),'width':d.get('width'),'height':d.get('height'),'fps':d.get('fps')};STORE.premiere_time=time.time()
   # No lease expiry: uncertain script execution must never create a second project.
   job=next((j for j in STORE.data['jobs'] if j['status']=='executing' and j.get('editor','premiere')=='premiere'),None)
   if not job:
    for pending in STORE.data['jobs']:
     if pending['status']=='import_wait' and pending.get('bootstrapError'):STORE.update(pending,status='error',message=pending['bootstrapError'])
    first_queue=next((j for j in STORE.data['jobs'] if j.get('queueEntry') and j['status'] not in TERMINAL),None)
    job=next((j for j in STORE.data['jobs'] if j['status'] in ('premiere_wait','import_wait') and j.get('editor','premiere')=='premiere' and (not j.get('queueEntry') or j is first_queue) and not j.get('cancelRequested')),None)
    if job:STORE.update(job,status='executing',message='Premiere erstellt das Projekt …' if job['kind']=='project' else 'Premiere importiert die MP4 …')
   return {'job':job}
  if path=='/api/premiere-result':
   j=next((j for j in STORE.data['jobs'] if j['id']==d['id']),None)
   if j is None:return {'ok':True}
   if j['status']!='executing' or j.get('editor','premiere')!='premiere':return {'ok':True}
   if d.get('ok') and j['kind']=='title':STORE.update(j,status='done',message='Titel auf oberster Videospur ergänzt.')
   elif d.get('ok'):STORE.update(j,status='done',message='Sequenznamen aktualisiert.' if j['kind']=='rename' else ('Projekt erstellt: '+Path(j['path']).stem if j['kind'] in ('project','ensure') else 'Ansichten in Premiere eingefuegt: '+str(d.get('project',''))))
   else:STORE.update(j,status='error',message=str(d.get('error','Premiere-Fehler')))
   if j.get('syncMemberIds'):
    if d.get('ok') and j.get('syncWarning'):STORE.update(j,message='Importiert · '+j['syncWarning'])
    elif d.get('ok') and j.get('syncResult',{}).get('verified'):STORE.update(j,message='Audio synchronisiert · Ansichten auf separaten Spuren importiert.')
    for member in STORE.data['jobs']:
     if member['id'] in j['syncMemberIds'] and member['id']!=j['id'] and member['status']=='sync_follow':STORE.update(member,status='done' if d.get('ok') else 'error',message=j['message'],syncWarning=j.get('syncWarning',''))
   if d.get('ok') and d.get('sequenceId') and j.get('captureGroup'):
    for entry in STORE.data['jobs']:
     if entry.get('captureGroup')==j['captureGroup']:
      for source in entry.get('sources',[]):source['sequenceId']=str(d['sequenceId'])
      if entry.get('sources') and entry.get('path'):entry['path']=json.dumps({'sources':entry['sources'],'targetProject':entry.get('targetProject','')},ensure_ascii=True)
    STORE.save()
   if j.get('cancelRequested'):
    STORE.update(j,message='Premiere-Schritt bereits beendet; weitere Schritte dieses Auftrags gestoppt.' if d.get('ok') else 'Abgebrochen: '+str(d.get('error','Premiere-Schritt beendet.')))
   if j.get('automatic'):
    for parent in STORE.data['jobs']:
     if parent.get('bootstrapId')!=j['id']:continue
     if d.get('ok'):
      parent['targetProject']=str(d.get('project',''))
      if parent.get('sources') and parent.get('path'):parent['path']=json.dumps({'sources':parent['sources'],'targetProject':parent['targetProject']},ensure_ascii=True)
     else:parent['bootstrapError']='Projekt konnte nicht vorbereitet werden. MP4s bleiben gespeichert: '+str(d.get('error','Premiere-Fehler'))
    STORE.save()
   return {'ok':True}
  if path=='/api/open-folder':
   open_folder(ROOT);return {'ok':True}
  raise ValueError('Unbekannte Aktion')

if __name__=='__main__':
 lockfile=(ROOT/'.server.lock').open('a+b')
 try:acquire_lock(lockfile)
 except OSError:raise SystemExit(0)
 STORE=Store(ROOT)
 threading.Thread(target=queue_loop,daemon=True).start()
 server=ThreadingHTTPServer(('127.0.0.1',PORT),Handler)
 server.serve_forever()
