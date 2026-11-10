
function statusBadge(tab){
 const a=tab.availability||{},state=a.state||'unknown';
 const ready=a.allowed===true&&Date.now()-(a.checkedAt||0)<6000;
 const badge=document.createElement('button');badge.type='button';badge.className='stream-state '+(ready?'ready':state==='ad'?'ad':'blocked');
 const symbol=ready?'✓':state==='ad'?'◷':['restricted','login','offline','draft'].includes(state)?'!':'↻';
 badge.textContent=symbol;const reason=a.reason||'Stream in Chrome öffnen';badge.title=reason+' · In Chrome öffnen';badge.setAttribute('aria-label',badge.title);
 badge.onclick=async e=>{e.preventDefault();e.stopPropagation();try{await api('focus-stream',{tabId:tab.id});}catch(err){const target=document.getElementById('status')||document.getElementById('notice');if(target)target.textContent=err.message;}};
 if(state==='ad'&&a.remainingSeconds!=null){const time=document.createElement('small');time.textContent=Math.max(0,Math.ceil(a.remainingSeconds-(Date.now()-a.checkedAt)/1000))+'s';badge.append(time);}
 return badge;
}
const activityPhases={synchronizing:['search','Abgleich'],sync_wait:['clock','Wartet'],sync_follow:['search','Abgleich'],queued:['clock','Wartet'],capture_pending:['clock','Wartet'],clipping:['search','Quelle'],download_wait:['clock','Wartet'],downloading:['download','Download'],import_wait:['import','Import'],executing:['import','Import'],premiere_wait:['import','Premiere'],done:['check','Fertig'],error:['error','Fehler']};
function progressRing(job){
 const status=job?.syncWarning?'error':job?.status||'idle';const phase=activityPhases[status]||['download','Aktivitäten'];
 const wrap=document.createElement('span');wrap.className='activity-ring '+(!['idle','done','error'].includes(status)?'running':'')+(status==='error'?' ring-error':'');
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 40 40');svg.setAttribute('aria-hidden','true');
 const track=document.createElementNS(ns,'circle');track.setAttribute('cx','20');track.setAttribute('cy','20');track.setAttribute('r','17');track.setAttribute('class','ring-track');
 const arc=track.cloneNode();arc.setAttribute('class','ring-arc');arc.setAttribute('pathLength','100');
 const pct=job?.totalBytes>0?Math.min(100,job.downloadedBytes/job.totalBytes*100):null;
 const known=status==='downloading'&&pct!==null;arc.setAttribute('stroke-dasharray',(known?pct:status==='done'?100:status==='idle'?0:25)+' 100');
 if(!known&&!['idle','done','error'].includes(status))svg.classList.add('ring-spin');svg.append(track,arc);wrap.append(svg);
 const symbol=document.createElementNS(ns,'svg');symbol.setAttribute('viewBox','0 0 24 24');symbol.setAttribute('class','phase-icon');
 const paths={download:'M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4',search:'M15 15l6 6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',import:'M4 5h16v14H4zM8 12h8m-3-3 3 3-3 3',check:'m5 12 4 4L19 6',error:'M12 5v9m0 4h.01',clock:'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'};
 const path=document.createElementNS(ns,'path');path.setAttribute('d',paths[phase[0]]);symbol.append(path);wrap.append(symbol);return wrap;
}
let activityDrawer;
function initActivities(container,host){
 activityDrawer=document.createElement('details');activityDrawer.className='activity-drawer';const summary=document.createElement('summary');summary.setAttribute('aria-label','Aktivitäten öffnen');summary.title='Aktivitäten';summary.append(progressRing());const label=document.createElement('span');label.className='activity-short';label.textContent='Aktivitäten';summary.append(label);activityDrawer.append(summary);const panel=document.createElement('div');panel.className='activity-popover glass';panel.append(container);activityDrawer.append(panel);host.append(activityDrawer);
 document.addEventListener('pointerdown',e=>{if(activityDrawer.open&&!activityDrawer.contains(e.target))activityDrawer.open=false;});document.addEventListener('keydown',e=>{if(e.key==='Escape'){activityDrawer.open=false;summary.focus();}});
}
function updateActivities(jobs){
 if(!activityDrawer)return;const active=jobs.filter(j=>j.queueEntry&&!['done','error'].includes(j.status));const latest=active.find(j=>!['queued','capture_pending','download_wait'].includes(j.status))||active[0]||[...jobs].reverse().find(j=>['clip','batch'].includes(j.kind));
 const summary=activityDrawer.querySelector('summary');summary.replaceChildren(progressRing(latest));const text=document.createElement('span');text.className='activity-short';text.textContent=active.length?active.length+' · '+(activityPhases[latest?.status]?.[1]||'Aktiv'):latest?activityPhases[latest.status]?.[1]||'Aktivitäten':'Aktivitäten';summary.append(text);
 summary.setAttribute('aria-label',text.textContent+' · Aktivitäten öffnen');summary.title=latest?.message||'Aktivitäten';
}

const BASE='http://127.0.0.1:18743',TOKEN='__AUTOCLIPPER_TOKEN__';const $=id=>document.getElementById(id);let queueRenderKey='';let selected=new Set(),known=[],loaded=false,working=false,refreshing=false,key='',launching=false;
async function api(path,data){const r=await fetch(BASE+'/api/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json','X-Autoclipper-Token':TOKEN},body:data?JSON.stringify(data):undefined});const d=await r.json();if(!r.ok)throw Error(d.error);return d;}
function channel(t){try{return new URL(t.url).pathname.split('/').filter(Boolean)[0]||'Twitch';}catch{return t.title||'Twitch';}}
function eligible(t){return t?.availability?.allowed===true&&Date.now()-t.availability.checkedAt<6000;}
function availability(t){const a=t.availability;if(!a||Date.now()-a.checkedAt>6000)return 'Wird geprüft …';if(a.state==='ad'){if(a.remainingSeconds==null)return 'Werbung · Twitch zeigt keine Restzeit';const left=Math.max(0,Math.ceil(a.remainingSeconds-(Date.now()-a.checkedAt)/1000));return left?'Werbung · '+(a.remainingScope==='break'?'Pause noch ':'aktuelle Anzeige noch ')+Math.floor(left/60)+':'+String(left%60).padStart(2,'0'):'Werbung · wartet auf Twitch-Freigabe';}return a.reason;}
function button(){const blocked=known.filter(t=>selected.has(t.id)&&['ad','restricted','login','offline','draft'].includes(t.availability?.state));$('clip').disabled=!selected.size||working||launching||blocked.length>0;$('clip').textContent=launching?'Freigabe prüfen …':working?'Clippen …':blocked.length?'Nicht bereit':selected.size>1?'Clip & Import · '+selected.size:'Clip & Import';$('selectionInfo').textContent=selected.size?(selected.size+' ausgewählt'+(blocked.length?' · '+blocked.length+' nicht bereit':'')):'Streams auswählen';}
async function publish(){await chrome.storage.local.set({selectedViews:known.filter(t=>selected.has(t.id)).map(t=>({id:t.id,url:t.url,windowId:t.windowId}))});await api('selection',{tabIds:[...selected]});button();}

function channelMedia(tab,row,avatar){
 avatar.textContent='';
 const artwork=tab.artwork;
 const safe=url=>{try{const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='static-cdn.jtvnw.net'||u.hostname.endsWith('.twitchcdn.net'));}catch{return false;}};
 avatar.classList.add('profile-picture');
 const fallback=document.createElement('span');fallback.className='profile-fallback';fallback.textContent='◉';fallback.setAttribute('aria-label','Profilbild nicht verfügbar');avatar.append(fallback);
 if(safe(artwork?.avatar)){const img=document.createElement('img');img.alt='Profilbild von '+channel(tab);img.referrerPolicy='no-referrer';img.src=artwork.avatar;img.onload=()=>{fallback.hidden=true;};img.onerror=()=>img.remove();avatar.append(img);}
 const frame=document.createElement('div');frame.className='stream-preview';
 const note=document.createElement('span');note.className='preview-note';note.textContent=artwork?.preview?'Vorschau lädt …':'Vorschau nicht verfügbar';frame.append(note);
 if(safe(artwork?.preview)){const img=document.createElement('img');img.alt='Stream-Vorschau von '+channel(tab);img.referrerPolicy='no-referrer';img.src=artwork.preview+'?ac='+artwork.stamp;img.onload=()=>{note.hidden=true;};img.onerror=()=>{img.remove();note.textContent='Vorschau nicht verfügbar';};frame.append(img);}
 row.prepend(frame);
}

function render(){const signature=JSON.stringify(known.map(t=>[t.id,t.title,t.windowId,t.index,t.availability?.state,t.availability?.reason,availability(t),t.artwork]))+JSON.stringify([...selected])+working;if(signature===key)return;key=signature;const list=$('sources');list.replaceChildren();const windows=[...new Set(known.map(t=>t.windowId))];for(const t of known){const row=document.createElement('label');row.dataset.momentTab=String(t.id);row.className='source'+(!eligible(t)?' unavailable':'');const box=document.createElement('input');box.type='checkbox';box.setAttribute('aria-label',channel(t)+' auswählen');box.checked=selected.has(t.id);box.disabled=working;box.onchange=async()=>{if(box.checked){if(selected.size>=8){box.checked=false;return;}selected.add(t.id);}else selected.delete(t.id);try{await publish();}catch(e){$('status').textContent=e.message;}button();};const avatar=document.createElement('span');avatar.className='avatar';avatar.textContent=channel(t).slice(0,2).toUpperCase();const text=document.createElement('span'),name=document.createElement('span'),meta=document.createElement('span'),health=document.createElement('span');text.className='sourceText';name.className='name';name.textContent=channel(t);meta.className='meta';meta.textContent='Fenster '+(windows.indexOf(t.windowId)+1)+' · Tab '+((t.index||0)+1)+' · #'+t.id;health.className='health '+(eligible(t)?'ready':t.availability?.state==='ad'?'ad':'blocked');health.textContent=availability(t);text.append(name,meta,statusBadge(t));row.append(box,avatar,text);channelMedia(t,row,avatar);list.append(row);}if(!known.length){const e=document.createElement('div');e.className='empty';e.textContent='Twitch-Stream in Chrome öffnen.';list.append(e);}}
async function refresh(){if(refreshing)return;refreshing=true;try{const s=await api('state');renderChatReload(s);renderChatPreference(s);const started=s.jobs.filter(j=>j.status==='downloading'||j.sources?.some(c=>c.status==='downloading'||c.path)).map(j=>j.id);if(started.length)void chrome.runtime.sendMessage({type:'preview-download-start',ids:started}).catch(()=>{});$('offline').hidden=true;$('connection').textContent='Verbunden';known=s.browser.tabs||[];if(!loaded&&known.length){const saved=(await chrome.storage.local.get('selectedViews')).selectedViews||[];selected=new Set(s.selection?.length?s.selection:saved.filter(v=>known.some(t=>t.id===v.id&&t.url===v.url&&t.windowId===v.windowId)).map(v=>v.id));loaded=true;await publish();}selected=new Set((s.selection||[]).filter(id=>known.some(t=>t.id===id)));working=!!s.browser.capturing||s.jobs.some(j=>j.queueEntry&&['queued','capture_pending','clipping'].includes(j.status));renderQueue(s.jobs);updateActivities(s.jobs);render();window.acMomentView?.update(known);button();$('project').textContent=s.editor==='resolve'?'DaVinci Resolve':s.editor==='capcut'?'CapCut · Dateien':(s.premiere.project||'');const latest=[...s.jobs].reverse().find(j=>['clip','batch'].includes(j.kind));if(latest&&!launching){$('status').className='status'+(latest.status==='error'?' error':'');$('status').textContent=latest.message;}}catch(e){$('connection').textContent='App offline';$('offline').hidden=false;$('clip').disabled=true;$('status').textContent='Autoclipper-App starten.';}finally{refreshing=false;}}
$('clip').onclick=async()=>{if(working||launching||!selected.size)return;launching=true;button();try{const pre=await chrome.runtime.sendMessage({type:'preflight',tabIds:[...selected]});if(pre.error)throw Error(pre.error);const blocked=pre.results.filter(c=>!c.allowed&&['ad','restricted','login','offline','draft'].includes(c.state));if(blocked.length)throw Error(blocked.map(c=>c.reason).join(' · '));const job=await api('clip-batch',{tabIds:[...selected],requestedAt:Date.now(),checks:pre.results});await chrome.runtime.sendMessage({type:'run',job});await refresh();}catch(e){$('status').className='status error';$('status').textContent=e.message;}finally{launching=false;button();}};
$('details').onclick=async()=>{try{await api('show-app',{});}catch{$('offline').hidden=false;}};
chrome.runtime.sendMessage({type:'poll'},()=>{void chrome.runtime.lastError;refresh();});setInterval(refresh,1000);setInterval(()=>{render();button();},500);refresh();

chrome.storage.local.get({keepPlayersAwake:true}).then(p=>{$("keepPlayersAwake").checked=p.keepPlayersAwake;});
$("keepPlayersAwake").onchange=()=>chrome.storage.local.set({keepPlayersAwake:$("keepPlayersAwake").checked});

async function workspaceState(){try{const w=await chrome.runtime.sendMessage({type:'workspace-state'});$('workspaceRestore').hidden=!w.active;$('workspaceOpen').textContent=w.active?'Tabs bündeln':'Tabs bündeln';if(w.active)$('workspaceInfo').textContent=w.count+' sichtbare Streams · Werbung wird von Twitch bereitgestellt.';}catch{}}
$('workspaceOpen').onclick=async()=>{if(working||launching)return;$('workspaceOpen').disabled=true;try{const r=await chrome.runtime.sendMessage({type:'workspace-open',tabIds:[...selected],area:{left:screen.availLeft||0,top:screen.availTop||0,width:screen.availWidth,height:screen.availHeight}});if(r.error)throw Error(r.error);await workspaceState();}catch(e){$('status').textContent=e.message;}finally{$('workspaceOpen').disabled=false;}};
$('workspaceRestore').onclick=async()=>{$('workspaceRestore').disabled=true;try{const r=await chrome.runtime.sendMessage({type:'workspace-restore'});if(r.error)throw Error(r.error);await workspaceState();}catch(e){$('status').textContent=e.message;}finally{$('workspaceRestore').disabled=false;}};
workspaceState();setInterval(workspaceState,3000);


function renderQueue(jobs){
 const entries=jobs.filter(j=>j.queueEntry);const queue=[...entries.filter(j=>!['done','error'].includes(j.status)),...entries.filter(j=>['done','error'].includes(j.status)).slice(-5).reverse()];
 $('queueSection').hidden=!queue.length;$('queueTitle').textContent='Aktivitäten';$('cancelAll').hidden=!queue.some(j=>!['done','error'].includes(j.status));
 const signature=JSON.stringify(queue.map(j=>[j.id,j.status,j.message,j.cancelRequested]));if(signature===queueRenderKey)return;queueRenderKey=signature;
 const area=$('queueJobs');area.replaceChildren();
 const names={done:'In Premiere importiert',error:'Fehlgeschlagen',queued:'Wartet',capture_pending:'Wartet',clipping:'Quelle suchen',download_wait:'Download ausstehend',downloading:'Download läuft',import_wait:'Import ausstehend',executing:'Premiere importiert'};
 queue.forEach((j,i)=>{const row=document.createElement('div');row.className='queue-row';const body=document.createElement('div');body.className='queue-body';const name=document.createElement('span');name.className='queue-name';name.textContent=(i+1)+'. '+(j.channel||'Twitch');const meta=document.createElement('span');meta.className='queue-meta';meta.textContent=j.cancelRequested?'Abbruch angefordert':['downloading','clipping','synchronizing','sync_wait','sync_follow'].includes(j.status)?j.message:(names[j.status]||j.message);body.append(name,meta);const stop=document.createElement('button');stop.className='link';stop.textContent=j.cancelRequested?'Wird beendet':'Abbrechen';stop.disabled=!!j.cancelRequested;stop.onclick=()=>cancelQueue(j.id);row.append(progressRing(j),body);if(!['done','error'].includes(j.status))row.append(stop);if(j.syncWarning)meta.textContent=j.syncWarning;else if(j.status==='done'&&j.syncResult?.verified)meta.textContent='Audio synchronisiert';else if(j.status==='error')meta.textContent=j.message;area.append(row);});
}
async function cancelQueue(id){try{const r=await api(id?'cancel':'cancel-all',id?{id}:{});await chrome.runtime.sendMessage({type:'cancel-local',ids:r.cancelled||[]});await refresh();}catch(e){$('status').textContent=e.message;}}
$('cancelAll').onclick=()=>cancelQueue();

initActivities($('queueSection'),document.querySelector('header'));

let chatReloadPending=false;
function renderChatReload(state){
 const button=$('reloadChats');const task=state.chatReload;const running=task?.status==='running'&&Date.now()/1000-task.at<30;
 button.disabled=chatReloadPending||running;button.textContent=running?'Chats verbinden …':'Chats neu verbinden';
 if(task?.status==='done')button.title=task.failed?task.failed+' Chats nicht verbunden. Stream-Tab öffnen und erneut versuchen.':task.count+' Chats verbunden';
 else button.title='Alle offenen Chats neu laden · Player läuft weiter';
 if(task?.status==='done'&&!task.failed){const target=document.getElementById('nativeClipStatus')||document.getElementById('status');if(target?.dataset.chatError){target.textContent='';delete target.dataset.chatError;}}
 if(task?.status==='done'&&task.failed){const target=document.getElementById('nativeClipStatus')||document.getElementById('status');target.dataset.chatError='true';target.classList.add('error');target.textContent=task.failed+' Chats nicht verbunden. Stream-Tab öffnen und erneut versuchen.';}
}
$('reloadChats').onclick=async()=>{if(chatReloadPending)return;chatReloadPending=true;$('reloadChats').disabled=true;try{await api('chat-reload',{});await refresh();}catch(error){const target=document.getElementById('nativeClipStatus')||document.getElementById('status');target.classList.add('error');target.textContent=error.message;}finally{chatReloadPending=false;}};

function renderChatPreference(state){if(document.activeElement!==$('autoChatReconnect'))$('autoChatReconnect').checked=state.preferences?.autoChatReconnect===true;}
$('autoChatReconnect').onchange=async()=>{const box=$('autoChatReconnect');box.disabled=true;try{await api('preferences',{autoChatReconnect:box.checked});}catch(error){box.checked=!box.checked;const target=document.getElementById('nativeClipStatus')||document.getElementById('status');target.classList.add('error');target.textContent=error.message;}finally{box.disabled=false;}};
