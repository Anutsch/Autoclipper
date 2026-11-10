"""Read camera frames using bundled FFmpeg, and use OpenCV when installed."""
import base64
import json
import subprocess
import sys
from pathlib import Path

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None


def main(source, start, end, preview, ffmpeg):
    start, end = float(start), float(end)
    fractions = (.12, .3, .5, .7, .88) if cv2 else (.5,)
    detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml') if cv2 else None
    frames = []
    for fraction in fractions:
        at = start + (end-start)*fraction
        base = [ffmpeg, '-nostdin', '-v', 'error', '-ss', str(at), '-i', source,
                '-frames:v', '1', '-vf', 'scale=640:640:force_original_aspect_ratio=decrease']
        if not frames:
            subprocess.run(base + ['-y', preview], check=True, timeout=8)
        if detector is None or detector.empty():
            continue
        pgm = subprocess.check_output(base + ['-f', 'image2pipe', '-c:v', 'pgm', 'pipe:1'], timeout=6)
        _, dimensions, _, pixels = pgm.split(b'\n', 3)
        width, height = map(int, dimensions.split())
        image = np.frombuffer(pixels, dtype=np.uint8).reshape(height, width)
        faces = [[x/width, y/height, w/width, h/height]
                 for x,y,w,h in detector.detectMultiScale(image, minNeighbors=6, minSize=(16,16))]
        frames.append(dict(width=width,height=height,pixels=base64.b64encode(pixels).decode(),faces=faces))
    if not Path(preview).is_file():
        raise ValueError('No preview generated.')
    print(json.dumps(frames))


if __name__ == '__main__':
    main(*sys.argv[1:])
