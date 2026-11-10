"""Decode the Windows audio window and emit the same envelopes as the macOS helper."""
import json
import math
import struct
import subprocess
import sys
from pathlib import Path


def main(executable, source, start, end, output):
    decoded = subprocess.run(
        [executable, '-nostdin', '-v', 'error', '-ss', start, '-i', source,
         '-t', str(float(end) - float(start)), '-map', '0:a:0', '-ac', '1',
         '-ar', '4000', '-f', 'f32le', 'pipe:1'],
        check=True, stdout=subprocess.PIPE, timeout=25,
    ).stdout
    bands = [[], [], []]
    energy = [0.0, 0.0, 0.0]
    low = mid = 0.0
    alpha_low, alpha_mid = (1 - math.exp(-2 * math.pi * hz / 4000) for hz in (250, 1000))
    for index, (sample,) in enumerate(struct.iter_unpack('<f', decoded), 1):
        low += alpha_low * (sample - low)
        mid += alpha_mid * (sample - mid)
        for band, value in enumerate((low, mid - low, sample - mid)):
            energy[band] += value * value
        if index % 80 == 0:
            for band in range(3):
                bands[band].append(math.log(max(1e-12, energy[band] / 80)))
                energy[band] = 0.0
    if len(bands[0]) < 500:
        raise ValueError('Audiofenster ist zu kurz.')
    Path(output).write_text(json.dumps({'rate': 50, 'bands': bands}))


if __name__ == '__main__':
    main(*sys.argv[1:])
