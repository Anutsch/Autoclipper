#!/usr/bin/env python3
"""Install the locally built CEP panel, backing up an existing installation."""
from pathlib import Path
import shutil,time
root=Path(__file__).resolve().parents[1]
source=root/'dist/Auto Clipper/Premiere-Panel'
target=Path.home()/'Library/Application Support/Adobe/CEP/extensions/de.autoclipper.premiere'
if not source.is_dir():raise SystemExit('Zuerst python3 scripts/build.py ausführen.')
if target.exists():
 backup=root/'.build'/('premiere-panel-backup-'+time.strftime('%Y%m%d-%H%M%S'));backup.parent.mkdir(parents=True,exist_ok=True);shutil.copytree(target,backup)
shutil.copytree(source,target,dirs_exist_ok=True)
print('Premiere-Panel installiert:',target)
print('Das Panel in Premiere neu öffnen. Bei erstmaliger Installation ist ggf. ein Premiere-Neustart erforderlich.')
