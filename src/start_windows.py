"""Start the local service and open its dashboard in a Chrome app window."""
import json
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from platform_tools import chrome_executable, show_app

ROOT = Path(__file__).resolve().parents[1]


def check_server(config, root=ROOT):
    request = Request(f"http://127.0.0.1:{config['port']}/api/state",
                      headers={'X-Autoclipper-Token': config['token']})
    try:
        with urlopen(request, timeout=1) as response:
            state = json.load(response)
    except HTTPError as error:
        raise RuntimeError('Der lokale Port ist belegt oder gehört zu einem anderen Autoclipper-Build.') from error
    except (URLError, TimeoutError):
        return False
    if Path(state.get('root', '')).resolve() != root.resolve():
        raise RuntimeError('Auf diesem Port läuft ein anderer Autoclipper-Build.')
    return True


def main():
    config = json.loads((ROOT / 'config.json').read_text(encoding='utf-8'))
    chrome_executable()
    if not check_server(config):
        with (ROOT / 'app.log').open('ab') as log:
            service = subprocess.Popen([sys.executable, str(ROOT / 'src/server.py')],
                                       stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                                       creationflags=subprocess.CREATE_NO_WINDOW)
        deadline = time.monotonic() + 10
        while not check_server(config):
            if service.poll() is not None or time.monotonic() >= deadline:
                raise RuntimeError('Der lokale Dienst konnte nicht starten. Details stehen in app.log.')
            time.sleep(.15)
    show_app(ROOT, config['port'])


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        sys.exit(str(error))
