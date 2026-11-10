"""Validate optional Premiere overlays and store rendered titles beside projects."""
import base64
import binascii
import hashlib
import math
import os
import shutil
import tempfile
import struct
from pathlib import Path

ASSET_TYPES = {'.mov', '.mp4', '.png', '.jpg', '.jpeg'}
MAX_REQUEST = 3_000_000
MAX_ASSET_BYTES = 512 * 1024 * 1024


def prepare_design(root, data):
    paths = data.get('assets', [])
    if not isinstance(paths, list) or len(paths) > 6:
        raise ValueError('Choose up to six overlay files.')
    assets = []
    for value in paths:
        if not isinstance(value, str) or len(value) > 4096 or '\0' in value:
            raise ValueError('Invalid overlay path.')
        path = Path(value)
        if not path.is_absolute() or path.suffix.lower() not in ASSET_TYPES or not path.is_file():
            raise ValueError('Overlay file missing or unsupported: ' + path.name)
        normalised = str(path.resolve())
        if normalised not in assets:
            assets.append(normalised)

    title = data.get('title', '')
    if not isinstance(title, str) or len(title) > 160:
        raise ValueError('The title can contain up to 160 characters.')
    style = data.get('style', {})
    if not isinstance(style, dict) or len(style) > 16:
        raise ValueError('Invalid title style.')
    duration = data.get('duration', 5)
    if type(duration) not in (int, float) or not math.isfinite(duration) or not 1 <= duration <= 15:
        raise ValueError('Title duration must be between 1 and 15 seconds.')
    design = dict(assets=assets, title=title.strip(), style=style, duration=duration)
    if not design['title']:
        return design

    encoded = data.get('image')
    try:
        if not isinstance(encoded, str):
            raise ValueError()
        image = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error):
        raise ValueError('Could not read the title graphic.') from None
    if (len(image) < 33 or image[:16] != b'\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR'
            or struct.unpack('>II', image[16:24]) != (1080, 1920)):
        raise ValueError('Expected a 1080 × 1920 PNG title.')
    folder = root / 'Projekte' / 'Autoclipper Assets'
    folder.mkdir(parents=True, exist_ok=True)
    name = 'Title-' + hashlib.sha256(image).hexdigest()[:24] + '.png'
    path = folder / name
    if not path.is_file():
        temporary = path.with_suffix('.tmp')
        temporary.write_bytes(image)
        temporary.replace(path)
    design['titlePath'] = str(path)
    return design


def save_asset(root, name, length, stream):
    suffix = Path(name).suffix.lower()
    if suffix not in ASSET_TYPES or not 0 < length <= MAX_ASSET_BYTES:
        raise ValueError('Choose a MOV, MP4, PNG or JPG file up to 512 MB.')
    label = ''.join(char for char in Path(name).stem if char.isalnum() or char in ' _-')[:80]
    folder = root / 'Projekte' / 'Autoclipper Assets' / 'Overlays'
    folder.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    with tempfile.NamedTemporaryFile(dir=folder, delete=False) as temporary:
        temp = Path(temporary.name)
        try:
            remaining = length
            while remaining:
                block = stream.read(min(remaining, 1024 * 1024))
                if not block:
                    raise ValueError('The overlay upload was interrupted.')
                digest.update(block)
                temporary.write(block)
                remaining -= len(block)
            temporary.close()
            path = folder / (digest.hexdigest()[:20] + '-' + (label or 'overlay') + suffix)
            if not path.exists():
                os.replace(temp, path)
            return str(path)
        finally:
            temporary.close()
            temp.unlink(missing_ok=True)


def overlay_paths(design):
    return list(dict.fromkeys([*design.get('assets', []),
                               *([design['titlePath']] if design.get('titlePath') else [])]))


def capcut_folder(root, paths, design, job_id):
    overlays = overlay_paths(design)
    if not overlays:
        return None
    target = root / 'Projekte' / 'CapCut' / job_id
    target.mkdir(parents=True, exist_ok=True)
    groups = [('Clips', paths), ('Overlays', overlays)]
    for group, files in groups:
        folder = target / group
        folder.mkdir(exist_ok=True)
        for index, value in enumerate(files, 1):
            source = Path(value)
            if not source.is_file():
                raise ValueError('Overlay file missing: ' + source.name)
            output = folder / (str(index).zfill(2) + '-' + source.name)
            if output.exists() and output.samefile(source):
                continue
            if output.exists():
                # A previous copy may be in use by CapCut.
                continue
            try:
                os.link(source, output)
            except OSError:
                with tempfile.NamedTemporaryFile(dir=folder, delete=False) as temporary:
                    temp = Path(temporary.name)
                try:
                    shutil.copy2(source, temp)
                    os.replace(temp, output)
                finally:
                    temp.unlink(missing_ok=True)
    return target
