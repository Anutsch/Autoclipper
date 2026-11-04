// Local chat analysis. Only numeric summaries leave the Twitch tab.
(()=>{
 if(globalThis.acMoments)return;globalThis.acMoments=true;
 let page='',started=Date.now(),seen=new WeakSet(),messages=[],history=[],lastAlert=0,alertUntil=0,streak=0;
 let baseline=[],common=new Map(),lastPublish=0;
 const norm=s=>s.toLowerCase().normalize('NFKC').replace(/(.)\1{2,}/g,'$1$1');
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const laugh=s=>/(?:[ah]{5,}|(?:ha|ah|he|hi){2,}|l+m+a+o+|l+o+l+|x+d{2,}|xdxd|rofl|ich kann nicht mehr|ich sterb|lachflash|weglach)/i.test(s);
 function ingest(node){
  if(seen.has(node))return;
  const user=node.querySelector('[data-a-target="chat-message-username"],.chat-author__display-name');
  if(!user)return;
  const author=(user.getAttribute('data-a-user')||user.textContent||'').toLowerCase().trim();
  if(!author||/(?:^|_)(?:nightbot|streamelements|moobot|streamlabs|fossabot|wizebot)(?:$|_)/i.test(author))return;
  const content=node.querySelector('[data-a-target="chat-line-message-body"],.chat-line__message-container')||node;
  const text=[...content.querySelectorAll('.text-fragment,[data-a-target="chat-message-text"]')].map(n=>n.textContent).join(' ').slice(0,700);
  let emotes=[...content.querySelectorAll('img.chat-image,img[data-a-target="emote-name"],img[alt]')].filter(i=>!i.closest('.chat-badge')).map(i=>i.alt).filter(Boolean).slice(0,30);
  emotes=emotes.concat(text.match(/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?/gu)||[]).slice(0,30);
  const full=text+' '+emotes.join(' '),fingerprint=norm(full).trim();if(!fingerprint)return;
  seen.add(node);
  const now=Date.now(),recent=messages.filter(m=>m.author===author&&now-m.at<15000);
  if(recent.length>=3||recent.some(m=>m.fingerprint===fingerprint))return;
  const laughter=laugh(full)||emotes.some(e=>/kekw|lul|omegalul|lulw|lmao|laugh|xdd|haha/i.test(e));
  const surprise=/\b(?:w[o0]+w|w+t+f+|o+m+g+|was zur|junge|alter|heftig|holy|krass|nein|nooo|ain.?t no way)\b/i.test(full)||emotes.some(e=>/pog|woah|wide|huh|gasp/i.test(e));
  const shock=/\b(?:schock|hilfe|oh gott|das war knapp|rip|unfall|angst)\b/i.test(full)||emotes.some(e=>/monka|scared|fear|peeposhy|sadge/i.test(e));
  const clip=/\b(?:clip(?:p|pen|ped)?|clip das|clip it|clipped|clipp?en)\b/i.test(full);
  messages.push({at:now,author,fingerprint,laughter,surprise,shock,clip,emotes});
  if(messages.length>3500)messages.splice(0,messages.length-3500);
 }
 function reset(){page=location.pathname;started=Date.now();seen=new WeakSet();messages=[];history=[];baseline=[];common.clear();lastAlert=0;alertUntil=0;streak=0;}
 function scan(root,initial=false){
  const lines=[];const parent=root.closest?.('.chat-line__message');if(parent)lines.push(parent);root.querySelectorAll?.('.chat-line__message').forEach(n=>lines.push(n));
  for(const line of lines)if(initial)seen.add(line);else ingest(line);
 }
 const observer=new MutationObserver(records=>{if(page!==location.pathname){reset();scan(document,true);return;}for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)scan(n);});
 reset();scan(document,true);observer.observe(document.documentElement,{childList:true,subtree:true});
 function tick(){
  const now=Date.now();if(page!==location.pathname){reset();scan(document,true);}
  const available=!!document.querySelector('[data-a-target="chat-scroller"],.chat-scrollable-area__message-container,[role="log"]');
  messages=messages.filter(m=>now-m.at<180000);baseline=baseline.filter(b=>now-b.at<180000);
  const windowed=messages.filter(m=>now-m.at<=15000),users=new Set(windowed.map(m=>m.author));
  const baselineSamples=baseline.filter(b=>now-b.at>=30000);
  const rates=baselineSamples.map(b=>b.rate).sort((a,b)=>a-b),median=rates.length?rates[Math.floor(rates.length/2)]:0;
  const deviations=rates.map(v=>Math.abs(v-median)).sort((a,b)=>a-b),mad=deviations.length?deviations[Math.floor(deviations.length/2)]:0;
  const rate=windowed.length/15,ratio=(rate+.1)/(median+.1),z=(rate-median)/Math.max(.15,mad*1.4826);
  const reactive=new Set(windowed.filter(m=>m.laughter||m.surprise||m.shock||m.clip).map(m=>m.author));
  const laughter=new Set(windowed.filter(m=>m.laughter).map(m=>m.author)).size;
  const surprise=new Set(windowed.filter(m=>m.surprise).map(m=>m.author)).size;
  const shock=new Set(windowed.filter(m=>m.shock).map(m=>m.author)).size;
  const clips=new Set(windowed.filter(m=>m.clip).map(m=>m.author)).size;
  const emoteUsers=new Set(),emoteCounts=new Map();
  for(const m of windowed){if(m.emotes.length>=2)emoteUsers.add(m.author);for(const e of new Set(m.emotes)){if(!emoteCounts.has(e))emoteCounts.set(e,new Set());emoteCounts.get(e).add(m.author);}}
  let wave=0,novelty=0;for(const [emote,authors] of emoteCounts){wave=Math.max(wave,authors.size);const normal=common.get(emote)||0;novelty=Math.max(novelty,clamp((authors.size-normal*users.size)/Math.max(3,users.size*.5)));}
  const fraction=reactive.size/Math.max(1,users.size),diversity=clamp((users.size-2)/6);
  const burst=clamp((ratio-1)/3)*.65+clamp(z/6)*.35;
  const emoteSignal=clamp(wave/Math.max(4,users.size*.6))*.55+clamp(emoteUsers.size/Math.max(4,users.size*.5))*.45;
  const blend=[laughter,surprise,shock,clips].filter(v=>v>=2).length;
  const normalReaction=baselineSamples.length?baselineSamples.reduce((s,b)=>s+b.reactions,0)/baselineSamples.length:0;
  const reactionJump=clamp((fraction-normalReaction)/.5);
  const unexpectedEmotes=emoteSignal*(.35+.65*novelty);
  let score=Math.round(100*clamp((burst*.25+(clamp(fraction/.65)*.35+reactionJump*.65)*.28+unexpectedEmotes*.27+novelty*.10+clamp(clips/4)*.14+clamp(blend/3)*.05+clamp(laughter/Math.max(4,users.size*.6))*.12)*diversity));
  const warmed=now-started>=45000&&baselineSamples.length>=4;
  if(!warmed||!available)score=0;
  const corroborated=users.size>=6&&(reactive.size>=4||wave>=5)&&(burst>.35||reactionJump>.5||clips>=3||(novelty>.65&&emoteUsers.size>=5));
  streak=score>=65&&corroborated?streak+1:Math.max(0,streak-1);
  if(warmed&&corroborated&&(streak>=2||score>=90)&&now-lastAlert>=60000){lastAlert=now;alertUntil=now+20000;}
  if(available&&(!history.length||now-history[history.length-1].at>=4000))history.push({at:now,score,rate:Math.round(rate*60),users:users.size});
  history=history.filter(h=>now-h.at<240000).slice(-60);
  // Learn normal emote usage slowly; freeze during candidate events to avoid swallowing a spike.
  if(!warmed||score<50){for(const [e,u] of emoteCounts)common.set(e,(common.get(e)||0)*.97+.03*u.size/Math.max(1,users.size));if(common.size>300)common.delete(common.keys().next().value);}
  if(available&&score<65)baseline.push({at:now,rate,reactions:fraction});
  const reasons=[];if(laughter>=2)reasons.push(laughter+' lachen');if(wave>=3)reasons.push(wave+' mit gleichen Emotes');if(emoteUsers.size>=3)reasons.push(emoteUsers.size+' mit Emote-Ketten');if(surprise>=2)reasons.push(surprise+' überrascht');if(shock>=2)reasons.push(shock+' schockiert');if(clips>=2)reasons.push(clips+' Clip-Rufe');if(ratio>=1.8&&warmed)reasons.push(ratio.toFixed(1)+'× Chattempo');
  const statusText=[...document.querySelectorAll('.chat-line__status,[data-a-target="chat-connection-status"]')].slice(-1).map(n=>n.textContent).join(' ');
  const disconnected=/disconnected|reconnecting|connection (?:closed|lost)|verbindung (?:unterbrochen|getrennt|verloren)|verbindung wird (?:wieder)?hergestellt/i.test(statusText);
  const connection=navigator.onLine===false?'offline':disconnected?'disconnected':available?'connected':'unavailable';
  const chatReady=available&&document.readyState==='complete'&&(!!document.querySelector('.chat-line__message')||/welcome|willkommen/i.test(statusText));
  const result={chatReady,connection,page:location.href,at:now,state:!available?'unavailable':!warmed?'learning':now<alertUntil?'alert':'calm',score,users:users.size,rate:Math.round(rate*60),ratio:Math.round(ratio*10)/10,reasons:reasons.slice(0,5),history,alertId:lastAlert||null};
  if(now-lastPublish>=1900){lastPublish=now;try{chrome.runtime.sendMessage({type:'moment-update',moment:result},()=>{if(chrome.runtime.lastError){observer.disconnect();clearInterval(timer);globalThis.acMoments=false;}});}catch{observer.disconnect();clearInterval(timer);globalThis.acMoments=false;}}
 }
 const timer=setInterval(tick,2000);tick();
})();
