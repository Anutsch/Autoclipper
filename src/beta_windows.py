"""Start the Windows Beta with the bundled Python and media tools."""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

from platform_tools import chrome_executable, show_app
from start_windows import check_server

RESOURCES = Path(__file__).resolve().parents[2]


def main():
    root = Path(os.environ['LOCALAPPDATA']) / 'Autoclipper' / 'Beta'
    root.mkdir(parents=True, exist_ok=True)
    chrome_executable()
    config = root / 'config.json'

    def ready():
        return config.exists() and check_server(json.loads(config.read_text(encoding='utf-8')), root)

    if not ready():
        env = dict(os.environ, PYTHONPATH=str(RESOURCES / 'vendor'),
                   PATH=str(RESOURCES / 'ffmpeg' / 'bin') + os.pathsep + os.environ.get('PATH', ''))
        with (root / 'app.log').open('ab') as log:
            subprocess.Popen([sys.executable, str(Path(__file__).with_name('beta_bootstrap.py')),
                              str(RESOURCES), str(root)], env=env,
                             creationflags=subprocess.CREATE_NO_WINDOW, stdin=subprocess.DEVNULL,
                             stdout=log, stderr=log)
        deadline = time.monotonic() + 15
        while not ready():
            if time.monotonic() >= deadline:
                raise RuntimeError('Autoclipper konnte nicht starten. Details stehen in ' + str(root / 'app.log'))
            time.sleep(.2)
    show_app(root, 18744)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        sys.exit(str(error))
