// The same lightweight view is used by the extension and the native app.
(()=>{
 const data=new Map();let current=null,anchor=null,delay=0,opened=false,keyboard=false;
 const tip=document.createElement('aside');tip.className='moment-tooltip glass';tip.id='moment-chart';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);
 const fresh=m=>m&&Date.now()-m.at<15000;
 const state=m=>!fresh(m)?'unavailable':m.state;
 function node(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
 function paint(){
  if(!opened||!current)return;
  const entry=data.get(current);if(!entry)return;const m=entry.moment,mode=state(m);tip.replaceChildren();
  const head=node('div',null,'moment-tooltip-head');head.append(node('strong',entry.name),node('span',mode==='learning'?'Lernt …':mode==='unavailable'?'Chat nicht verbunden':(m.score||0)+' / 100',mode==='alert'?'hot':''));tip.append(head);
  if(mode==='learning'||mode==='unavailable'){tip.append(node('p',mode==='learning'?'Normalen Chatverlauf kennenlernen · ca. 45 Sekunden':'Stream und Chat in Chrome öffnen.','moment-caption'));}
  const points=fresh(m)?m.history||[]:[];
  if(points.length>1){
   const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 280 86');svg.setAttribute('class','moment-plot');svg.setAttribute('role','img');svg.setAttribute('aria-label','Moment-Score der letzten vier Minuten, von 0 bis 100');
   for(const level of [0,50,100]){const line=document.createElementNS(ns,'path');line.setAttribute('d','M0 '+(79-level*.7)+' H280');line.setAttribute('class','moment-grid');svg.append(line);}
   const end=Date.now(),start=end-240000;const coords=points.map(p=>[Math.max(0,Math.min(280,(p.at-start)/240000*280)),79-Math.min(100,Math.max(0,p.score))*.7]);
   const path=document.createElementNS(ns,'path');path.setAttribute('d',coords.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' '));path.setAttribute('class','moment-line'+(mode==='alert'?' hot':''));svg.append(path);tip.append(svg);
   const axis=node('div',null,'moment-axis');axis.append(node('span','−4 Min.'),node('span','jetzt'));tip.append(axis);
  }
  if(fresh(m)&&mode!=='unavailable'){
   const stats=node('div',null,'moment-stats');stats.append(node('span',m.rate+' / Min.'),node('span',m.users+' Personen · 15 s'));tip.append(stats);
   const reasons=m.reasons?.length?m.reasons:[mode==='calm'?'Keine auffällige Reaktionswelle':''];for(const reason of reasons)if(reason)tip.append(node('div',reason,'moment-reason'));
  }
  position();
 }
 function position(){if(!anchor?.isConnected){anchor=document.querySelector('.source[data-moment-tab="'+current+'"]');}if(!anchor)return;const b=anchor.getBoundingClientRect(),width=Math.min(310,innerWidth-24);tip.style.width=width+'px';tip.style.left=Math.max(12,Math.min(innerWidth-width-12,b.left))+'px';const height=tip.offsetHeight;tip.style.top=Math.max(12,Math.min(innerHeight-height-12,b.bottom+8))+'px';}
 function hide(){clearTimeout(delay);opened=false;current=null;anchor=null;tip.hidden=true;}
 function enter(card,viaKeyboard=false){const id=card?.dataset.momentTab;if(!id){hide();return;}if(current===id){anchor=card;return;}hide();current=id;anchor=card;keyboard=viaKeyboard;delay=setTimeout(()=>{opened=true;tip.hidden=false;paint();},800);}
 document.addEventListener('pointermove',e=>{if(!keyboard)enter(e.target.closest('.source[data-moment-tab]'));else keyboard=false;},{passive:true});
 document.addEventListener('focusin',e=>enter(e.target.closest('.source[data-moment-tab]'),true));
 document.addEventListener('focusout',e=>{if(keyboard&&!e.relatedTarget?.closest?.('.source[data-moment-tab]'))hide();});
 document.addEventListener('mouseleave',hide);document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});document.addEventListener('scroll',()=>{if(opened)position();},true);
 window.acMomentView={update(tabs){
  data.clear();for(const t of tabs)data.set(String(t.id),{moment:t.moment,name:(()=>{try{return new URL(t.url).pathname.split('/')[1]||'Twitch';}catch{return 'Twitch';}})()});
  for(const card of document.querySelectorAll('.source[data-moment-tab]')){const m=data.get(card.dataset.momentTab)?.moment,mode=state(m);card.classList.remove('moment-calm','moment-alert','moment-learning','moment-unavailable');card.classList.add('moment-'+(mode||'unavailable'));}
  if(opened)paint();
 }};
})();
