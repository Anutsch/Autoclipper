/* The panel renders a transparent title so it looks the same on both platforms. */
window.initClipDesign = function (api, pickFiles, premiereOnly = false, loadAssetPreview) {
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
 const effects = {
  strokeColor:'titleStrokeColor', strokeWidth:'titleStrokeWidth', shadow:'titleShadow',
  background:'titleBackground', backgroundColor:'titleBackgroundColor', align:'titleAlign',
  italic:'titleItalic', uppercase:'titleUppercase'
 };
 const editorNames = {premiere:'Premiere Pro',resolve:'DaVinci Resolve',capcut:'CapCut'};
 let editor = 'premiere', defaultEditor = 'premiere', savedEffects = {};
 let assets = [], current = null, initialized = false, saving = false, dirty = false, lastDefault;
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
  Object.assign(values,savedEffects);
  for (const [key,id] of Object.entries(effects)) {
   const field = $(id);
   if (!field) continue;
   values[key] = field.type === 'checkbox' ? field.checked
    : field.tagName === 'BUTTON' ? field.getAttribute('aria-pressed') === 'true' : field.value;
  }
  values.title = values.title.trim();
  return values;
 }

 function draw(values, target = editor) {
  if ($('titleSizeValue')) $('titleSizeValue').value = values.size;
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!values.title) { ctx.restore(); return; }
  const layout = layouts[values.platform] || layouts.tiktok;
  const width = canvas.width - layout.left - layout.right;
  const height = canvas.height - layout.top - layout.bottom;
  const family = values.font.replace(/["\\]/g,'').trim() || 'Arial';
  let size = Math.max(30, Math.min(150, Number(values.size) || 82)), lines;
  do {
   ctx.font = (values.italic ? 'italic ' : '') + values.weight + ' ' + size + 'px "' + family + '", sans-serif';
   lines = wrap(values.uppercase ? values.title.toLocaleUpperCase() : values.title, width);
   if (lines.length * size * 1.2 <= height || size <= 30) break;
   size -= 2;
  } while (true);
  const lineHeight = size * 1.2;
  const spare = Math.max(0,height - lines.length * lineHeight);
  const offset = values.position === 'bottom' ? spare : values.position === 'center' ? spare / 2 : 0;
  const align = target === 'resolve' && ['left','right'].includes(values.align) ? values.align : 'center';
  const x = layout.left + width * ({left:0,center:.5,right:1}[align]);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const stroke = values.strokeWidth == null ? Math.max(3,size * .08) : Number(values.strokeWidth);
  if (stroke > 0) ctx.lineWidth = stroke;
  ctx.strokeStyle = values.strokeColor || 'rgba(0,0,0,.78)';
  lines.forEach((line,i) => {
   const y = layout.top + offset + (i + .5) * lineHeight;
   if (target === 'capcut' && values.background && line) {
    const box = Math.min(width,ctx.measureText(line).width) + size * .4;
    ctx.fillStyle = values.backgroundColor || '#171322';
    ctx.fillRect(x-box/2,y-lineHeight/2,box,lineHeight);
   }
   if (target !== 'capcut' && Number(values.shadow)>0) {
    ctx.shadowColor = '#000';
    ctx.shadowBlur = Number(values.shadow);
    ctx.shadowOffsetY = Number(values.shadow)/3;
   }
   ctx.fillStyle = values.color;
   if (stroke > 0) ctx.strokeText(line,x,y,width);
   ctx.fillText(line,x,y,width);
  });
  ctx.restore();
 }

 function renderAssets() {
  const list = $('designAssets');
  list.replaceChildren();
  assets.forEach((path,index) => {
   const row = document.createElement('li');
   const name = document.createElement('span');
   name.textContent = path.split(/[\\/]/).pop().replace(/^[0-9a-f]{20}-/,'');
   name.title = path;
   name.className = 'asset-name';
   const remove = document.createElement('button');
   remove.type = 'button';
   remove.textContent = '×';
   remove.setAttribute('aria-label', acText('Asset entfernen') + ' · ' + name.textContent);
   remove.onclick = () => { assets.splice(index,1);dirty=true;renderAssets(); };
   if (loadAssetPreview) {
    const preview = document.createElement('span');
    preview.className = 'asset-preview';
    preview.textContent = /\.(mp4|mov)$/i.test(path) ? '▶' : '▧';
    preview.setAttribute('aria-hidden','true');
    row.append(preview);
    loadAssetPreview(path).then(blob => {
     if (!preview.isConnected) return;
     const image = document.createElement('img');
     const url = URL.createObjectURL(blob);
     image.alt = '';
     image.onerror = () => URL.revokeObjectURL(url);
     image.onload = () => { preview.replaceChildren(image);URL.revokeObjectURL(url); };
     image.src = url;
    }).catch(() => {});
   }
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
   else dirty=false;
   status(acText(job?'Gestaltung freigegeben.':'Automatische Gestaltung gespeichert.'));
  } catch (error) {
   status(error.message);
  } finally {
   draw(values());
   saving = false;
   updateButtons();
  }
 }

 Object.values(fields).forEach(id=>$(id).addEventListener('input',()=>{dirty=true;draw(values());}));
 for (const id of Object.values(effects)) {
  const field = $(id);
  if (!field) continue;
  const changed = () => { dirty=true;draw(values()); };
  if (field.tagName === 'BUTTON') {
   field.onclick = () => {
    field.setAttribute('aria-pressed', String(field.getAttribute('aria-pressed') !== 'true'));
    changed();
   };
  } else field.addEventListener('input',changed);
 }
 $('titleFontPreset')?.addEventListener('change', event => {
  const preset = event.currentTarget;
  if (!preset.value) return;
  $('titleFont').value = preset.value;
  $('titleFont').dispatchEvent(new Event('input', {bubbles:true}));
  preset.value = '';
 });
 $('titlePlatform').addEventListener('change', () => {
  const layout = layouts[$('titlePlatform').value];
  $('titleWeight').value = layout.weight;
  $('titlePosition').value = layout.position;
  draw(values());
 });
 $('pickAssets').onclick = async () => {
  try {
   $('pickAssets').disabled=true;
   const selected = await pickFiles();
   const allowed = selected.filter(path=>/\.(mov|mp4|png|jpe?g)$/i.test(path));
   assets = [...new Set([...assets,...allowed])].slice(0,6);
   dirty=true;renderAssets();
   if (allowed.length !== selected.length) status(acText('Unterstützt: MOV, MP4, PNG und JPG.'));
  } catch (error) { status(error.message); }
  finally { $('pickAssets').disabled=false; }
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
  defaultEditor = premiereOnly ? 'premiere' : state.editor || 'premiere';
  current = state.jobs.find(job=>['batch','clip'].includes(job.kind) &&
   (!premiereOnly || (job.editor || 'premiere') === 'premiere') && !['done','error','executing','sync_follow'].includes(job.status));
  const target = current?.editor || defaultEditor;
  if (!initialized || editor !== target) {
   editor = target;
   if ($('titleEditor')) $('titleEditor').textContent = editorNames[editor];
   if ($('designHandoff')) $('designHandoff').hidden = editor !== 'capcut';
   for (const field of document.querySelectorAll('[data-title-editors]')) {
    field.hidden = !field.dataset.titleEditors.split(' ').includes(editor);
   }
   draw(values());
  }
  const saved = state.preferences?.clipDesign || {};
  const snapshot = JSON.stringify(saved);
  if (!initialized || (!dirty && lastDefault !== snapshot)) {
   lastDefault = snapshot;
   for (const [key,id] of Object.entries(fields)) {
    const value = key === 'title' || key === 'duration' ? saved[key] : saved.style?.[key];
    const field = $(id);
    field.value = value ?? (field.tagName === 'SELECT' ? field.options[0].value : field.defaultValue);
   }
   savedEffects = Object.fromEntries(Object.keys(effects).filter(key=>saved.style?.[key] != null)
    .map(key=>[key,saved.style[key]]));
   for (const [key,id] of Object.entries(effects)) {
    const field = $(id);
    if (!field) continue;
    const value = savedEffects[key];
    if (field.type === 'checkbox') field.checked = value === true;
    else if (field.tagName === 'BUTTON') field.setAttribute('aria-pressed',String(value === true));
    else field.value = value ?? (field.tagName === 'SELECT' ? field.options[0].value : field.defaultValue);
   }
   assets = (saved.assets || []).slice();
   renderAssets();
   draw(values());
   initialized = true;
  }
  const defaults = state.preferences?.clipDesign;
  $('designDefaultState').textContent = defaults?.assets?.length || defaults?.title
   ? acText('Automatische Gestaltung aktiv.')
   : acText('Keine automatische Gestaltung gespeichert.');
  if (!$('holdDesign').disabled) $('holdDesign').checked = state.preferences?.holdDesign === true;
  $('designWaiting').hidden = !current?.awaitingDesign;
  if(current?.awaitingDesign && current.id !== $('designWaiting').dataset.jobId){
   $('designWaiting').dataset.jobId=current.id;
   $('designWaiting').closest('details').open=true;
  }
  updateButtons();
 };
};
