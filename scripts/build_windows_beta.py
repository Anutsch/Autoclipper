#!/usr/bin/env python3
"""Assemble a portable Windows x64 ZIP from pinned, verified components."""
import hashlib
import shutil
import tarfile
import tempfile
import zipfile
from pathlib import Path
from urllib.request import urlretrieve

ROOT = Path(__file__).resolve().parents[1]
VERSION = '1.0.0-beta.1'
PYTHON = 'cpython-3.12.16+20261026-x86_64-pc-windows-msvc-install_only_stripped.tar.gz'
FFMPEG = 'ffmpeg-n9.0.2-48-gd4070a14ce-win64-lgpl-shared-9.0.zip'


def download(folder, name, url, expected):
    file = folder / name
    urlretrieve(url, file)
    if hashlib.sha256(file.read_bytes()).hexdigest() != expected:
        raise ValueError('Prüfsumme stimmt nicht: ' + name)
    return file


def main():
    with tempfile.TemporaryDirectory(prefix='autoclipper-windows-beta-') as temp:
        work = Path(temp)
        stage = work / 'Autoclipper Beta'
        stage.mkdir()
        python = download(work, PYTHON,
                          'https://github.com/astral-sh/python-build-standalone/releases/download/20261026/' + PYTHON,
                          '1f2ab53880fc67ea323398c6388e05af28addc99a8e389209f08a51fdff4b149')
        with tarfile.open(python) as tar:
            entries = tar.getmembers()
            for entry in entries:
                dest = (stage / entry.name).resolve()
                if not dest.is_relative_to(stage.resolve()) or not (entry.isdir() or entry.isfile()):
                    raise ValueError('Unerwarteter Eintrag im Python-Archiv.')
            tar.extractall(stage, members=entries)
        if not any((stage / 'python' / relative).is_file() for relative in ('python.exe', 'install/python.exe')):
            raise ValueError('Die Python-Laufzeit enthält keine python.exe.')
        ffmpeg = download(work, FFMPEG,
                          'https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-11-10-12-39/' + FFMPEG,
                          'cdc19c20aa80d46f78cfc69c8d87430ee34990864e30379db02d1447cd111e83')
        with zipfile.ZipFile(ffmpeg) as archive:
            archive.extractall(work / 'media')
        media, = (work / 'media').iterdir()
        media.rename(stage / 'ffmpeg')
        assert (stage / 'ffmpeg/bin/ffmpeg.exe').is_file()
        trash = download(work, 'Send2Trash.whl',
                         'https://files.pythonhosted.org/packages/40/b0/4562db6223154aa4e22f939003cb92514c79f3d4dccca3444253fd17f902/Send2Trash-1.8.3-py3-none-any.whl',
                         '0c31227e0bd08961c7665474a3d1ef7193929fedda4233843689baa056be46c9')
        with zipfile.ZipFile(trash) as archive:
            archive.extractall(stage / 'vendor')
        for name in ('src', 'Chrome-Erweiterung', 'Premiere-Panel', 'assets'):
            shutil.copytree(ROOT / name, stage / 'templates' / name,
                            ignore=shutil.ignore_patterns('__pycache__', '.DS_Store'))
        shutil.copy2(ROOT / 'packaging/Autoclipper-Beta.cmd', stage / 'Autoclipper-Beta.cmd')
        shutil.copy2(ROOT / 'docs/third-party-windows.md', stage / 'Drittanbieter.md')
        out = ROOT / 'dist' / f'Autoclipper-{VERSION}-Windows-x64'
        out.parent.mkdir(exist_ok=True)
        print(shutil.make_archive(str(out), 'zip', work, stage.name))


if __name__ == '__main__':
    main()
