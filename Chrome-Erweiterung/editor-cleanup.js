// Track only previews opened by Autoclipper, across worker sleeps and queued downloads.
const acEditors=(()=>{
 let mutations=Promise.resolve(),cleaning=false;
 const mutate=fn=>{mutations=mutations.catch(()=>{}).then(async()=>{const data=(await chrome.storage.local.get('ownedClipEditors')).ownedClipEditors||{};await fn(data);await chrome.storage.local.set({ownedClipEditors:data});});return mutations;};
 async function begin(jobId,tab){await mutate(data=>{data[jobId]={jobId,sourceTabId:tab.id,sourceUrl:tab.url,openedAt:Date.now(),children:[],inlineOwned:false};});}
 async function opened(jobId){await mutate(data=>{if(data[jobId])data[jobId].inlineOwned=true;});}
 async function child(jobId,id){if(!jobId)return;await chrome.tabs.update(id,{muted:true}).catch(()=>{});await mutate(async data=>{const r=data[jobId];if(!r)return;if(!r.children.includes(id))r.children.push(id);const source=await chrome.tabs.get(r.sourceTabId).catch(()=>null),preview=await chrome.tabs.get(id).catch(()=>null);if(source&&preview&&source.windowId!==preview.windowId)await chrome.tabs.move(id,{windowId:source.windowId,index:-1}).catch(()=>{});});}
 function silence(){
  if(globalThis.acOwnedPreviewSilencer)return;
  const mute=()=>{const clipPage=location.hostname==='clips.twitch.tv'||/\/clip\//.test(location.pathname);for(const v of document.querySelectorAll('video'))if(clipPage||/\.mp4(?:\?|$)/i.test(v.currentSrc||v.src)||v.closest('[role="dialog"]'))v.muted=true;};
  const observer=new MutationObserver(mute);observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
  document.addEventListener('loadedmetadata',mute,true);document.addEventListener('play',mute,true);mute();
  globalThis.acOwnedPreviewSilencer={stop(){observer.disconnect();document.removeEventListener('loadedmetadata',mute,true);document.removeEventListener('play',mute,true);globalThis.acOwnedPreviewSilencer=null;}};
 }
 function closeInline(){
  const title=document.querySelector('input[aria-label="Clip-Titel"],input[placeholder="Einen Titel hinzufügen (erforderlich)"],input[aria-label="Clip title"],textarea[aria-label="Clip title"]');
  if(title?.value.trim())return {protected:true};
  const buttons=[...document.querySelectorAll('button')];
  const discard=buttons.find(b=>/^(Clip verwerfen|Discard Clip|Discard clip)$/.test(b.textContent.trim()));
  if(discard){discard.click();globalThis.acOwnedPreviewSilencer?.stop();return {closed:true};}
  const close=buttons.find(b=>/clip.editor.*(?:schließen|close)|close.*clip.editor/i.test((b.getAttribute('aria-label')||'')+' '+b.textContent));
  if(close){close.click();return {again:true};}
  globalThis.acOwnedPreviewSilencer?.stop();return {closed:true};
 }
 async function finish(downloaded){
  if(cleaning||!downloaded?.length)return;cleaning=true;
  try{
   await mutations;const records=(await chrome.storage.local.get('ownedClipEditors')).ownedClipEditors||{};
   for(const jobId of downloaded){
    const r=records[jobId];if(!r)continue;
    for(const id of r.children){const tab=await chrome.tabs.get(id).catch(()=>null);if(!tab)continue;
     try{const u=new URL(tab.url);if(u.hostname==='clips.twitch.tv'||(/(^|\.)twitch\.tv$/.test(u.hostname)&&/\/clip\//.test(u.pathname))){const frames=await chrome.scripting.executeScript({target:{tabId:id},func:()=>{const input=document.querySelector('input[aria-label="Clip-Titel"],input[aria-label="Clip title"],input[placeholder="Einen Titel hinzufügen (erforderlich)"]');return !!input?.value.trim();}}).catch(()=>null);if(frames&&!frames.some(f=>f.result))await chrome.tabs.remove(id).catch(()=>{});}}catch{}
    }
    const newer=Object.values(records).some(n=>n.sourceTabId===r.sourceTabId&&n.openedAt>r.openedAt);
    if(r.inlineOwned&&!newer){const tab=await chrome.tabs.get(r.sourceTabId).catch(()=>null);if(tab?.url===r.sourceUrl){const a=await chrome.scripting.executeScript({target:{tabId:r.sourceTabId},func:closeInline}).catch(()=>[]);if(a.some(x=>x.result?.again))await chrome.scripting.executeScript({target:{tabId:r.sourceTabId},func:closeInline}).catch(()=>{});}}
    await mutate(data=>{delete data[jobId];});
   }
  }finally{cleaning=false;}
 }
 return {begin,opened,child,silence,finish,pending:async()=>{await mutations;return Object.keys((await chrome.storage.local.get('ownedClipEditors')).ownedClipEditors||{});}};
})();
