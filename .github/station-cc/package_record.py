"""Build a complete caption and audio fingerprint document for a catalog revision."""
import base64
import json
import html
from pathlib import Path
import subprocess
import sys

import numpy as np

RATE = 44100
SIZE = 2048
HOP = 2756
EDGES = [100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300]


def seconds(stamp):
    hours, minutes, secs = stamp.split(":")
    return int(hours) * 3600 + int(minutes) * 60 + float(secs)


def build(audio_file, caption_file):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", audio_file, "-map", "0:a:0",
                                   "-ac", "1", "-ar", str(RATE), "-f", "f32le", "-"])
    audio = np.frombuffer(raw, dtype="<f4")
    frames = np.lib.stride_tricks.sliding_window_view(audio, SIZE)[::HOP]
    frequency = np.fft.rfftfreq(SIZE, 1 / RATE)
    bins = np.searchsorted(frequency, EDGES)
    spectrum = np.abs(np.fft.rfft(frames * np.blackman(SIZE + 1)[:-1]))
    bands = np.stack([spectrum[:, a:b].max(axis=1) for a, b in zip(bins, bins[1:])], axis=1)
    db = 20 * np.log10(np.maximum(bands, 1e-8))
    encoded = np.rint(np.clip(db - db.max(axis=1, keepdims=True), -63, 0)).astype(np.int8)
    cues = []
    for block in Path(caption_file).read_text().strip().split("\n\n")[1:]:
        interval, text = block.split("\n", 1)
        start, end = map(seconds, interval.split(" --> "))
        cues.append([start, end, html.unescape(text)])
    return {"fingerprint": base64.b64encode(encoded.tobytes()).decode(), "cues": cues}


if __name__ == "__main__":
    Path(sys.argv[3]).write_text(json.dumps(build(sys.argv[1], sys.argv[2]), separators=(",", ":")))
