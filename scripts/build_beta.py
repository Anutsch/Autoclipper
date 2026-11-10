#!/usr/bin/env python3
"""Build a self-contained macOS beta ZIP for the current CPU architecture."""
import hashlib
import os
import platform
import plistlib
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.request import urlretrieve

import build

ROOT = build.ROOT
VERSION = '1.0.0-beta.1'
RUNTIME_TAG = '20261026'
RUNTIMES = {
    'arm64': ('aarch64', '353d5f1b4fd2715e7053f12f068435d5bbad16b91e057006b5d01e0925709a7e'),
    'x86_64': ('x86_64', '37c38fda76fec1fbf310adcbafb7f0d96af13b5511bf8ea954c3aa8eec185734'),
}


def main():
    arch = platform.machine()
    if sys.platform != 'darwin' or arch not in RUNTIMES:
        raise SystemExit('Das Beta-Paket muss auf dem passenden Mac gebaut werden.')
    target, checksum = RUNTIMES[arch]
    filename = f'cpython-3.12.16+{RUNTIME_TAG}-{target}-apple-darwin-install_only_stripped.tar.gz'
    url = f'https://github.com/astral-sh/python-build-standalone/releases/download/{RUNTIME_TAG}/{filename}'
    output = ROOT / 'dist' / f'Autoclipper-{VERSION}-macOS-{arch}.zip'
    output.parent.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='autoclipper-beta-') as temp:
        work = Path(temp)
        archive = work / filename
        urlretrieve(url, archive)
        if hashlib.sha256(archive.read_bytes()).hexdigest() != checksum:
            raise SystemExit('Prüfsumme der eingebetteten Python-Laufzeit stimmt nicht.')
        bundle = work / 'Autoclipper Beta.app'
        contents = bundle / 'Contents'
        resources = contents / 'Resources'
        macos = contents / 'MacOS'
        resources.mkdir(parents=True)
        macos.mkdir()
        subprocess.run(['/usr/bin/tar', '-xzf', str(archive), '-C', str(resources)], check=True)
        # The templates are pristine. First launch creates the private token.
        templates = resources / 'templates'
        for name in ('src', 'Chrome-Erweiterung', 'Premiere-Panel', 'assets'):
            shutil.copytree(ROOT / name, templates / name,
                            ignore=shutil.ignore_patterns('__pycache__', '.DS_Store'))
        for src, dest, frameworks in [
            ('Autoclipper.swift', macos / 'Autoclipper', ('Cocoa', 'WebKit')),
            ('Trash.swift', templates / 'src/trash-file', ('Foundation',)),
            ('video-thumbnail.swift', templates / 'src/video-thumbnail', ('AVFoundation', 'ImageIO')),
            ('sync/audio-envelope.swift', templates / 'src/sync/audio-envelope', ('AVFoundation', 'AudioToolbox')),
        ]:
            args = ['xcrun', 'swiftc', str(ROOT / 'src' / src), '-o', str(dest)]
            for framework in frameworks:
                args.extend(('-framework', framework))
            build.run(*args)
        info = plistlib.loads((ROOT / 'packaging/Info.plist').read_bytes())
        info.update(CFBundleIdentifier='de.autoclipper.mac.beta', CFBundleDisplayName='Autoclipper Beta')
        # The beta shares the extension ID with an existing Premiere panel only after opt-in.
        info['CFBundleURLTypes'][0]['CFBundleURLSchemes'] = ['autoclipper-beta']
        (contents / 'Info.plist').write_bytes(plistlib.dumps(info))
        shutil.copy2(ROOT / 'packaging/Autoclipper.icns', resources)
        identity = os.environ.get('AUTOCLIPPER_DEVELOPER_ID')
        profile = os.environ.get('AUTOCLIPPER_NOTARY_PROFILE')
        if bool(identity) != bool(profile):
            raise SystemExit('Für Notarisierung müssen Developer-ID und Notary-Profil gesetzt sein.')
        if identity:
            for path in (resources / 'python').rglob('*'):
                if path.is_file() and not path.is_symlink():
                    kind = subprocess.check_output(['/usr/bin/file', '-b', str(path)], text=True)
                    if 'Mach-O' in kind:
                        build.run('codesign', '--force', '--timestamp', '--options', 'runtime',
                                  '--sign', identity, path)
            for helper in ('trash-file', 'video-thumbnail', 'sync/audio-envelope'):
                build.run('codesign', '--force', '--timestamp', '--options', 'runtime',
                          '--sign', identity, templates / 'src' / helper)
            build.run('codesign', '--force', '--timestamp', '--options', 'runtime',
                      '--sign', identity, bundle)
            notarization_zip = work / 'notarization.zip'
            build.run('ditto', '-c', '-k', '--keepParent', bundle, notarization_zip)
            build.run('xcrun', 'notarytool', 'submit', notarization_zip,
                      '--keychain-profile', profile, '--wait')
            build.run('xcrun', 'stapler', 'staple', bundle)
            build.run('xcrun', 'stapler', 'validate', bundle)
        else:
            build.run('codesign', '--force', '--deep', '--sign', '-', bundle)
        build.run('codesign', '--verify', '--deep', '--strict', bundle)
        build.run('ditto', '-c', '-k', '--sequesterRsrc', '--keepParent', bundle, output)
    print(output)


if __name__ == '__main__':
    main()
