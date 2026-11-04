const chatReconnectAttempts=new Map();
const managedChatTabs=new Set();
const momentByTab=new Map();
importScripts('availability.js','workspace.js','editor-cleanup.js');

const BASE='http://127.0.0.1:18743', TOKEN='__AUTOCLIPPER_TOKEN__';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(path,data){const r=await fetch(BASE+path,{method:'POST',headers:{'Content-Type':'application/json','X-Autoclipper-Token':TOKEN},body:JSON.stringify(data)});const v=await r.json();if(!r.ok)throw Error(v.error);return v;}
let active=null, busy=false, polling=false;
const eligibilityErrors=new Map();
const isMP4=url=>{try{const u=new URL(url);return /\.mp4$/i.test(u.pathname)&&(/(^|\.)(twitch\.tv|ttvnw\.net|twitchcdn\.net)$/.test(u.hostname)||u.hostname==='d1ndex63qxojbr.cloudfront.net');}catch{return false;}};
chrome.webRequest.onBeforeRequest.addListener(d=>{
 if(active && active.owners.has(d.tabId) && isMP4(d.url) && d.timeStamp>=active.started)active.urls.set(d.url,{tabId:d.tabId,at:Date.now(),editor:/^https:\/\/clips\.twitch\.tv(?:\/|$)/.test(d.initiator||d.documentUrl||'')});
},{urls:['https://*.twitch.tv/*','https://*.ttvnw.net/*','https://*.twitchcdn.net/*','https://d1ndex63qxojbr.cloudfront.net/*']});
function readPlayback(requestedAt){
 const samples=globalThis.acPlaybackSamples||[];
 const latest=samples[samples.length-1];
 if(!requestedAt)return latest||null;
 const before=[...samples].reverse().find(x=>x.at<=requestedAt);
 if(!before||requestedAt-before.at>1000)throw Error('Wiedergabepunkt am Klickzeitpunkt fehlt. Tab kurz sichtbar öffnen und erneut versuchen.');
 if(!before.src)throw Error('Im gewählten Tab läuft kein erkennbarer Player.');
 const after=samples.find(x=>x.at>=requestedAt);
 let point=before.currentTime;
 if(after&&after.src===before.src&&after.at>before.at){
  const expected=before.paused||before.ready<3?0:(after.at-before.at)/1000*before.rate;
  const actual=after.currentTime-before.currentTime;
  if(Math.abs(actual-expected)>0.35)throw Error('Player wurde am Klickzeitpunkt gespult oder gepuffert. Bitte erneut versuchen.');
  point=before.currentTime+(requestedAt-before.at)/(after.at-before.at)*actual;
 }else if(!before.paused&&before.ready>=3){point+=(requestedAt-before.at)/1000*before.rate;}
 return {...before,currentTime:Math.max(0,Math.min(point,before.duration||point)),requestedAt,sampleAgeMs:requestedAt-before.at};
}

chrome.tabs.onCreated.addListener(t=>{if(active&&active.owners.has(t.openerTabId)){const owner=active.owners.get(t.openerTabId);active.owners.set(t.id,owner);if(/^https:\/\/clips\.twitch\.tv\//.test(t.url||t.pendingUrl||'')||/\/clip\//.test(t.url||t.pendingUrl||''))void acEditors.child(active.jobByTab.get(owner),t.id);}});
function scriptDeadline(args,ms=2500){
 let timer;return Promise.race([chrome.scripting.executeScript({...args,injectImmediately:true}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Twitch-Player antwortet nicht rechtzeitig. Bitte Stream neu laden.')),ms);})]).finally(()=>clearTimeout(timer));
}
async function readFrames(tabId,func,args=[]){
 try{return await scriptDeadline({target:{tabId,allFrames:true},func,args},1200);}catch{return await scriptDeadline({target:{tabId},func,args},1200).catch(()=>[]);}
}
function previewMedia(deep=false){
 let preview=location.hostname==='clips.twitch.tv'||/\/clip\//.test(location.pathname)||[...document.querySelectorAll('button')].some(b=>/clip.editor.*(?:tab|registerkarte)/i.test((b.getAttribute('aria-label')||'')+' '+b.textContent));
 const videos=[...document.querySelectorAll('video')].map(v=>({url:v.currentSrc||v.src,time:v.currentTime,duration:Number.isFinite(v.duration)?v.duration:null}));
 preview=preview||videos.some(v=>/\.mp4(?:\?|$)/i.test(v.url));
 const urls=videos.map(v=>v.url).filter(Boolean);
 urls.push(...performance.getEntriesByType('resource').map(v=>v.name).filter(u=>/\.mp4(?:\?|$)/i.test(u)));
 if(deep){const html=document.documentElement.outerHTML.replace(/\\u002[fF]/g,'/').replace(/\\\//g,'/').replace(/\\u0026/g,'&').replace(/&amp;/g,'&');
 urls.push(...(html.match(/https:\/\/[^\s"'<>\\]+?\.mp4(?:\?[^\s"'<>\\]*)?/gi)||[]));
 }
 return {preview,urls,videos};
}
function openFreshPreview(){
 const buttons=[...document.querySelectorAll('button')];
 const discard=buttons.find(b=>/^(Clip verwerfen|Discard Clip|Discard clip)$/.test(b.textContent.trim()));
 if(discard){discard.click();return {retry:true};}
 const close=[...document.querySelectorAll('button')].find(b=>/clip.editor.*(?:schließen|close)|close.*clip.editor/i.test((b.getAttribute('aria-label')||'')+' '+b.textContent));
 if(close){const title=document.querySelector('input[aria-label="Clip-Titel"],input[placeholder="Einen Titel hinzufügen (erforderlich)"]');if(title?.value.trim())throw Error('Eine benannte Clip-Vorschau ist offen. Bitte zuerst abschliessen oder schliessen.');close.click();return {retry:true};}
 const selectors=['[data-a-target="player-clip-button"]','[data-a-target="clip-button"]','button[aria-label^="Clip ("]','button[aria-label^="Clip erstellen"]','button[aria-label^="Create Clip"]'];
 const button=selectors.map(s=>document.querySelector(s)).find(Boolean);
 if(!button)throw Error('Twitch-Clip-Button fehlt. Livestream laden, anmelden und Werbung abwarten.');
 if(button.disabled||button.getAttribute('aria-disabled')==='true')throw Error('Twitch sperrt den Clip-Button derzeit.');
 performance.clearResourceTimings();button.click();return {opened:true};
}
async function focusCaptureTab(tabId){
 const tab=await chrome.tabs.get(tabId),win=await chrome.windows.get(tab.windowId);
 await chrome.windows.update(tab.windowId,win.state==='minimized'?{state:'normal',focused:true}:{focused:true});
 await chrome.tabs.update(tabId,{active:true});
}
async function captureBadge(tabId,text){
 try{await scriptDeadline({target:{tabId},func:(message)=>{
  let b=document.getElementById('autoclipper-capture-status');if(!b){b=document.createElement('div');b.id='autoclipper-capture-status';b.setAttribute('role','status');b.style.cssText='position:fixed;bottom:18px;left:18px;z-index:2147483647;pointer-events:none;background:rgba(20,25,32,.95);color:#e5edf5;border:1px solid #6b8daf;border-radius:12px;padding:13px 16px;font:13px -apple-system,system-ui;box-shadow:0 5px 25px #0005';document.documentElement.append(b);}b.textContent='Autoclipper · '+message;
 },args:[text]},1200);}catch{}
}
async function capturePhase(jobId,tabId,phase){
 const names={activate:'Stream-Tab wird aktiviert',preview:'Clip-Vorschau wird geöffnet',lookup:'Quelle untersuchen · neue MP4-Adresse suchen',found:'MP4-Adresse gefunden · Download in Warteschlange'};
 void captureBadge(tabId,names[phase]);await api('/api/capture-phase',{id:jobId,phase}).catch(()=>{});
}
async function prepareTab(tabId,requestedAt,jobId){
 if(active?.cancelled.has(jobId))throw Error("Abgebrochen.");
 const tab=await chrome.tabs.get(tabId),existing=/\/clip\/|clips\.twitch\.tv\//.test(tab.url||'');
 const check=await scriptDeadline({target:{tabId},func:acInspect});
 if(!check[0]?.result?.allowed)throw Error(check[0]?.result?.reason||'Clip-Freigabe konnte nicht geprüft werden.');
 const prior=await readFrames(tabId,previewMedia,[false]);
 const baseline=new Set(prior.flatMap(f=>f.result?.urls||[]));
 if(!existing){
  await acEditors.begin(jobId,tab);
  let opened=false;
  for(let n=0;n<12;n++){if(active?.cancelled.has(jobId))throw Error("Abgebrochen.");const r=await scriptDeadline({target:{tabId},func:openFreshPreview},4000);if(r[0]?.result?.opened){opened=true;await acEditors.opened(jobId);void scriptDeadline({target:{tabId,allFrames:true},func:acEditors.silence},1200).catch(()=>{});break;}await sleep(150);}
  if(!opened)throw Error('Clip-Vorschau konnte nicht geöffnet werden. Werbung oder offene Twitch-Dialoge prüfen.');
 }
 return {tab,existing,baseline};
}
async function captureTab(tabId,requestedAt,prepared,jobId){
 const {tab,existing,baseline}=prepared;
 const deadline=Date.now()+45000;let scans=0,nextChildren=0,nextFocus=0;
 while(Date.now()<deadline){
  if(!active||active.cancelled.has(jobId))throw Error('Abgebrochen.');
  await refreshCancellations();
  if(active.cancelled.has(jobId))throw Error('Abgebrochen.');
  if(Date.now()>=nextFocus){await focusCaptureTab(active.visibleTab||tabId);nextFocus=Date.now()+1500;}
  if(Date.now()>=nextChildren){
   const owned=await chrome.tabs.query({url:['https://*.twitch.tv/*']});
   for(const child of owned)if(child.openerTabId&&active.owners.has(child.openerTabId)&&/clips\.twitch\.tv|\/clip\//.test(child.url||'')){active.owners.set(child.id,active.owners.get(child.openerTabId));if(child.id!==tabId){await acEditors.child(jobId,child.id);if(active.visibleTab===tabId)await focusOwnedEditor(child.id);}}
   nextChildren=Date.now()+1000;
  }
  const ids=[...active.owners.entries()].filter(([id,owner])=>owner===tabId).map(([id])=>id);
  const frames=await Promise.all(ids.map(async id=>{try{if(!existing)void scriptDeadline({target:{tabId:id,allFrames:true},func:acEditors.silence},1200).catch(()=>{});return await readFrames(id,previewMedia,[scans%12===0]);}catch(e){if(id===tabId)throw e;return [];}}));
  const all=frames.flat().map(f=>f.result).filter(f=>f?.preview);
  const network=[...active.urls.entries()].filter(([u,v])=>active.owners.get(v.tabId)===tabId).map(([u])=>u).filter(u=>existing||!baseline.has(u));
  const candidates=all.flatMap(f=>f.urls).filter(isMP4).filter(u=>existing||!baseline.has(u));
  const url=candidates[0]||network[0];
  const video=all.flatMap(f=>f.videos).find(v=>v.url===url&&v.duration>0)||all.flatMap(f=>f.videos).find(v=>v.duration>0);
  if(url){
   let end=video?.duration||90;
   if(existing){try{const f=await scriptDeadline({target:{tabId},func:readPlayback,args:[requestedAt]},1200);const point=f[0]?.result;if(point?.src===url&&point.currentTime>=1/30)end=point.currentTime;}catch{}}
   return {tabId,url,playback:{start:Math.max(0,end-90),end,mode:existing?'existing-preview':'fresh-preview',resolveDuration:!existing||!video,requestedAt},channel:tab.title||tab.url};
  }
  if(scans%4===0){const state=(await Promise.all(ids.map(async id=>{try{return await readFrames(id,acInspect);}catch{return [];}}))).flat();const info=state.map(f=>f.result).find(a=>a&&!a.allowed&&['ad','restricted','login','offline'].includes(a.state));if(info&&!info.allowed&&['ad','restricted','login','offline'].includes(info.state)){if(['restricted','login'].includes(info.state))eligibilityErrors.set(tabId,{...info,page:tab.url,until:Date.now()+60000});throw Error(info.reason);}}
  scans++;await sleep(scans<50?150:400);
 }
 throw Error('Twitch hat innerhalb von 45 Sekunden keine neue MP4 geliefert. Vorschau, Login oder deaktivierte Clips prüfen.');
}
let lastCancelCheck=0;
async function refreshCancellations(){
 if(!active||Date.now()-lastCancelCheck<500)return;lastCancelCheck=Date.now();
 try{const r=await api('/api/capture-status',{ids:active.jobs});for(const id of r.cancelled||[])active?.cancelled.add(id);}catch{}
}
async function processClip(job){
 if(busy)return;busy=true;
 const jobs=job.captureJobs?.length?job.captureJobs:[job];
 const ids=jobs.flatMap(j=>j.tabIds||[j.tabId]);
 active={tabs:new Set(ids),owners:new Map(ids.map(id=>[id,id])),urls:new Map(),started:Date.now(),jobByTab:new Map(jobs.map(j=>[(j.tabIds||[j.tabId])[0],j.id])),jobs:jobs.map(j=>j.id),cancelled:new Set(),currentJobId:null,visibleTab:null};
 try{
  await chrome.storage.local.set({unfinished:jobs.map(j=>j.id)});
  // Twitch must keep the current stream/editor visible. Finish its source lookup
  // before activating the next stream; never open later previews in background.
  for(const j of jobs){
   await refreshCancellations();if(active.cancelled.has(j.id))continue;
   const tabId=(j.tabIds||[j.tabId])[0];active.currentJobId=j.id;active.visibleTab=tabId;
   let result;
   try{
    await api('/api/capture-start',{ids:[j.id]});
    await capturePhase(j.id,tabId,'activate');await focusCaptureTab(tabId);
    let info=null;
    for(let n=0;n<10;n++){
     await refreshCancellations();if(active.cancelled.has(j.id))throw Error('Abgebrochen.');
     const frames=await scriptDeadline({target:{tabId},func:acInspect});info=frames[0]?.result;
     if(info?.allowed||['ad','restricted','login','offline','draft'].includes(info?.state))break;
     await sleep(200);
    }
    if(!info?.allowed)throw Error(info?.reason||'Twitch-Player ist nicht bereit.');
    await capturePhase(j.id,tabId,'preview');
    const context=await prepareTab(tabId,Date.now(),j.id);
    await capturePhase(j.id,active.visibleTab||tabId,'lookup');
    result=await captureTab(tabId,Date.now(),context,j.id);
    await capturePhase(j.id,active.visibleTab||tabId,'found');
   }catch(e){result={tabId,error:e.message};void captureBadge(active.visibleTab||tabId,e.message);}
   if(!active.cancelled.has(j.id))await api(j.tabIds?'/api/source-result':'/api/clip-result',{id:j.id,...result});
  }
 }catch(e){await Promise.all(jobs.map(j=>api(j.tabIds?'/api/source-result':'/api/clip-result',{id:j.id,tabId:(j.tabIds||[j.tabId])[0],error:e.message}).catch(()=>{})));}
 finally{active=null;busy=false;await chrome.storage.local.remove('unfinished');void poll();}
}
let keepPlayersAwake=true,waking=false;
const protectedTabs=new Map();
async function maintainTabs(tabs){
 if(waking||busy)return;waking=true;
 try{
  for(const tab of tabs){
   if(busy)break;
   if(!keepPlayersAwake){if(protectedTabs.has(tab.id)){await chrome.tabs.update(tab.id,{autoDiscardable:protectedTabs.get(tab.id)}).catch(()=>{});protectedTabs.delete(tab.id);}continue;}
   if(!protectedTabs.has(tab.id))protectedTabs.set(tab.id,tab.autoDiscardable);
   if(tab.autoDiscardable!==false)await chrome.tabs.update(tab.id,{autoDiscardable:false}).catch(()=>{});
   // Frozen/discarded tabs cannot execute a content script. Brief activation wakes
   // only these tabs, and restores the previously selected tab in that window.
   if(!busy&&(tab.frozen||tab.discarded)){
    const before=(await chrome.tabs.query({active:true,windowId:tab.windowId}))[0];
    if(busy)break;
    try{await chrome.tabs.update(tab.id,{active:true});}finally{
     const current=(await chrome.tabs.query({active:true,windowId:tab.windowId}))[0];
     if(before&&before.id!==tab.id&&current?.id===tab.id)await chrome.tabs.update(before.id,{active:true}).catch(()=>{});
    }
   }
  }
 }finally{waking=false;}
}
chrome.storage.local.get({keepPlayersAwake:true}).then(p=>{keepPlayersAwake=p.keepPlayersAwake;});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.keepPlayersAwake){keepPlayersAwake=changes.keepPlayersAwake.newValue!==false;void poll();}});
chrome.tabs.onRemoved.addListener(id=>{protectedTabs.delete(id);momentByTab.delete(id);managedChatTabs.delete(id);chatReconnectAttempts.delete(id);});
function readChannelArtwork(){
 const login=location.pathname.split('/').filter(Boolean)[0]||'';
 if(!/^[a-zA-Z0-9_]+$/.test(login)||['directory','videos','settings','downloads','subscriptions'].includes(login))return null;
 const trusted=value=>{try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname==='static-cdn.jtvnw.net'||u.hostname.endsWith('.twitchcdn.net'))?u.href:null;}catch{return null;}};
 const candidates=[...document.querySelectorAll('[data-a-target="channel-header"] img, .channel-info-content img, [data-a-target="stream-avatar"] img, a[href="/'+login+'"] img')];
 const picture=candidates.find(i=>/jtv_user_pictures/.test(i.currentSrc||i.src))||[...document.images].find(i=>/jtv_user_pictures/.test(i.currentSrc||i.src)&&(i.alt||'').toLowerCase().includes(login.toLowerCase()));
 const avatar=trusted(picture?.currentSrc||picture?.src);
 return {login,avatar,preview:'https://static-cdn.jtvnw.net/previews-ttv/live_user_'+login.toLowerCase()+'-640x360.jpg',stamp:Math.floor(Date.now()/30000)};
}
function reloadChatOnly(){
 const login=location.pathname.split('/').filter(Boolean)[0];
 if(!/^[a-z0-9_]+$/i.test(login||'')||['directory','videos','settings','downloads'].includes(login))throw Error('Kein Stream-Tab.');
 const old=document.getElementById('ac-reconnect-chat');
 const chat=document.querySelector('.chat-room')||document.querySelector('[data-test-selector="chat-room-component-layout"]');
 const host=chat?.closest('.right-column')||chat?.closest('[data-test-selector="right-column"]')||chat;
 if(!host)throw Error('Chat im Stream einblenden.');
 // Cover the entire chat column, including its original header; preserve its player sibling.
 old?.remove();document.getElementById('ac-managed-chat-shell')?.remove();
 for(const node of document.querySelectorAll('[data-ac-chat-host]'))if(node!==host)node.removeAttribute('data-ac-chat-host');
 host.setAttribute('data-ac-chat-host','');if(getComputedStyle(host).position==='static')host.style.position='relative';
 if(!document.getElementById('ac-chat-visibility-style')){const style=document.createElement('style');style.id='ac-chat-visibility-style';style.textContent='[data-ac-chat-host]>:not(#ac-managed-chat-shell){visibility:hidden!important}';document.head.append(style);}
 const shell=document.createElement('div');shell.id='ac-managed-chat-shell';shell.style.cssText='position:absolute;inset:0;z-index:30;background:#18181b;visibility:visible;';
 const frame=document.createElement('iframe');frame.id='ac-reconnect-chat';frame.title='Twitch-Chat · '+login;frame.style.cssText='width:100%;height:100%;border:0;display:block;';
 frame.src='https://www.twitch.tv/embed/'+encodeURIComponent(login)+'/chat?parent='+encodeURIComponent(location.hostname)+'&darkpopout&ac_reload='+Date.now()+'-'+Math.random().toString(36).slice(2);
 shell.append(frame);host.append(shell);
 globalThis.acChatRestore?.disconnect();const path=location.pathname;
 const observer=new MutationObserver(()=>{if(location.pathname!==path){shell.remove();host.removeAttribute('data-ac-chat-host');observer.disconnect();}else if(!shell.isConnected){host.removeAttribute('data-ac-chat-host');observer.disconnect();}});observer.observe(document.documentElement,{childList:true,subtree:true});globalThis.acChatRestore=observer;
 return {ok:true,source:frame.src};
}
async function reloadChats(cmd){
 const results=await Promise.all((cmd.tabIds||[]).map(async tabId=>{
  let created=false;try{
   managedChatTabs.add(tabId);momentByTab.delete(tabId);
   const response=await scriptDeadline({target:{tabId},func:reloadChatOnly},2500);const result=response[0]?.result;
   if(!result?.source)throw Error('Chat nicht erreichbar.');created=true;
   // Wait for the newly loaded frame, not an old heartbeat or a DOM insertion.
   const deadline=Date.now()+16000;
   while(Date.now()<deadline){
    const m=momentByTab.get(tabId);
    if(m?.chatSource===result.source&&m.chatReady&&m.connection==='connected'&&Date.now()-m.at<10000)return {tabId,ok:true};
    await new Promise(resolve=>setTimeout(resolve,500));
   }
   throw Error('Chat-Verbindung nicht bestätigt. Stream-Tab öffnen und erneut versuchen.');
  }catch(error){if(!created)managedChatTabs.delete(tabId);return {tabId,ok:false,error:error.message};}
 }));
 if(!cmd.automatic)await api('/api/chat-reload-result',{id:cmd.id,results});
}

async function poll(){
 if(polling)return;polling=true;
 try{
  const saved=await chrome.storage.local.get('unfinished');
  if(saved.unfinished&&!busy){for(const id of Array.isArray(saved.unfinished)?saved.unfinished:[saved.unfinished])await api('/api/capture-interrupted',{id});await chrome.storage.local.remove('unfinished');}
  const tabs=await chrome.tabs.query({url:['https://*.twitch.tv/*']});
  await maintainTabs(tabs);
  const described=await Promise.all(tabs.map(async t=>{let player=null,artwork=null,availability={state:'unknown',allowed:false,reason:'Tab wird geprüft …',checkedAt:Date.now()};try{const f=await scriptDeadline({target:{tabId:t.id},func:readPlayback,args:[null]},1200);player=f[0]?.result;const c=await scriptDeadline({target:{tabId:t.id},func:acInspect},1200);availability=c[0]?.result||availability;const cached=eligibilityErrors.get(t.id);if(cached&&cached.page===t.url&&cached.until>Date.now())availability={...cached,checkedAt:Date.now()};else if(cached)eligibilityErrors.delete(t.id);}catch{}try{const a=await scriptDeadline({target:{tabId:t.id},func:readChannelArtwork},800);artwork=a[0]?.result||null;}catch{}return {moment:momentByTab.get(t.id)?.page===t.url?momentByTab.get(t.id):null,artwork,id:t.id,title:t.title||t.url,url:t.url,active:t.active,windowId:t.windowId,index:t.index,player,availability};}));
  const result=await api('/api/browser',{busy,name:/Edg/.test(navigator.userAgent)?'Edge':'Chrome',tabs:described});
  if(result.preferences?.autoChatReconnect===true){
   const retry=described.filter(t=>t.moment?.connection==='disconnected'&&Date.now()-t.moment.at<15000&&Date.now()-(chatReconnectAttempts.get(t.id)||0)>120000);
   for(const t of retry)chatReconnectAttempts.set(t.id,Date.now());
   if(retry.length)void reloadChats({automatic:true,tabIds:retry.map(t=>t.id)});
  }
  for(const cmd of result.commands||[]){if(cmd.type==='reload-chats'){void reloadChats(cmd);continue;}try{const tab=await chrome.tabs.get(cmd.tabId);await chrome.windows.update(tab.windowId,{focused:true});await chrome.tabs.update(tab.id,{active:true});}catch{}}
  if(active)for(const id of result.cancelled||[])active.cancelled.add(id);
  const pendingEditors=await acEditors.pending();
  if(pendingEditors.length){
   try{
    const response=await fetch(BASE+'/api/state',{headers:{'X-Autoclipper-Token':TOKEN}});
    if(response.ok){const state=await response.json();const started=state.jobs.filter(j=>pendingEditors.includes(j.id)&&(j.status==='downloading'||j.sources?.some(c=>c.status==='downloading'||c.path))).map(j=>j.id);await acEditors.finish([...new Set([...(result.downloaded||[]),...started])]);}
   }catch{}
  }
  if(result.job)void processClip(result.job);
 }catch{}finally{polling=false;}
}
chrome.alarms.create('autoclipper',{periodInMinutes:0.5});
chrome.alarms.onAlarm.addListener(poll);chrome.tabs.onUpdated.addListener((id,change)=>{if(change.status==='loading'||change.url)eligibilityErrors.delete(id);if(change.url||change.status==='loading'){managedChatTabs.delete(id);momentByTab.delete(id);}if(change.url&&!/^https:\/\/([a-z0-9-]+\.)*twitch\.tv\//i.test(change.url)&&protectedTabs.has(id)){chrome.tabs.update(id,{autoDiscardable:protectedTabs.get(id)}).catch(()=>{});protectedTabs.delete(id);}void poll();});chrome.tabs.onActivated.addListener(()=>void poll());
async function connect(){
 await acWorkspace.migrate().catch(()=>{});
 const tabs=await chrome.tabs.query({url:['https://*.twitch.tv/*']});
 for(const t of tabs)try{await chrome.scripting.executeScript({target:{tabId:t.id},files:['keepalive.js','heartbeat.js','moments.js']});}catch{}
 for(const t of tabs)try{const result=await chrome.scripting.executeScript({target:{tabId:t.id},func:()=>!!document.getElementById('ac-reconnect-chat')});if(result[0]?.result){managedChatTabs.add(t.id);await chrome.scripting.executeScript({target:{tabId:t.id,allFrames:true},files:['moments.js']});}}catch{}
 await poll();
}
chrome.runtime.onStartup.addListener(connect);chrome.runtime.onInstalled.addListener(connect);
chrome.runtime.onMessage.addListener((m,s,reply)=>{
 if(m.type==='moment-update'){
  if(s.id===chrome.runtime.id&&s.tab?.id&&m.moment?.page===(s.url||s.tab.url)){
   const root=new URL(s.tab.url||'https://invalid/'),origin=new URL(s.url||s.tab.url||'https://invalid/');
   const match=origin.pathname.match(/^\/embed\/([a-z0-9_]+)\/chat$/i);
   if(root.hostname.endsWith('.twitch.tv')||root.hostname==='twitch.tv'){
    if(s.frameId===0&&!managedChatTabs.has(s.tab.id))momentByTab.set(s.tab.id,m.moment);
    else if(match&&match[1].toLowerCase()===root.pathname.split('/')[1]?.toLowerCase()&&origin.hostname==='www.twitch.tv')momentByTab.set(s.tab.id,{...m.moment,page:s.tab.url,chatSource:m.moment.page});
   }
  }reply({ok:true});return;
 }
 if(['workspace-open','workspace-restore','workspace-state'].includes(m.type)){
  const work=async()=>{if(m.type!=='workspace-state'&&busy)throw Error('Bitte den laufenden Clip-Auftrag abwarten.');return m.type==='workspace-open'?acWorkspace.open(m.tabIds,m.area):m.type==='workspace-restore'?acWorkspace.restore():acWorkspace.state();};
  work().then(reply).catch(e=>reply({error:e.message}));return true;
 }

 if(m.type==='preview-download-start'){acEditors.finish(m.ids||[]).then(()=>reply({ok:true})).catch(()=>reply({ok:false}));return true;}
 if(m.type==='cancel-local'){for(const id of m.ids||[])active?.cancelled.add(id);reply({ok:true});return;}
 if(m.type==='run'&&m.job){void processClip(m.job);reply({ok:true});return;}
 if(m.type==='preflight'){
  (async()=>{const results=await Promise.all((m.tabIds||[]).map(async tabId=>{try{const f=await scriptDeadline({target:{tabId},func:acInspect});return {tabId,...f[0]?.result};}catch{return {tabId,allowed:false,state:'unknown',reason:'Tab nicht erreichbar.',checkedAt:Date.now()};}}));reply({results});})().catch(e=>reply({error:e.message}));return true;
 }
 if(m.type==='poll'){poll().then(()=>reply({ok:true}));return true;}
});
setInterval(poll,2000);void connect();

// A global side panel is shared across tabs in the window. Never use tabId here.
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(console.error);

chrome.tabs.onUpdated.addListener((id,change,tab)=>{if(active&&active.owners.has(id)&&active.owners.get(id)!==id&&(/^https:\/\/clips\.twitch\.tv\//.test(tab.url||'')||/\/clip\//.test(tab.url||'')))void acEditors.child(active.jobByTab.get(active.owners.get(id)),id);});

async function focusOwnedEditor(id){
 if(!active||!active.owners.has(id))return;
 const owner=active.owners.get(id),jobId=active.jobByTab.get(owner);
 if(id===owner||active.currentJobId!==jobId||active.cancelled.has(jobId))return;
 await acEditors.child(jobId,id);
 if(!active||active.currentJobId!==jobId||active.cancelled.has(jobId))return;
 active.visibleTab=id;await focusCaptureTab(id);void captureBadge(id,'Quelle untersuchen · neue MP4-Adresse suchen');
}
chrome.tabs.onCreated.addListener(t=>{if(active&&active.owners.has(t.openerTabId)&&(/^https:\/\/clips\.twitch\.tv\//.test(t.url||t.pendingUrl||'')||/\/clip\//.test(t.url||t.pendingUrl||'')))void focusOwnedEditor(t.id).catch(()=>{});});
chrome.tabs.onUpdated.addListener((id,change,tab)=>{if(change.url&&(/^https:\/\/clips\.twitch\.tv\//.test(tab.url||'')||/\/clip\//.test(tab.url||'')))void focusOwnedEditor(id).catch(()=>{});});
