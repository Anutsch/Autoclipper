"""Initialize the writable Beta installation before running the local service."""
import json
import os
import runpy
import secrets
import shutil
import sys
from pathlib import Path

from platform_tools import acquire_lock, panel_directory


def main(resources, root):
    root.mkdir(parents=True, exist_ok=True)
    # A second launch reuses the original service without touching its files.
    lock = (root / '.bootstrap.lock').open('a+b')
    try:
        acquire_lock(lock)
    except OSError:
        return
    config = root / 'config.json'
    if not config.exists():
        fd = os.open(config, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            json.dump({'port': 18744, 'token': secrets.token_urlsafe(32)}, stream)
    settings = json.loads(config.read_text(encoding='utf-8'))
    for name in ('src', 'Chrome-Erweiterung', 'Premiere-Panel', 'assets'):
        source = resources / 'templates' / name
        target = root / name
        shutil.copytree(source, target, dirs_exist_ok=True)
        for original in source.rglob('*'):
            if original.suffix not in ('.js', '.json', '.html'):
                continue
            content = original.read_text(encoding='utf-8')
            content = content.replace('127.0.0.1:18743', '127.0.0.1:' + str(settings['port']))
            content = content.replace('autoclipper://status', 'autoclipper-beta://status')
            content = content.replace('__AUTOCLIPPER_TOKEN__', settings['token'])
            content = content.replace("'__AUTOCLIPPER_HOST_JSX__'",
                                      json.dumps(str(panel_directory() / 'host.jsx')))
            (target / original.relative_to(source)).write_text(content, encoding='utf-8')
    sys.path.insert(0, str(root / 'src'))
    runpy.run_path(str(root / 'src/server.py'), run_name='__main__')


if __name__ == '__main__':
    main(Path(sys.argv[1]), Path(sys.argv[2]))
