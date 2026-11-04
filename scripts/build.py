#!/usr/bin/env python3
"""Create a local runnable macOS distribution without committing pairing secrets."""
import json, os, secrets, shutil, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist'/'Auto Clipper'

def run(*args):
 subprocess.run([str(a) for a in args],check=True)

def main():
 if sys.platform!='darwin':raise SystemExit('Der native Build benötigt macOS und die Xcode Command Line Tools.')
 run('xcrun','--find','swiftc')
 OUT.mkdir(parents=True,exist_ok=True)
 config=OUT/'config.json'
 settings=json.loads(config.read_text()) if config.exists() else {'port':18743,'token':secrets.token_urlsafe(32)}
 config.write_text(json.dumps(settings,indent=2)+'\n');os.chmod(config,0o600)
 installed_host=Path.home()/'Library/Application Support/Adobe/CEP/extensions/de.autoclipper.premiere/host.jsx'
 for folder in ['src','Chrome-Erweiterung','Premiere-Panel','assets','docs','Design-Vorschlag-2','Design-Vorschlag-3']:
  shutil.copytree(ROOT/folder,OUT/folder,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','.DS_Store'))
  for path in (OUT/folder).rglob('*'):
   if not path.is_file():continue
   try:text=path.read_text()
   except UnicodeError:continue
   path.write_text(text.replace('__AUTOCLIPPER_TOKEN__',settings['token']).replace("'__AUTOCLIPPER_HOST_JSX__'",json.dumps(str(installed_host))))
 app=OUT/'Autoclipper.app'/'Contents';(app/'MacOS').mkdir(parents=True,exist_ok=True);(app/'Resources').mkdir(exist_ok=True)
 shutil.copy2(ROOT/'packaging/Info.plist',app/'Info.plist');shutil.copy2(ROOT/'packaging/Autoclipper.icns',app/'Resources/Autoclipper.icns')
 for source,target,frameworks in [
  ('Autoclipper.swift',app/'MacOS/Autoclipper',['Cocoa','WebKit']),
  ('Trash.swift',OUT/'src/trash-file',['Foundation']),
  ('video-thumbnail.swift',OUT/'src/video-thumbnail',['AVFoundation','ImageIO']),
  ('sync/audio-envelope.swift',OUT/'src/sync/audio-envelope',['AVFoundation','AudioToolbox'])]:
  args=['xcrun','swiftc',OUT/'src'/source,'-o',target]
  for framework in frameworks:args+=['-framework',framework]
  run(*args)
 run('codesign','--force','--deep','--sign','-',OUT/'Autoclipper.app')
 for name in ['Clips','Projekte']:(OUT/name).mkdir(exist_ok=True)
 print('\nBuild erstellt:',OUT)
 print('App öffnen, Chrome-Erweiterung entpackt laden und bei Bedarf scripts/install_panel.py ausführen.')

if __name__=='__main__':main()
