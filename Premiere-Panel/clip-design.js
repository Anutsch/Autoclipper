/* The panel renders a transparent title so it looks the same on both platforms. */
window.initClipDesign = function (api, pickFiles) {
 const $ = id => document.getElementById(id);
 const canvas = $('titlePreview');
 const ctx = canvas.getContext('2d');
 const layouts = {
  tiktok: {left:95, right:200, top:225, bottom:460, weight:'900', position:'top'},
  reels: {left:85, right:170, top:240, bottom:365, weight:'700', position:'center'},
  shorts: {left:85, right:205, top:205, bottom:410, weight:'700', position:'top'}
 };
 const fields = {
  title:'titleText', font:'titleFont', weight:'titleWeight', size:'titleSize',
  color:'titleColor', position:'titlePosition', platform:'titlePlatform', duration:'titleDuration'
 };
 let assets = [], current = null, initialized = false, saving = false;
 const status = text => { $('designStatus').textContent = acMessage(text); };

 function wrap(text, width) {
  return text.split('\n').flatMap(paragraph => {
   const lines = [];
   let line = '';
   for (const word of paragraph.split(/\s+/)) {
    const next = line ? line + ' ' + word : word;
    if (line && ctx.measureText(next).width > width) {
     lines.push(line);
     line = word;
    } else line = next;
   }
   return [...lines, line];
  });
 }

 function values() {
  const values = Object.fromEntries(Object.entries(fields).map(([key,id])=>[key,$(id).value]));
  values.title = values.title.trim();
  return values;
 }

 function draw(values) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!values.title) return;
  const layout = layouts[values.platform] || layouts.tiktok;
  const width = canvas.width - layout.left - layout.right;
  const height = canvas.height - layout.top - layout.bottom;
  const family = values.font.replace(/["\\]/g,'').trim() || 'Arial';
  let size = Math.max(30, Math.min(150, Number(values.size) || 82)), lines;
  do {
   ctx.font = values.weight + ' ' + size + 'px "' + family + '", sans-serif';
   lines = wrap(values.title, width);
   if (lines.length * size * 1.2 <= height || size <= 30) break;
   size -= 2;
  } while (true);
  const lineHeight = size * 1.2;
  const spare = Math.max(0,height - lines.length * lineHeight);
  const offset = values.position === 'bottom' ? spare : values.position === 'center' ? spare / 2 : 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3,size * .08);
  ctx.strokeStyle = 'rgba(0,0,0,.78)';
  ctx.fillStyle = values.color;
  lines.forEach((line,i) => {
   const x = layout.left + width / 2;
   const y = layout.top + offset + (i + .5) * lineHeight;
   ctx.strokeText(line,x,y,width);
   ctx.fillText(line,x,y,width);
  });
 }

 function renderAssets() {
  const list = $('designAssets');
  list.replaceChildren();
  assets.forEach((path,index) => {
   const row = document.createElement('li');
   const name = document.createElement('span');
   name.textContent = path.split(/[\\/]/).pop();
   name.title = path;
   const remove = document.createElement('button');
   remove.type = 'button';
   remove.textContent = '×';
   remove.setAttribute('aria-label', acText('Asset entfernen') + ' · ' + name.textContent);
   remove.onclick = () => { assets.splice(index,1);renderAssets(); };
   row.append(name,remove);
   list.append(row);
  });
 }

 function updateButtons() {
  $('applyDesign').disabled = saving || !current;
  $('skipDesign').hidden = !current?.awaitingDesign;
  $('skipDesign').disabled = saving;
  $('saveDesign').disabled = saving;
 }

 async function save(job, skip) {
  if (saving) return;
  saving = true;
  updateButtons();
  try {
   const {title,duration,...style} = values();
   const payload = skip ? {title:'',assets:[]} : {title,assets,duration:Number(duration),style};
   if (job) payload.jobId = job.id;
   if (payload.title) {
    draw({title,...style});
    payload.image = canvas.toDataURL('image/png').split(',')[1];
   }
   await api('clip-design',payload);
   if (job) current = null;
   status(acText(job?'Gestaltung freigegeben.':'Standard gespeichert.'));
  } catch (error) {
   status(error.message);
  } finally {
   saving = false;
   updateButtons();
  }
 }

 Object.values(fields).forEach(id=>$(id).addEventListener('input',()=>draw(values())));
 $('titlePlatform').addEventListener('change', () => {
  const layout = layouts[$('titlePlatform').value];
  $('titleWeight').value = layout.weight;
  $('titlePosition').value = layout.position;
  draw(values());
 });
 $('pickAssets').onclick = async () => {
  try {
   const selected = await pickFiles();
   const allowed = selected.filter(path=>/\.(mov|mp4|png|jpe?g)$/i.test(path));
   assets = [...new Set([...assets,...allowed])].slice(0,6);
   renderAssets();
   if (allowed.length !== selected.length) status(acText('Unterstützt: MOV, MP4, PNG und JPG.'));
  } catch (error) { status(error.message); }
 };
 $('applyDesign').onclick = () => { if (current) save(current,false); };
 $('skipDesign').onclick = () => { if (current) save(current,true); };
 $('saveDesign').onclick = () => save(null,false);
 $('holdDesign').onchange = async event => {
  const input = event.target;
  input.disabled = true;
  try { await api('design-hold',{hold:input.checked}); }
  catch (error) { input.checked = !input.checked;status(error.message); }
  finally { input.disabled = false; }
 };
 updateButtons();

 return state => {
  if (!initialized) {
   const saved = state.preferences?.clipDesign || {};
   for (const [key,id] of Object.entries(fields)) {
    const value = key === 'title' || key === 'duration' ? saved[key] : saved.style?.[key];
    if (value != null) $(id).value = value;
   }
   assets = (saved.assets || []).slice();
   renderAssets();
   draw(values());
   initialized = true;
  }
  if (!$('holdDesign').disabled) $('holdDesign').checked = state.preferences?.holdDesign === true;
  current = state.jobs.find(job=>['batch','clip'].includes(job.kind) &&
   (job.editor || 'premiere') === 'premiere' && !['done','error','executing','sync_follow'].includes(job.status));
  $('designWaiting').hidden = !current?.awaitingDesign;
  if(current?.awaitingDesign && current.id !== $('designWaiting').dataset.jobId){
   $('designWaiting').dataset.jobId=current.id;
   $('designWaiting').closest('details').open=true;
  }
  updateButtons();
 };
};
