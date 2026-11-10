"""Find a stable facecam border and prepare a centred, silent video crop."""
import base64
import json
import math
import subprocess
import tempfile
import time
from pathlib import Path

from platform_tools import WINDOWS, ffmpeg


def run(command, cancelled, timeout):
    with tempfile.TemporaryFile() as output, tempfile.TemporaryFile() as errors:
        with subprocess.Popen(command, stdout=output, stderr=errors) as process:
            deadline = time.monotonic() + timeout
            while process.poll() is None:
                if cancelled() or time.monotonic() >= deadline:
                    process.kill()
                    raise RuntimeError('Camera analysis stopped or timed out.')
                time.sleep(.1)
            if process.returncode:
                errors.seek(0)
                raise ValueError(errors.read(800).decode(errors='replace') or 'Camera analysis failed.')
        output.seek(0)
        return output.read()


def detect(samples):
    """Require repeated face position and a persistent four-sided border."""
    if len(samples) < 3:
        return None
    width, height = samples[0]['width'], samples[0]['height']
    samples = [sample for sample in samples if (sample['width'], sample['height']) == (width, height)]
    faces = [[face for face in sample['faces'] if .025 < face[2] < .23
              and (face[0]+face[2]/2 < .32 or face[0]+face[2]/2 > .68)] for sample in samples]
    if len(samples) < 3:
        return None
    seed = next((group[0] for group in faces if len(group) == 1), None)
    if not seed:
        return None
    def nearby(face):
        return abs(face[0]-seed[0]) < .055 and abs(face[1]-seed[1]) < .075
    matched = [[face for face in group if nearby(face)] for group in faces]
    if sum(len(group) == 1 for group in matched) < max(3, len(samples)-1):
        return None
    if any(any(not nearby(face) for face in group) for group in faces):
        return None
    x, y, w, h = seed
    left, top, right, bottom = int(x*width), int(y*height), int((x+w)*width), int((y+h)*height)
    pixels = [base64.b64decode(sample['pixels']) for sample in samples]

    def edge(vertical, positions, low, high):
        if high <= low:
            return None
        scores = []
        for pos in positions:
            values = []
            for frame in pixels:
                values.append(sum(abs(frame[k*width+pos] - frame[k*width+pos-1]) if vertical
                                  else abs(frame[pos*width+k] - frame[(pos-1)*width+k])
                                  for k in range(low, high, 2)) / len(range(low, high, 2)))
            scores.append((sorted(values)[len(values)//2], pos))
        if not scores:
            return None
        score, pos = max(scores)
        baseline = sorted(value for value, _ in scores)[len(scores)//2]
        return pos if score >= max(15, baseline*2) else None

    l = edge(True, range(max(1,left-int(.15*width)), left), top, bottom)
    r = edge(True, range(right,min(width,right+int(.15*width))), top, bottom)
    t = edge(False, range(max(1,top-int(.20*height)),top), left,right)
    b = edge(False, range(bottom,min(height,bottom+int(.20*height))),left,right)
    # At a frame boundary there is no edge to measure. Leave it for manual review.
    if None in (l,r,t,b) or not (1.3*w < (r-l)/width < .43 and 1.2*h < (b-t)/height < .55):
        return None
    return [l/width,t/height,(r-l)/width,(b-t)/height]


def playback(source):
    bounds = source.get('playback') or {}
    return str(bounds['start']), str(bounds['end'])


def inspect_camera(root, source, preview, cancelled):
    start, end = playback(source)
    if WINDOWS:
        # The bundled media tools can always provide a frame for manual review.
        import sys
        command = [sys.executable, str(root/'src/face_camera_windows.py'), source['path'], start, end,
                   str(preview), ffmpeg()]
    else:
        command = [str(root/'src/face-camera'), 'inspect', source['path'], start, end, str(preview)]
    return detect(json.loads(run(command, cancelled, 25)))


def make_camera(root, source, crop, output, cancelled):
    start, end = playback(source)
    if WINDOWS:
        x, y, w, h = crop
        filters = f'crop=trunc(iw*{w}/2)*2:trunc(ih*{h}/2)*2:iw*{x}:ih*{y},scale=540:-2'
        command = [ffmpeg(), '-nostdin', '-v', 'error', '-ss', start, '-i', source['path'],
                   '-t', str(float(end)-float(start)), '-map', '0:v:0', '-an', '-vf', filters,
                   '-r', '30', '-c:v', 'mpeg4', '-q:v', '3', str(output)]
    else:
        command = [str(root/'src/face-camera'), 'crop', source['path'], start, end,
                   *map(str,crop), str(output)]
    run(command, cancelled, 90)


def validate_crop(value):
    if (not isinstance(value,list) or len(value)!=4
            or any(type(n) not in (int,float) or not math.isfinite(n) or not 0<=n<=1 for n in value)):
        raise ValueError('Invalid camera crop.')
    x,y,w,h=value
    if w<.04 or h<.04 or x+w>1.000001 or y+h>1.000001:
        raise ValueError('Invalid camera crop.')
    return value
