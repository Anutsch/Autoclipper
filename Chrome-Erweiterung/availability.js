// Read only Twitch's player/control UI. No cookies, private APIs or chat text.
function acInspect(){
 const now=Date.now(),q=s=>document.querySelector(s),visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
 const video=q('[data-a-target="video-player"] video')||q('[data-a-target="video-player-root"] video')||q('video');
 const result=(state,allowed,reason,extra={})=>({state,allowed,reason,checkedAt:now,page:location.href,...extra});
 const player=q('[data-a-target="video-player"]')||q('[data-a-target="video-player-root"]');
 const adSelectors=['[data-a-target="video-ad-label"]','[data-a-target="video-ad-countdown"]','[data-a-target="video-ad-pod-countdown"]','[data-test-selector="ad-banner-default-text"]','[data-test-selector="ad-banner-default-text-container"]','[data-a-target="player-overlay-commercial"]'];
 const ads=adSelectors.flatMap(s=>[...document.querySelectorAll(s)]).filter(visible);
 if(ads.length){
  const text=ads.map(e=>e.textContent||'').join(' ');let seconds=null,scope='ad';
  const pod=q('[data-a-target="video-ad-pod-countdown"]');const counter=visible(pod)?pod:ads.find(e=>/countdown/.test(e.getAttribute('data-a-target')||''));
  const countdown=(counter?.textContent||text).trim();const clock=countdown.match(/\b(\d{1,2}):(\d{2})\b/),sec=countdown.match(/\b(\d+)\s*(?:s(?:ek(?:unden)?)?|seconds?)\b/i);
  if(clock)seconds=+clock[1]*60+(+clock[2]);else if(sec)seconds=+sec[1];else if(counter&&/^\d+$/.test(countdown))seconds=+countdown;
  if(visible(pod))scope='break';
  return result('ad',false,'Werbung läuft',{remainingSeconds:seconds,remainingScope:scope});
 }
 const contexts=[...document.querySelectorAll('[role="dialog"],[role="alert"],[data-a-target="player-overlay-content-gate"],[data-a-target="player-overlay-background"]')].filter(visible);
 const text=contexts.map(e=>e.textContent||'').join(' ').slice(0,12000);
 if(/clips? (?:are |is )?(?:disabled|not (?:enabled|available))|(?:clippen|clips? (?:erstellen|sind|wurden|ist)).{0,65}(?:deaktiviert|nicht (?:aktiviert|erlaubt|verfügbar|möglich))|(?:streamer|channel|kanal).{0,70}(?:disabled clips|clips deaktiviert)/i.test(text))return result('restricted',false,'Clips sind für diesen Kanal deaktiviert.');
 if(/clips?|clippen/i.test(text)&&/keine clips|clips? (?:nicht|nicht mehr) erstellen|keine.{0,25}clips?.{0,25}erstellen|cannot create clips|can.t create clips|not (?:allowed|permitted) to (?:clip|create clips)|nicht berechtigt.{0,50}clips?/i.test(text))return result('restricted',false,'Twitch erlaubt das Clippen auf diesem Kanal derzeit nicht.');
 if(/(?:only|nur).{0,40}(?:subscribers|followers|abonnenten|follower).{0,50}(?:clips?|clippen)|(?:clips?|clippen).{0,60}(?:only|nur).{0,30}(?:subscribers|followers|abonnenten|follower)/i.test(text))return result('restricted',false,'Clippen ist durch die Kanal-Einstellungen eingeschränkt.');
 if(/(?:log in|sign in|anmelden).{0,70}(?:create a clip|clips? erstellen|clippen)/i.test(text))return result('login',false,'Zum Clippen bei Twitch anmelden.');
 if(/offline|nicht live/i.test(text)&&!video)return result('offline',false,'Der Kanal ist offline.');
 if(location.hostname==='clips.twitch.tv'||/\/clip\//.test(location.pathname))return video?result('ready',true,'MP4-Vorschau bereit.'):result('loading',false,'Clip-Vorschau lädt …');
 const editorButton=[...document.querySelectorAll('button')].find(b=>/clip.editor.*(?:schließen|close)|close.*clip.editor/i.test((b.getAttribute('aria-label')||'')+' '+b.textContent));
 if(editorButton){const title=q('input[aria-label="Clip-Titel"],input[placeholder="Einen Titel hinzufügen (erforderlich)"]');return title?.value.trim()?result('draft',false,'Benannte Clip-Vorschau offen. Zuerst abschließen oder schließen.'):result('ready',true,'Unbenannte Vorschau wird beim Clippen erneuert.');}
 const selectors=['[data-a-target="player-clip-button"]','[data-a-target="clip-button"]','button[aria-label^="Clip ("]','button[aria-label^="Clip erstellen"]','button[aria-label^="Create Clip"]'];
 const button=selectors.map(q).find(Boolean);
 if(!button)return result('unknown',false,video?'Clip-Freigabe nicht erkennbar. Player kurz öffnen.':'Kein Stream-Player erkannt.');
 const hint=[button.getAttribute('title'),button.getAttribute('aria-label'),button.getAttribute('data-tooltip-content')].filter(Boolean).join(' ');
 if(button.disabled||button.getAttribute('aria-disabled')==='true')return result('restricted',false,/deaktiviert|disabled|follower|subscriber|abonnent/i.test(hint)?hint:'Twitch sperrt den Clip-Button derzeit.');
 if(globalThis.acKeepAliveState?.error&&video?.paused)return result('loading',false,globalThis.acKeepAliveState.error);
 if(!video||video.readyState<2)return result('loading',false,'Stream lädt oder puffert …');
 return result('ready',true,'Clip-Button verfügbar.');
}
