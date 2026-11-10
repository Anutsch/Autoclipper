#!/usr/bin/env python3
"""Install the locally built CEP panel, backing up an existing installation."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
from platform_tools import install_panel


if __name__ == '__main__':
    try:
        target = install_panel(ROOT / 'dist/Auto Clipper/Premiere-Panel')
        print('Premiere-Panel installiert:', target)
    except (OSError, ValueError) as error:
        sys.exit(str(error))
