/* Move the settings into the guide while it is open so both views share the same controls. */
window.initSetupFlow = function (api) {
 const $ = id => document.getElementById(id);
 const dialog = $('setupGuide');
 const slot = $('setupGuideContent');
 const resumeKey = 'autoclipper-setup-in-progress';
 const steps = [
  ['setupPreferences', 'Sprache und Schnittziel', 'Wähle deine Sprache und das Schnittprogramm für neue Clips.'],
  ['setupBrowser', 'Chrome verbinden', 'Lade die Autoclipper-Erweiterung in Chrome und öffne einen Twitch-Livestream.'],
  ['setupDestination', 'Schnittprogramm vorbereiten', 'Prüfe die Verbindung zu deinem gewählten Schnittprogramm.'],
  ['clipDesign', 'Assets und Titel', 'Wähle optional Elemente, die in neuen Clips erscheinen sollen.']
 ];
 let step = 0, active = false, busy = false, started = false;
 let moved, placeholder;

 function restore() {
  if (moved && placeholder) placeholder.replaceWith(moved);
  moved = placeholder = null;
 }
 function render() {
  restore();
  const [id,title,description] = steps[step];
  $('setupGuideTitle').textContent = acText(title);
  $('setupGuideDescription').textContent = acText(description);
  $('setupGuideProgress').textContent = acText('Schritt')+' '+(step+1)+' / '+steps.length;
  for (const [i,mark] of [...$('setupGuideMarks').children].entries()) {
   mark.classList.toggle('reached',i<=step);
  }
  $('setupGuideBack').hidden = step===0;
  $('setupGuideNext').textContent = acText(step===steps.length-1?'Einrichtung abschließen':'Weiter');
  $('setupGuideError').textContent = '';
  moved = $(id);
  placeholder = document.createComment('setup settings');
  moved.before(placeholder);
  slot.append(moved);
  if (moved.tagName==='DETAILS') moved.open=true;
  $('setupGuideTitle').focus();
 }
 function open(index) {
  if (active) return;
  step = Number.isInteger(index) && index>=0 && index<steps.length ? index : 0;
  active = true;
  sessionStorage.setItem(resumeKey,'yes');
  dialog.showModal();
  render();
 }
 async function go(index, complete) {
  if (busy) return;
  busy = true;
  const buttons = [$('setupGuideBack'),$('setupGuideNext'),$('setupGuideSkip')];
  buttons.forEach(button=>button.disabled=true);
  try {
   await api('setup-progress',{step:index,complete});
   if (complete) {sessionStorage.removeItem(resumeKey);dialog.close();}
   else {step=index;render();}
  } catch(error) {
   $('setupGuideError').textContent=acMessage(error.message);
  } finally {
   busy=false;
   buttons.forEach(button=>button.disabled=false);
  }
 }
 dialog.addEventListener('cancel',event=>event.preventDefault());
 dialog.addEventListener('close',()=>{restore();active=false;});
 $('setupGuideBack').onclick=()=>go(step-1,false);
 $('setupGuideNext').onclick=()=>step===steps.length-1?go(step,true):go(step+1,false);
 $('setupGuideSkip').onclick=()=>go(step,true);
 $('restartSetup').onclick=async()=>{
  try {
   await api('setup-progress',{step:0,complete:false});
   open(0);
  }catch(error){$('notice').textContent=acMessage(error.message);}
 };
 return preferences=>{
  if(started)return;
  started=true;
  if(preferences?.setupComplete!==true || sessionStorage.getItem(resumeKey)==='yes')open(preferences?.setupStep);
 };
};
