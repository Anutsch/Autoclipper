
(function(){
 var busy=false,lastResult=null,currentInfo=null,retryJob=null,lastRender='',booted=false;
 var extensionId='de.autoclipper.premiere.window';
 function retainPanel(){try{window.__adobe_cep__.requestOpenExtension(extensionId,'');window.focus();}catch(e){}}
 function restoreAfterProject(){[0,250,900,1800].forEach(function(ms){setTimeout(retainPanel,ms);});}

 var bootstrap='$.evalFile(new File('+JSON.stringify('__AUTOCLIPPER_HOST_JSX__')+')); ';
 var $=function(id){return document.getElementById(id);};
 function api(path,data){return fetch('http://127.0.0.1:18743/api/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json','X-Autoclipper-Token':'__AUTOCLIPPER_TOKEN__'},body:data?JSON.stringify(data):undefined}).then(async function(r){var d=await r.json();if(!r.ok)throw Error(d.error||'Verbindung fehlgeschlagen');return d;});}
 function script(code){return new Promise(function(resolve,reject){window.__adobe_cep__.evalScript(code,function(s){if(s==='EvalScript error.')reject(Error('Premiere-Skript konnte nicht ausgeführt werden.'));else resolve(s);});});}
 function render(state,info){
  $('project').textContent=info.project||'Kein Projekt geöffnet';$('project').title=info.projectPath||'';$('sequence').textContent=info.sequence||'—';
  $('format').textContent=info.sequence?info.width+' × '+info.height+' · '+info.fps+' fps':'1080 × 1920 · 30 fps';
  $('jump').disabled=!info.sequenceId;

  var clips=state.jobs.filter(function(j){return j.kind==='batch'||j.kind==='clip';});
  var active=clips.find(function(j){return j.status!=='done'&&j.status!=='error';});var latest=clips[clips.length-1];var shown=active||latest;
  $('newProject').disabled=state.jobs.some(function(j){return j.status!=='done'&&j.status!=='error';});
  var sources=shown?(shown.sources&&shown.sources.length?shown.sources:shown.tabs&&shown.tabs.length?shown.tabs:[{channel:shown.channel||'Twitch',status:shown.status}]):[];
  var key=JSON.stringify([shown&&shown.id,shown&&shown.status,sources]);
  if(key!==lastRender){lastRender=key;var area=$('jobs');area.replaceChildren();if(!sources.length)area.textContent='Keine Clips.';sources.forEach(function(s){var row=document.createElement('div');row.className='job';var name=document.createElement('strong');name.textContent=s.channel||s.title||'Twitch';var meta=document.createElement('span');meta.textContent=shown.status==='done'?'✓ Importiert':shown.status==='error'?'Import nicht abgeschlossen':shown.status==='executing'?'Import …':s.status==='ready'?'Import ausstehend':shown.status==='downloading'?(s.message||'Download …'):'Quelle …';row.append(name,meta);area.append(row);});}
  var projectJob=state.jobs.find(function(j){return ['project','ensure'].includes(j.kind)&&!['done','error'].includes(j.status);});
  if(projectJob){$('status').textContent=projectJob.message;$('status').className='';}else if(shown){$('status').textContent=shown.message;$('status').className=shown.status==='error'?'error':shown.status==='done'?'success':'';}else{$('status').textContent='Bereit';$('status').className='';}
  retryJob=[...clips].reverse().find(function(j){return j.retryable&&!clips.some(function(n){return n.retryOf===j.id&&n.status==='done';});})||null;$('retry').hidden=!retryJob;$('retry').disabled=!!active;
 }
 async function tick(){if(busy)return;busy=true;try{
  if(lastResult){await api('premiere-result',lastResult);lastResult=null;}
  currentInfo=JSON.parse(await script((booted?'':bootstrap)+'AC.panelState()'));booted=true;
  var r=await api('premiere',currentInfo);$('connection').textContent='Verbunden';
  if(r.job){var j=r.job;$('status').textContent=j.message;
   if(j.keepPanel){localStorage.setItem('restorePanelUntil',String(Date.now()+20000));}
   var code=bootstrap+(j.kind==='batch'?'AC.executeBatch('+JSON.stringify(j.id)+','+JSON.stringify(j.sources)+','+JSON.stringify(j.targetProject||'')+')':'AC.execute('+JSON.stringify(j.id)+','+JSON.stringify(j.kind)+','+JSON.stringify(j.path)+')');
   var result=JSON.parse(await script(code));if(j.keepPanel){restoreAfterProject();localStorage.removeItem('restorePanelUntil');}lastResult={id:j.id,ok:result.ok,project:result.project,error:result.error,sequenceId:result.sequenceId};await api('premiere-result',lastResult);lastResult=null;
   currentInfo=JSON.parse(await script('AC.panelState()'));
  }
  render(await api('state'),currentInfo);
 }catch(e){booted=false;$('connection').textContent='Nicht verbunden';$('status').textContent='Mac-App starten. '+e.message;$('status').className='error';}finally{busy=false;}}
 $('newProject').onclick=async function(){if(busy)return;this.disabled=true;try{localStorage.setItem('restorePanelUntil',String(Date.now()+20000));await api('new-project',{keepPanel:true});tick();}catch(e){$('status').textContent=e.message;$('status').className='error';this.disabled=false;}};
 $('jump').onclick=async function(){if(!currentInfo||busy)return;try{var r=JSON.parse(await script(bootstrap+'AC.focusSequence('+JSON.stringify(currentInfo.sequenceId)+','+JSON.stringify(currentInfo.projectPath)+')'));if(!r.ok)throw Error(r.error);}catch(e){$('status').textContent=e.message;$('status').className='error';}};
 $('retry').onclick=async function(){if(!retryJob||busy)return;try{await api('retry-import',{id:retryJob.id});tick();}catch(e){$('status').textContent=e.message;$('status').className='error';}};
 if(Number(localStorage.getItem('restorePanelUntil'))>Date.now())restoreAfterProject();
 setInterval(tick,750);tick();
})();
