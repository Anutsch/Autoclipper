window.initCameraReview = function(api, token) {
 const toggle = document.getElementById('autoCamera');
 const panel = document.getElementById('cameraReview');
 const preview = document.getElementById('cameraPreview');
 const selection = document.getElementById('cameraSelection');
 const apply = document.getElementById('cameraApply');
 const skip = document.getElementById('cameraSkip');
 const status = document.getElementById('cameraStatus');
 let jobId = null, objectURL, start, crop, saving = false;
 const setStatus = value => { status.textContent = acMessage(value); };

 toggle.onchange = async () => {
  toggle.disabled = true;
  try { await api('camera-preference',{enabled:toggle.checked}); }
  catch(error) { toggle.checked = !toggle.checked; document.getElementById('cameraPreferenceStatus').textContent=acMessage(error.message); }
  finally { toggle.disabled = false; }
 };

 function point(event) {
  const bounds = preview.getBoundingClientRect();
  const clamp = value => Math.min(1, Math.max(0, value));
  return [clamp((event.clientX-bounds.left)/bounds.width),clamp((event.clientY-bounds.top)/bounds.height)];
 }
 preview.parentElement.onpointerdown = event => {
  if (!jobId || !preview.naturalWidth || saving || event.button !== 0) return;
  start = point(event);
  crop = null;
  apply.disabled = true;
  selection.hidden = true;
  preview.parentElement.setPointerCapture(event.pointerId);
 };
 preview.parentElement.onpointermove = event => {
  if (!start) return;
  const [x,y] = point(event);
  crop = [Math.min(x,start[0]),Math.min(y,start[1]),Math.abs(x-start[0]),Math.abs(y-start[1])];
  const [left,top,width,height] = crop.map(v=>v*100+'%');
  Object.assign(selection.style,{left,top,width,height});
  selection.hidden = false;
  apply.disabled = crop[2]<.04 || crop[3]<.04;
 };
 preview.parentElement.onpointerup = preview.parentElement.onpointercancel = () => { start = null; };

 async function submit(withoutCamera) {
  if (!jobId || saving) return;
  saving = true;
  skip.disabled = apply.disabled = true;
  try {
   await api('camera-review',withoutCamera ? {id:jobId,skip:true} : {id:jobId,crop});
   panel.hidden = true;
  } catch(error) { setStatus(error.message); }
  finally { saving = false; skip.disabled = false; apply.disabled = !crop || crop[2]<.04 || crop[3]<.04; }
 }
 apply.onclick = () => submit(false);
 skip.onclick = () => submit(true);

 return state => {
  if (!toggle.disabled) toggle.checked = state.preferences?.autoCamera === true;
  const job = state.jobs.find(entry=>entry.status==='import_wait' && entry.cameraState==='review');
  const next = job?.id || null;
  if (next === jobId) return;
  jobId = next;
  panel.hidden = !next;
  start = crop = null;
  selection.hidden = true;
  apply.disabled = true;
  preview.removeAttribute('src');
  if (objectURL) URL.revokeObjectURL(objectURL);
  objectURL = null;
  if (!next) return;
  setStatus('');
  fetch('/api/camera-preview?id='+encodeURIComponent(next),{headers:{'X-Autoclipper-Token':token}})
   .then(response=>{if(!response.ok)throw Error(acText('Keine Cam-Vorschau verfügbar.'));return response.blob();})
   .then(blob=>{if(jobId===next){objectURL=URL.createObjectURL(blob);preview.src=objectURL;}})
   .catch(error=>{if(jobId===next)setStatus(error.message);});
 };
};
