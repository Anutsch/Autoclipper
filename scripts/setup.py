#!/usr/bin/env python3
"""Install Autoclipper for the current user and guide Chrome registration."""
import os
import subprocess
import sys
from pathlib import Path

import build
from install_panel import install_panel
from platform_tools import WINDOWS, app_data, chrome_executable


def setup():
    if sys.platform not in ('darwin', 'win32'):
        raise ValueError('Das Setup benötigt macOS oder Windows.')
    data = Path(os.environ['LOCALAPPDATA']) if WINDOWS else app_data()
    destination = data / 'Autoclipper' / 'Installation'
    print('Autoclipper wird hier installiert:', destination, flush=True)
    premiere = input('Premiere-Panel mitinstallieren? [j/N] ').strip().lower() in ('j', 'ja', 'y', 'yes')
    build.main(destination)
    if premiere:
        install_panel(destination / 'Premiere-Panel')

    print('\nChrome einmalig einrichten:')
    print('Entwicklermodus → Entpackte Erweiterung laden → diesen Ordner auswählen:')
    print(destination / 'Chrome-Erweiterung')
    print('\nAutoclipper danach über diesen Starter öffnen:')
    launcher = destination / ('Autoclipper.cmd' if WINDOWS else 'Autoclipper.app')
    print(launcher, flush=True)
    if WINDOWS:
        subprocess.Popen([sys.executable, str(destination / 'src/start_windows.py')])
        subprocess.Popen([chrome_executable(), 'chrome://extensions/'])
    else:
        subprocess.run(['/usr/bin/open', str(launcher)], check=True)
        subprocess.run(['/usr/bin/open', '-a', 'Google Chrome', 'chrome://extensions/'], check=True)
    print('Bei späteren Updates die bestehende Erweiterung auf chrome://extensions neu laden.')


if __name__ == '__main__':
    try:
        setup()
    except (OSError, ValueError, EOFError, subprocess.SubprocessError) as error:
        sys.exit(str(error))
