// One existing Chrome window. Never create stream windows or duplicate tabs.
const acWorkspace=(()=>{
 let moving=false;
 const stream=t=>{try{const u=new URL(t.url);return /^(www\.|m\.)?twitch\.tv$/.test(u.hostname)&&/^\/[a-zA-Z0-9_]+\/?$/.test(u.pathname)&&!/^\/(directory|settings|downloads|inventory|subscriptions|wallet|login|signup|search)\/?$/.test(u.pathname);}catch{return false;}};
 async function open(){
  if(moving)throw Error('Tabs werden gerade zusammengeführt.');moving=true;
  try{
   const tabs=(await chrome.tabs.query({url:['https://*.twitch.tv/*']})).filter(stream);
   if(!tabs.length)return {active:false,count:0};
   const legacy=(await chrome.storage.session.get('liveWorkspace')).liveWorkspace;
   let target=null;
   for(const original of legacy?.tabs||[]){const w=await chrome.windows.get(original.windowId).catch(()=>null);if(w?.type==='normal'){target=w;break;}}
   if(!target){const counts=new Map();for(const t of tabs)counts.set(t.windowId,(counts.get(t.windowId)||0)+1);for(const [id] of [...counts].sort((a,b)=>b[1]-a[1])){const w=await chrome.windows.get(id).catch(()=>null);if(w?.type==='normal'){target=w;break;}}}
   if(!target)throw Error('Kein normales Chrome-Fenster verfügbar.');
   const selected=(await chrome.storage.local.get('selectedViews')).selectedViews||[];
   for(const t of tabs)if(t.windowId!==target.id)await chrome.tabs.move(t.id,{windowId:target.id,index:-1});
   const refreshed=await chrome.tabs.query({windowId:target.id});
   await chrome.storage.local.set({selectedViews:selected.map(v=>{const t=refreshed.find(t=>t.id===v.id);return t?{id:t.id,url:t.url,windowId:t.windowId}:v;}),singleWindowMigration:170});
   await chrome.storage.session.remove('liveWorkspace');
   // Close only the tool's obsolete, separate control windows.
   const controls=await chrome.tabs.query({url:chrome.runtime.getURL('popup.html')});
   for(const t of controls){const w=await chrome.windows.get(t.windowId,{populate:true}).catch(()=>null);if(w?.type==='popup'&&w.tabs?.every(x=>x.url===chrome.runtime.getURL('popup.html')))await chrome.windows.remove(w.id).catch(()=>{});}
   await chrome.windows.update(target.id,{state:'maximized',focused:true});
   return {active:false,count:tabs.length,windowId:target.id};
  }finally{moving=false;}
 }
 return {open,restore:open,state:async()=>({active:false,count:0}),migrate:async()=>{const p=await chrome.storage.local.get('singleWindowMigration');if(p.singleWindowMigration!==170)await open();}};
})();
