// Keep live players running without seeking, recording, or opening clip previews.
(function(){
 if(globalThis.acKeepAliveStop)globalThis.acKeepAliveStop();
 let enabled=true,stopped=false,pending=false,lastTry=0;
 const listeners=[],on=(e,n,f)=>{e.addEventListener(n,f);listeners.push([e,n,f]);};
 const observed=new WeakSet();
 globalThis.acKeepAliveState={enabled:true,running:false,autoMuted:false,error:''};
 function livePage(){return /^(www\.|m\.)?twitch\.tv$/.test(location.hostname)&&/^\/[a-zA-Z0-9_]+\/?$/.test(location.pathname)&&!/^\/(directory|settings|downloads|inventory|subscriptions|wallet|login|signup|search)\/?$/.test(location.pathname);}
 async function keep(){
  if(stopped||!enabled||!livePage())return;
  // Never auto-play the editor's MP4. Only the channel's own player.
  const v=document.querySelector('[data-a-target="video-player"] video')||document.querySelector('[data-a-target="video-player-root"] video');
  if(!v)return;
  if(!observed.has(v)){observed.add(v);for(const event of ['pause','canplay','loadedmetadata','ended'])on(v,event,()=>{setTimeout(keep,350);});on(v,'playing',()=>{globalThis.acKeepAliveState.running=true;globalThis.acKeepAliveState.error='';});on(v,'volumechange',()=>{if(!v.muted)globalThis.acKeepAliveState.autoMuted=false;});}
  const state=globalThis.acKeepAliveState;state.enabled=enabled;state.running=!v.paused&&!v.ended;
  if(state.running||v.ended||v.error||pending||Date.now()-lastTry<2500)return;
  pending=true;lastTry=Date.now();
  try{await v.play();state.running=true;state.error='';}
  catch(e){
   // Chrome permits muted autoplay. Keep an already audible player unchanged.
   if(e.name==='NotAllowedError'&&!v.muted){
    v.muted=true;state.autoMuted=true;
    try{await v.play();state.running=true;state.error='';}catch{state.error='Chrome blockiert die Wiedergabe. Stream einmal starten.';}
   }else if(e.name!=='AbortError')state.error='Player wartet auf Wiedergabe.';
  }finally{pending=false;}
 }
 chrome.storage.local.get({keepPlayersAwake:true}).then(p=>{enabled=p.keepPlayersAwake;globalThis.acKeepAliveState.enabled=enabled;keep();}).catch(()=>{});
 const change=(changes,area)=>{if(area==='local'&&changes.keepPlayersAwake){enabled=changes.keepPlayersAwake.newValue!==false;globalThis.acKeepAliveState.enabled=enabled;keep();}};
 chrome.storage.onChanged.addListener(change);
 on(document,'visibilitychange',keep);on(window,'pageshow',keep);
 const timer=setInterval(keep,3000);
 globalThis.acKeepAliveStop=()=>{stopped=true;clearInterval(timer);for(const [e,n,f] of listeners)e.removeEventListener(n,f);try{chrome.storage.onChanged.removeListener(change);}catch{}};
 keep();
})();
