
var AC = AC || {};
AC.cached=AC.cached||{};
AC.quote=function(s){return '"'+String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n').replace(/\t/g,'\\t')+'"';};
AC.result=function(ok,project,error){var sequenceId='';try{if(ok&&app.project.activeSequence)sequenceId=app.project.activeSequence.sequenceID;}catch(ignore){}return '{"ok":'+(ok?'true':'false')+',"project":'+AC.quote(project||'')+',"error":'+AC.quote(error||'')+',"sequenceId":'+AC.quote(sequenceId)+'}';};
AC.projectName=function(){try{return app.project&&app.project.rootItem?app.project.name:'';}catch(e){return '';}};
AC.sameMediaPath=function(a,b){
 if(a===b)return true;
 if(!a||!b||$.os.toLowerCase().indexOf('windows')<0)return false;
 return (new File(a)).fsName.toLowerCase()===(new File(b)).fsName.toLowerCase();
};
AC.contains=function(item,path){
 if(item.getMediaPath && AC.sameMediaPath(item.getMediaPath(),path))return true;
 if(item.children)for(var i=0;i<item.children.numItems;i++)if(AC.contains(item.children[i],path))return true;
 return false;
};

AC.findMedia=function(item,path){
 if(item.getMediaPath && AC.sameMediaPath(item.getMediaPath(),path))return item;
 if(item.children)for(var i=0;i<item.children.numItems;i++){var found=AC.findMedia(item.children[i],path);if(found)return found;}
 return null;
};
AC.isVertical30=function(seq){
 if(!seq)return false;
 var st=seq.getSettings();
 return Number(st.videoFrameWidth)===1080 && Number(st.videoFrameHeight)===1920 && Math.abs(st.videoFrameRate.seconds-1/30)<0.000000001;
};
AC.timelineClip=function(seq,path){
 for(var t=0;t<seq.videoTracks.numTracks;t++)for(var c=0;c<seq.videoTracks[t].clips.numItems;c++){
  var clip=seq.videoTracks[t].clips[c];if(clip.projectItem && AC.sameMediaPath(clip.projectItem.getMediaPath(),path))return clip;
 }
 return null;
};
AC.sequenceBaseName=function(){return String(app.project.name).replace(/\.prproj$/i,'');};
AC.projectSequenceName=function(name,base){return name===base || (name.indexOf(base+' (')===0 && /^\d+\)$/.test(name.substring(base.length+2)));};
AC.groupSequences=AC.groupSequences||{};
AC.queueSequence=function(item,path,key,sequenceId){
 var project=app.project,cacheKey=String(project.path||project.documentID||project.name)+'|'+key;
 var cached=sequenceId||AC.groupSequences[cacheKey],seq=null;
 for(var i=0;i<project.sequences.numSequences;i++){
  var candidate=project.sequences[i];
  if((cached&&candidate.sequenceID===cached)||AC.timelineClip(candidate,path)){seq=candidate;break;}
 }
 if(!seq){
  var base=AC.sequenceBaseName(),name=base,count=2,used=true;
  while(used){used=false;for(var i=0;i<project.sequences.numSequences;i++)if(project.sequences[i].name===name){used=true;name=base+' ('+count+++')';break;}}
  if(!project.createNewSequenceFromClips(name,[item],project.rootItem))throw Error('Die neue Sequenz konnte nicht erstellt werden.');
  seq=project.activeSequence;if(!seq)throw Error('Neue Sequenz ist nicht aktiv.');
  var settings=seq.getSettings(),frameDuration=new Time();frameDuration.ticks='8467200000';
  settings.videoFrameWidth=1080;settings.videoFrameHeight=1920;settings.videoFrameRate=frameDuration;settings.videoFieldType=0;settings.videoDisplayFormat=104;seq.setSettings(settings);
 }
 if(!AC.isVertical30(seq))throw Error('Sequenz ist nicht 1080 x 1920 / 30 fps.');
 AC.groupSequences[cacheKey]=seq.sequenceID;project.openSequence(seq.sequenceID);return seq;
};
AC.addToTimeline=function(item,path,id,sequenceKey,sequenceId){
 var desired=AC.sequenceBaseName();
 var seq=sequenceKey?AC.queueSequence(item,path,sequenceKey,sequenceId):app.project.activeSequence;
 if(seq && AC.isVertical30(seq) && seq.name.indexOf('Autoclipper 9x16 30fps ')===0){seq.name=desired;if(seq.projectItem)seq.projectItem.name=desired;}
 if(!AC.isVertical30(seq) || !AC.projectSequenceName(seq.name,desired)){
  // A unique, deterministic name makes retries safe across panel restarts.
  var name=desired;var existing=null;
  for(var n=0;n<app.project.sequences.numSequences;n++)if(AC.projectSequenceName(app.project.sequences[n].name,name) && AC.isVertical30(app.project.sequences[n]))existing=app.project.sequences[n];
  if(existing){seq=existing;app.project.openSequence(seq.sequenceID);}
  else{
   var suffix=2,unique=name;for(var n=0;n<app.project.sequences.numSequences;n++){if(app.project.sequences[n].name===unique){unique=name+' ('+suffix+++')';n=-1;}}
   if(!app.project.createNewSequenceFromClips(unique,[item],app.project.rootItem))throw Error('Die Timeline konnte nicht erstellt werden. MP4 ist im Projekt vorhanden.');
   seq=app.project.activeSequence;
  }
  if(!seq)throw Error('Die neue Timeline ist nicht aktiv.');
  var settings=seq.getSettings();
  settings.videoFrameWidth=1080;settings.videoFrameHeight=1920;
  var frameDuration=new Time();frameDuration.ticks='8467200000';settings.videoFrameRate=frameDuration;
  settings.videoFieldType=0;settings.videoDisplayFormat=104;
  seq.setSettings(settings);
  if(!AC.isVertical30(seq))throw Error('Premiere hat die Timeline-Einstellungen 1080 x 1920 / 30 fps nicht bestaetigt.');
 }
 if(!AC.timelineClip(seq,path)){
  var end=new Time();end.ticks=String(seq.end);
  seq.insertClip(item,end,0,0);
 }
 var inserted=AC.timelineClip(seq,path);
 if(!inserted)throw Error('Premiere hat das Einfügen in die Timeline nicht bestätigt.');
 app.project.openSequence(seq.sequenceID);
 seq.setPlayerPosition(inserted.start.ticks);
 return seq.name;
};

AC.execute=function(id,kind,path,design){
 if(kind==='batch'){var payload=eval('('+path+')');return AC.executeBatch(id,payload.sources,payload.targetProject,design);}
 if(AC.cached[id])return AC.cached[id];
 try{
  app.setExtensionPersistent('de.autoclipper.premiere.window',1);
  if(kind==='rename'){
   var projects=[];
   if(app.projects)for(var p=0;p<app.projects.numProjects;p++)projects.push(app.projects[p]);
   if(!projects.length)projects.push(app.project);
   for(var p=0;p<projects.length;p++){
    var project=projects[p],base=String(project.name).replace(/\.prproj$/i,'');
    for(var n=0;n<project.sequences.numSequences;n++){
     var sequence=project.sequences[n];
     if(sequence.name.indexOf('Autoclipper 9x16 30fps ')!==0)continue;
     var name=base,count=2;
     for(var q=0;q<project.sequences.numSequences;q++)if(project.sequences[q].sequenceID!==sequence.sequenceID && project.sequences[q].name===name){name=base+' ('+count+++')';q=-1;}
     sequence.name=name;if(sequence.projectItem)sequence.projectItem.name=name;
    }
    if(project.path)project.save();
   }
  }else if(kind==='ensure'){
   if(!app.isDocumentOpen()){
    if($.os.toLowerCase().indexOf('windows')>=0)throw Error('Bitte das vorhandene Projekt in Premiere oeffnen. Der Speicherort wird nicht veraendert.');
    if(new File(path).exists)throw Error('Die vorgesehene Projektdatei existiert bereits.');
    if(!app.newProject(path))throw Error('Automatische Projekterstellung fehlgeschlagen.');
    if(!app.project||new File(app.project.path).fsName!==new File(path).fsName)throw Error('Das neue Projekt ist noch nicht aktiv.');
    app.project.save();
   }
  }else if(kind==='project'){
   if(!path){
    var chosen=File.saveDialog('Neues Premiere-Projekt speichern','Premiere-Projekt:*.prproj');
    if(!chosen)throw Error('Projekterstellung abgebrochen.');
    path=chosen.fsName;if(!/\.prproj$/i.test(path))path+='.prproj';
   }
   if(new File(path).exists){
    if(!app.project||new File(app.project.path).fsName!==new File(path).fsName)throw Error('Projektdatei existiert bereits. Sie wird nicht überschrieben.');
   }else{
    if(app.project && app.project.rootItem && app.project.path)app.project.save();
    var ok=app.newProject(path);
    if(!ok)throw Error('Premiere konnte das neue Projekt nicht erstellen. Offene Dialoge schließen.');
    if(!app.project||new File(app.project.path).fsName!==new File(path).fsName)throw Error('Neues Projekt ist noch nicht aktiv.');
    app.project.save();
   }
  }else{
   if(!app.project||!app.project.rootItem||!app.project.path)throw Error('Zuerst ein Projekt öffnen oder in Autoclipper ein neues erstellen. Die MP4 bleibt im Clips-Ordner.');
   if(!(new File(path)).exists)throw Error('MP4-Datei fehlt: '+path);
   if(!AC.contains(app.project.rootItem,path)){
    var imported=app.project.importFiles([path],true,app.project.rootItem,false);
    if(!imported||!AC.contains(app.project.rootItem,path))throw Error('Premiere hat den Import nicht bestätigt. Die MP4 bleibt erhalten.');
   }
   var media=AC.findMedia(app.project.rootItem,path);
   if(!media)throw Error('Importierte MP4 wurde nicht im Projekt gefunden.');
   AC.addToTimeline(media,path,id,id);
   AC.addDesign(app.project.activeSequence,design);
   app.project.save();
  }
  AC.cached[id]=AC.result(true,AC.projectName(),'');
 }catch(e){AC.cached[id]=AC.result(false,AC.projectName(),String(e)+' (Zeile '+e.line+')');}
 return AC.cached[id];
};

AC.executeBatch=function(id,sources,targetProject,design){
 if(sources.length>1&&sources[0].syncMode)return AC.executeSyncBatch(id,sources,targetProject,design);
 if(AC.cached[id])return AC.cached[id];
 try{
  if(!app.isDocumentOpen()||!app.project.rootItem)throw Error('Zuerst ein Projekt oeffnen.');
  if(targetProject && app.project.name!==targetProject)throw Error('Das aktive Projekt wurde seit dem Klick gewechselt. Bitte zum urspruenglichen Projekt zurueckkehren.');
  for(var i=0;i<sources.length;i++)if(!(new File(sources[i].path)).exists)throw Error('Eine MP4 fehlt. Es wurde nichts eingefuegt.');
  for(var i=0;i<sources.length;i++){
   var source=sources[i],item=AC.findMedia(app.project.rootItem,source.path);
   if(!item){if(!app.project.importFiles([source.path],true,app.project.rootItem,false))throw Error('MP4-Import fehlgeschlagen.');item=AC.findMedia(app.project.rootItem,source.path);}
   if(!item)throw Error('Importierte MP4 nicht gefunden.');
   var pb=source.playback;
   if(!pb||pb.end<=pb.start)throw Error('MP4-Wiedergabepunkt fehlt.');
   var oldIn=item.getInPoint(4),oldOut=item.getOutPoint(4);
   try{
    item.setInPoint(pb.start,4);item.setOutPoint(pb.end,4);
    AC.addToTimeline(item,source.path,id+'_'+i,source.sequenceKey,source.sequenceId);
    var placed=AC.timelineClip(app.project.activeSequence,source.path);
    if(!placed||Math.abs(placed.inPoint.seconds-pb.start)>1/15||Math.abs(placed.outPoint.seconds-pb.end)>1/15)throw Error('Premiere hat den Wiedergabebereich nicht bestaetigt.');
    placed.name=String(source.channel||'Twitch')+' · Tab '+source.tabId;
   }finally{item.setInPoint(oldIn.seconds,4);item.setOutPoint(oldOut.seconds,4);}
  }
  AC.addDesign(app.project.activeSequence,design);
  if(app.project.path)app.project.save();AC.cached[id]=AC.result(true,AC.projectName(),'');
 }catch(e){try{if(app.project.path)app.project.save();}catch(ignore){}AC.cached[id]=AC.result(false,AC.projectName(),String(e)+' (Zeile '+e.line+')');}
 return AC.cached[id];
};

AC.panelState=function(){
 try{
  app.setExtensionPersistent('de.autoclipper.premiere.window',1);
  var project=app.project,seq=project?project.activeSequence:null;
  if(seq){var belongs=false;for(var i=0;i<project.sequences.numSequences;i++)if(project.sequences[i].sequenceID===seq.sequenceID)belongs=true;if(!belongs)seq=null;}
  var st=seq?seq.getSettings():null;
  return '{"project":'+AC.quote(project&&app.isDocumentOpen()?project.name:'')+',"projectPath":'+AC.quote(project&&project.path?project.path:'')+',"sequence":'+AC.quote(seq?seq.name:'')+',"sequenceId":'+AC.quote(seq?seq.sequenceID:'')+',"width":'+(st?Number(st.videoFrameWidth):0)+',"height":'+(st?Number(st.videoFrameHeight):0)+',"fps":'+(st?Math.round(1000/st.videoFrameRate.seconds)/1000:0)+'}';
 }catch(e){return '{"project":"","projectPath":"","sequence":"","sequenceId":"","width":0,"height":0,"fps":0}';}
};
AC.focusSequence=function(sequenceId,projectPath){
 try{
  if(!app.project||app.project.path!==projectPath)throw Error('Zuerst das angezeigte Projekt aktivieren.');
  if(!app.project.openSequence(sequenceId))throw Error('Sequenz konnte nicht geoeffnet werden.');
  return AC.result(true,AC.projectName(),'');
 }catch(e){return AC.result(false,AC.projectName(),String(e));}
};

// Multi-view alignment is computed locally before Premiere receives the batch.
AC.ensureSyncTracks=function(seq,count,audioCount){
 audioCount=audioCount===undefined?count:audioCount;
 if(seq.videoTracks.numTracks>=count && seq.audioTracks.numTracks>=audioCount)return;
 app.enableQE();var qeSeq=qe.project.getActiveSequence();
 if(!qeSeq)throw Error('Spuren konnten nicht vorbereitet werden.');
 // Add tracks only to this newly owned sync sequence, before any view is placed.
 for(var tries=0;tries<16 && (seq.videoTracks.numTracks<count||seq.audioTracks.numTracks<audioCount);tries++){
  var v=seq.videoTracks.numTracks,a=seq.audioTracks.numTracks;
  qeSeq.addTracks(v<count?1:0);
  if(seq.videoTracks.numTracks===v&&seq.audioTracks.numTracks===a)throw Error('Premiere hat keine zusätzliche Spur angelegt.');
 }
 if(seq.videoTracks.numTracks<count||seq.audioTracks.numTracks<audioCount)throw Error('Nicht genügend getrennte Video-/Audiospuren verfügbar.');
};
AC.pickDesignAssets=function(){
 var files=File.openDialog('Choose overlay files',undefined,true);
 if(!files)return '[]';
 var result=[];
 for(var i=0;i<files.length;i++)result.push(AC.quote(files[i].fsName));
 return '['+result.join(',')+']';
};

AC.addDesign=function(seq,design){
 if(!design)return;
 var paths=(design.assets||[]).slice(0);
 if(design.cameraPath)paths.unshift(design.cameraPath);
 if(design.titlePath)paths.push(design.titlePath);
 if(!paths.length)return;
 var end=new Time();end.ticks=String(seq.end);
 for(var i=0;i<paths.length;i++){
  var path=paths[i],isTitle=path===design.titlePath,isCamera=path===design.cameraPath;
  if(AC.timelineClip(seq,path))continue;
  var item=AC.findMedia(app.project.rootItem,path);
  if(!item){
   if(!(new File(path)).exists||!app.project.importFiles([path],true,app.project.rootItem,false))
    throw Error('Overlay could not be imported: '+(new File(path)).displayName);
   item=AC.findMedia(app.project.rootItem,path);
  }
  if(!item)throw Error('Imported overlay is missing.');
  var top=0;
  for(var t=0;t<seq.videoTracks.numTracks;t++)
   if(seq.videoTracks[t].clips.numItems)top=t+1;
  if(top>=seq.videoTracks.numTracks){
   app.project.openSequence(seq.sequenceID);
   app.enableQE();
   var qeSeq=qe.project.getActiveSequence(),count=seq.videoTracks.numTracks;
   if(!qeSeq)throw Error('Could not create an overlay track.');
   qeSeq.addTracks(1,count,0);
   top=seq.videoTracks.numTracks-1;
   if(seq.videoTracks.numTracks<=count||seq.videoTracks[top].clips.numItems)
    throw Error('No empty overlay track is available.');
  }
  var track=seq.videoTracks[top];
  var start=new Time();
  start.seconds=isCamera?Number(design.cameraOffset||0):0;
  track.overwriteClip(item,start.ticks);
  var placed=AC.timelineClip(seq,path);
  if(!placed||Math.abs(placed.start.seconds-start.seconds)>1/30||track.clips.numItems!==1)
   throw Error('Premiere did not confirm the overlay placement.');
  var trim=new Time();
  trim.seconds=isTitle?Math.min(end.seconds,Number(design.duration||5)):Math.min(placed.end.seconds,end.seconds);
  placed.end=trim;
  if(isCamera){
   for(var c=0;c<placed.components.numItems;c++){
    var component=placed.components[c];
    if(/ADBE Motion$/.test(component.matchName)||/^(Motion|Bewegung|Movimiento)$/.test(component.displayName)){
     // Position is normalised to sequence size. The cropped source retains its centred anchor.
     var property=component.properties[0],position=property.getValue(),settings=seq.getSettings();
     var pixels=position&&position.length===2&&Math.abs(position[0])>1;
     property.setValue(pixels?[settings.videoFrameWidth/2,settings.videoFrameHeight*.18]:[0.5,0.18],1);
     break;
    }
   }
   placed.name='Facecam';
  }
  if(isTitle)placed.name=String(design.title);
  track.name=isCamera?'Facecam':isTitle?'Autoclipper Title':'Autoclipper Overlay';
 }
};
AC.executeSyncBatch=function(id,sources,targetProject,design){
 if(AC.cached[id])return AC.cached[id];
 try{
  if(!app.isDocumentOpen()||!app.project.rootItem)throw Error('Zuerst ein Projekt öffnen.');
  if(targetProject&&app.project.name!==targetProject)throw Error('Aktives Projekt wurde gewechselt.');
  var items=[],i,t,c;
  for(i=0;i<sources.length;i++){
   var source=sources[i];if(!(new File(source.path)).exists)throw Error('Eine MP4 fehlt.');
   if(!source.playback||source.playback.end<=source.playback.start)throw Error('MP4-Wiedergabebereich fehlt.');
   var offset=Number(source.syncOffset);if(!isFinite(offset)||offset<0||offset>180)throw Error('Ungültiger Synchronisationsversatz.');
   var item=AC.findMedia(app.project.rootItem,source.path);
   if(!item){if(!app.project.importFiles([source.path],true,app.project.rootItem,false))throw Error('MP4-Import fehlgeschlagen.');item=AC.findMedia(app.project.rootItem,source.path);}
   if(!item)throw Error('Importierte MP4 fehlt.');items.push(item);
  }
  var seq=AC.queueSequence(items[0],sources[0].path,sources[0].sequenceKey,sources[0].sequenceId);
  var populated=false;
  for(t=0;t<seq.videoTracks.numTracks;t++)for(c=0;c<seq.videoTracks[t].clips.numItems;c++){
   var seed=seq.videoTracks[t].clips[c];if(!seed.projectItem||!AC.sameMediaPath(seed.projectItem.getMediaPath(),sources[0].path))populated=true;
  }
  // createNewSequenceFromClips inserts a seed clip. Remove it without rippling.
  if(!populated){
   for(t=0;t<seq.videoTracks.numTracks;t++)for(c=seq.videoTracks[t].clips.numItems-1;c>=0;c--)seq.videoTracks[t].clips[c].remove(false,false);
   for(t=0;t<seq.audioTracks.numTracks;t++)for(c=seq.audioTracks[t].clips.numItems-1;c>=0;c--)seq.audioTracks[t].clips[c].remove(false,false);
   AC.ensureSyncTracks(seq,sources.length,sources.length);
  }
  for(i=0;i<sources.length;i++){
   var source=sources[i],item=items[i],pb=source.playback,oldIn=item.getInPoint(4),oldOut=item.getOutPoint(4),offset=Number(source.syncOffset);
   try{
    item.setInPoint(pb.start,4);item.setOutPoint(pb.end,4);
    if(!AC.timelineClip(seq,source.path))seq.overwriteClip(item,String(offset),i,i);
    var placed=AC.timelineClip(seq,source.path);
    if(!placed||Math.abs(placed.start.seconds-offset)>1/30||Math.abs(placed.inPoint.seconds-pb.start)>1/15||Math.abs(placed.outPoint.seconds-pb.end)>1/15)throw Error('Premiere hat die synchronisierte Position nicht bestätigt.');
    if(seq.videoTracks[i].clips.numItems!==1||!AC.sameMediaPath(seq.videoTracks[i].clips[0].projectItem.getMediaPath(),source.path))throw Error('Ansicht liegt nicht auf ihrer eigenen Videospur.');
    var audio=seq.audioTracks[i],found=false;
    for(c=0;c<audio.clips.numItems;c++){var ac=audio.clips[c];if(ac.projectItem&&AC.sameMediaPath(ac.projectItem.getMediaPath(),source.path)&&Math.abs(ac.start.seconds-offset)<=1/30)found=true;}
    if(!found)throw Error('Zugehörige Audiospur wurde nicht bestätigt.');
    var name=String(source.channel||'Twitch')+(source.syncVerified?'':' · Audio-Abgleich prüfen');placed.name=name;
    seq.videoTracks[i].name=String(source.channel||'Ansicht '+(i+1));seq.audioTracks[i].name=String(source.channel||'Audio '+(i+1));
   }finally{item.setInPoint(oldIn.seconds,4);item.setOutPoint(oldOut.seconds,4);}
  }
  AC.addDesign(seq,design);
  // Adding graphics must never shift the synchronized views.
  for(i=0;i<sources.length;i++){var check=AC.timelineClip(seq,sources[i].path);if(!check||Math.abs(check.start.seconds-Number(sources[i].syncOffset))>1/30)throw Error('Die Titelvorlage hat eine Ansicht verschoben. Bitte die Timeline prüfen.');}
  app.project.openSequence(seq.sequenceID);seq.setPlayerPosition('0');if(app.project.path)app.project.save();AC.cached[id]=AC.result(true,AC.projectName(),'');
 }catch(e){try{if(app.project.path)app.project.save();}catch(ignore){}AC.cached[id]=AC.result(false,AC.projectName(),String(e)+' (Zeile '+e.line+')');}
 return AC.cached[id];
};
