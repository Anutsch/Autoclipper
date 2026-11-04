// Keep short playback-state samples; no video or audio is recorded.
(function(){
 if(globalThis.autoclipperHeartbeat)return;
 globalThis.acPlaybackSamples=[];const observed=new WeakSet();
 function sample(){
  const main=document.querySelector('[data-a-target="video-player"] video')||document.querySelector('[data-a-target="video-player-root"] video');
  const videos=[...document.querySelectorAll('video')].filter(v=>{const b=v.getBoundingClientRect();return b.width>40&&b.height>40&&getComputedStyle(v).visibility!=='hidden';});
  const v=main||videos.sort((a,b)=>b.getBoundingClientRect().width*b.getBoundingClientRect().height-a.getBoundingClientRect().width*a.getBoundingClientRect().height)[0];
  const entry=v?{at:Date.now(),src:v.currentSrc||v.src,currentTime:v.currentTime,duration:Number.isFinite(v.duration)?v.duration:null,paused:v.paused,rate:v.playbackRate,ready:v.readyState,page:location.href}: {at:Date.now(),src:'',paused:true,ready:0,page:location.href};
  globalThis.acPlaybackSamples.push(entry);
  if(globalThis.acPlaybackSamples.length>240)globalThis.acPlaybackSamples.splice(0,globalThis.acPlaybackSamples.length-240);
  if(v&&!observed.has(v)){observed.add(v);for(const event of ['playing','pause','waiting','seeking','seeked','ratechange','loadedmetadata','emptied'])v.addEventListener(event,sample);}
 }
 sample();globalThis.acPlaybackSampler=setInterval(sample,250);
 globalThis.autoclipperHeartbeat=setInterval(()=>{try{chrome.runtime.sendMessage({type:'poll'},()=>{if(chrome.runtime.lastError){clearInterval(globalThis.autoclipperHeartbeat);clearInterval(globalThis.acPlaybackSampler);globalThis.autoclipperHeartbeat=null;}});}catch{clearInterval(globalThis.autoclipperHeartbeat);clearInterval(globalThis.acPlaybackSampler);globalThis.autoclipperHeartbeat=null;}},2000);
})();
