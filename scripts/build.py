#!/usr/bin/env python3
"""Create a local runnable macOS or Windows distribution without committing pairing secrets."""
import json, os, secrets, shutil, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from platform_tools import WINDOWS, chrome_executable, ffmpeg, panel_directory
OUT=ROOT/'dist'/'Auto Clipper'

def run(*args):
 subprocess.run([str(a) for a in args],check=True)

def main(destination=None):
 out=OUT if destination is None else Path(destination)
 if sys.platform not in ('darwin','win32'):raise SystemExit('Autoclipper unterstützt macOS und Windows.')
 if WINDOWS:
  try:
   chrome_executable()
   ffmpeg()
   import send2trash
  except (OSError,ImportError) as error:
   raise SystemExit('Windows-Voraussetzungen fehlen. Siehe README. '+str(error))
 else:run('xcrun','--find','swiftc')
 out.mkdir(parents=True,exist_ok=True)
 config=out/'config.json'
 settings=json.loads(config.read_text(encoding='utf-8')) if config.exists() else {'port':18743,'token':secrets.token_urlsafe(32)}
 config.write_text(json.dumps(settings,indent=2)+'\n',encoding='utf-8');os.chmod(config,0o600)
 installed_host=panel_directory()/'host.jsx'
 for folder in ['src','Chrome-Erweiterung','Premiere-Panel','assets','docs']:
  shutil.copytree(ROOT/folder,out/folder,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','.DS_Store'))
  for path in (out/folder).rglob('*'):
   if not path.is_file():continue
   try:text=path.read_text(encoding='utf-8')
   except UnicodeError:continue
   path.write_text(text.replace('__AUTOCLIPPER_TOKEN__',settings['token']).replace("'__AUTOCLIPPER_HOST_JSX__'",json.dumps(str(installed_host))),encoding='utf-8')
 for surface in ('Chrome-Erweiterung','Premiere-Panel'):
  shutil.copy2(out/'src/i18n.js',out/surface/'i18n.js')
 shutil.copy2(out/'src/clip-design.js',out/'Premiere-Panel/clip-design.js')
 if WINDOWS:
  shutil.copy2(ROOT/'packaging/Autoclipper.cmd',out/'Autoclipper.cmd')
 else:
  app=out/'Autoclipper.app'/'Contents';(app/'MacOS').mkdir(parents=True,exist_ok=True);(app/'Resources').mkdir(exist_ok=True)
  shutil.copy2(ROOT/'packaging/Info.plist',app/'Info.plist');shutil.copy2(ROOT/'packaging/Autoclipper.icns',app/'Resources/Autoclipper.icns')
  for source,target,frameworks in [
   ('Autoclipper.swift',app/'MacOS/Autoclipper',['Cocoa','WebKit']),
   ('Trash.swift',out/'src/trash-file',['Foundation']),
   ('face-camera.swift',out/'src/face-camera',['AVFoundation','Vision','ImageIO']),
   ('video-thumbnail.swift',out/'src/video-thumbnail',['AVFoundation','ImageIO']),
   ('sync/audio-envelope.swift',out/'src/sync/audio-envelope',['AVFoundation','AudioToolbox'])]:
   args=['xcrun','swiftc',out/'src'/source,'-o',target]
   for framework in frameworks:args+=['-framework',framework]
   run(*args)
  run('codesign','--force','--deep','--sign','-',out/'Autoclipper.app')
 for name in ['Clips','Projekte']:(out/name).mkdir(exist_ok=True)
 print('\nBuild erstellt:',out)
 print(('Autoclipper.cmd' if WINDOWS else 'Autoclipper.app')+' öffnen, Chrome-Erweiterung entpackt laden und bei Bedarf scripts/install_panel.py ausführen.')

if __name__=='__main__':main()
