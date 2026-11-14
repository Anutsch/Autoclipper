"""Operating-system operations shared by the service and local build."""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

WINDOWS = sys.platform == 'win32'
PREMIERE_BUNDLE = 'com.adobe.PremierePro.26'


def app_data():
    if WINDOWS:
        return Path(os.environ['APPDATA'])
    return Path.home() / 'Library/Application Support'


def panel_directory():
    return app_data() / 'Adobe/CEP/extensions/de.autoclipper.premiere'


def program_files():
    return [Path(os.environ[key]) for key in ('ProgramW6432', 'ProgramFiles', 'ProgramFiles(x86)')
            if os.environ.get(key)]


def launch_premiere(project=None):
    if not WINDOWS:
        command = ['/usr/bin/open', '-b', PREMIERE_BUNDLE]
        if project:
            command.append(str(project))
        result = subprocess.run(command, capture_output=True, timeout=10)
        if result.returncode:
            raise OSError('Premiere Pro konnte nicht gestartet werden.')
        return
    from editors import running_editors
    running = running_editors().get('premiere')
    if running and project is None:
        return
    installed = sorted(
        (path for base in program_files()
         for path in (base / 'Adobe').glob('Adobe Premiere Pro */Adobe Premiere Pro.exe')),
        reverse=True,
    )
    if not running and not installed:
        raise OSError('Premiere Pro wurde im Adobe-Installationsordner nicht gefunden.')
    command = [str(running or installed[0])]
    if project:
        command.append(str(project))
    return subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def chrome_executable():
    roots = [Path(os.environ['LOCALAPPDATA']), *program_files()]
    for root in roots:
        candidate = root / 'Google/Chrome/Application/chrome.exe'
        if candidate.is_file():
            return str(candidate)
    raise OSError('Google Chrome wurde nicht gefunden.')


def show_app(root, port):
    if WINDOWS:
        command = [chrome_executable(), '--app=http://127.0.0.1:' + str(port)]
    else:
        command = ['/usr/bin/open', os.environ.get('AUTOCLIPPER_APP_PATH', str(root / 'Autoclipper.app'))]
    subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def open_folder(folder):
    if WINDOWS:
        os.startfile(str(folder))
    else:
        subprocess.Popen(['/usr/bin/open', str(folder)])


def reveal_media(paths):
    if WINDOWS:
        # Explorer supports selection of a single file from its command line.
        subprocess.Popen(['explorer.exe', '/select,' + paths[0]])
        return 'MP4s im Explorer bereit · in CapCut hineinziehen.'
    subprocess.run(['/usr/bin/open', '-R', *paths], check=True, timeout=10)
    return 'MP4s im Finder markiert · in CapCut hineinziehen.'


def trash_file(root, path):
    if not WINDOWS:
        return subprocess.run([str(root / 'src/trash-file'), str(path)],
                              capture_output=True, timeout=20).returncode == 0
    from send2trash import send2trash
    send2trash(str(path))
    return True


def ffmpeg():
    executable = shutil.which('ffmpeg')
    if not executable:
        raise OSError('FFmpeg fehlt. Bitte installieren und zum PATH hinzufügen.')
    return executable


def thumbnail_command(root, source, output):
    if not WINDOWS:
        return [str(root / 'src/video-thumbnail'), str(source), str(output)]
    return [ffmpeg(), '-nostdin', '-v', 'error', '-i', str(source), '-map', '0:v:0',
            '-frames:v', '1', '-vf', 'scale=320:180:force_original_aspect_ratio=decrease',
            '-threads', '1', str(output)]


def acquire_lock(file):
    if WINDOWS:
        import msvcrt
        file.seek(0, os.SEEK_END)
        if file.tell() == 0:
            file.write(b'\0')
            file.flush()
        file.seek(0)
        msvcrt.locking(file.fileno(), msvcrt.LK_NBLCK, 1)
    else:
        import fcntl
        fcntl.flock(file, fcntl.LOCK_EX | fcntl.LOCK_NB)

def install_panel(source):
    target = panel_directory()
    if not (source / 'panel.js').is_file():
        raise ValueError('Zuerst einen Autoclipper-Build erstellen.')
    if target.exists():
        backups = app_data() / 'Autoclipper' / 'Panel-Backups'
        backups.mkdir(parents=True, exist_ok=True)
        backup = Path(tempfile.mkdtemp(prefix='premiere-panel-', dir=backups))
        shutil.copytree(target, backup, dirs_exist_ok=True)
    shutil.copytree(source, target, dirs_exist_ok=True)
    return target


def open_chrome_setup(extension):
    if WINDOWS:
        subprocess.Popen([chrome_executable(), 'chrome://extensions/'])
    else:
        subprocess.run(['/usr/bin/open', '-a', 'Google Chrome', 'chrome://extensions/'],
                       check=True, timeout=10)
    open_folder(extension.parent)
