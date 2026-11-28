# File repo: CyberCrowdRadio/radio-authority
# File name: tools/transcribe_record.py
# Movements: Generate timed captions from a recording with optional vocal separation.
# Purpose: Produce one complete caption file for a recording.
# Does NOT: Start, stop, or reconfigure the live broadcast.
"""Transcribe a recording into a complete WebVTT caption track.

Requires ffmpeg, numpy, scipy, onnxruntime and faster-whisper.
Usage: python transcribe_record.py recording.mp3 captions.vtt --separator MODEL.onnx
The optional separator is UVR-MDX-NET-Inst_HQ_3.onnx from TRvlvr/model_repo.
Use --model to select a local CTranslate2 Whisper model or a supported model ID.
"""
import argparse
import html
import os
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel
from scipy import signal


def vocal_chunks(stereo, separator, threads):
    import onnxruntime as ort

    options = ort.SessionOptions()
    options.intra_op_num_threads = threads
    options.enable_cpu_mem_arena = False
    options.enable_mem_pattern = False
    session = ort.InferenceSession(str(separator), options, providers=["CPUExecutionProvider"])
    model_input = session.get_inputs()[0]
    if model_input.shape[1:] != [4, 3072, 256]:
        raise ValueError("Expected the UVR-MDX-NET-Inst_HQ_3 instrumental model")
    width = 255 * 1024
    margin = 12 * 1024
    
    for position in range(0, stereo.shape[1], width - 2 * margin):
        start = position - margin
        chunk = np.zeros((2, width), dtype=np.float32)
        available = stereo[:, max(0, start):start + width]
        offset = max(0, -start)
        chunk[:, offset:offset + available.shape[1]] = available
        _, _, spectrum = signal.stft(chunk, nperseg=6144, noverlap=5120, padded=False)
        scaled = spectrum[:, :3072] * 3072
        features = np.stack((scaled.real, scaled.imag), axis=1).reshape(1, 4, 3072, 256)
        features[:, :, :3] = 0
        result = session.run(None, {model_input.name: features})[0].reshape(2, 2, 3072, 256)
        instrumental = np.zeros_like(spectrum)
        instrumental[:, :3072] = (result[:, 0] + 1j * result[:, 1]) / 3072
        _, backing = signal.istft(instrumental, nperseg=6144, noverlap=5120)
        vocals = (chunk - 1.022 * backing)[:, margin:-margin]
        yield vocals[:, :stereo.shape[1] - position].mean(axis=0)


def stamp(seconds):
    minutes, millis = divmod(round(seconds * 1000), 60000)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02}:{minutes:02}:{millis // 1000:02}.{millis % 1000:03}"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("recording", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--separator", type=Path)
    parser.add_argument("--model", default="turbo")
    parser.add_argument("--threads", type=int, default=4)
    args = parser.parse_args()
    if args.output.resolve() == args.recording.resolve() or args.output.suffix.lower() != ".vtt":
        parser.error("Choose a separate .vtt output path")
    rate, channels = (44100, 2) if args.separator else (16000, 1)
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(args.recording),
                                   "-map", "0:a:0", "-ac", str(channels), "-ar", str(rate),
                                   "-f", "f32le", "-"])
    audio = np.frombuffer(raw, dtype="<f4")
    if args.separator:
        mono = np.concatenate(list(vocal_chunks(audio.reshape(-1, 2).T, args.separator, args.threads)))
        audio = signal.resample_poly(mono, 160, 441)
    model = WhisperModel(args.model, device="cpu", compute_type="int8", cpu_threads=args.threads)
    segments, _ = model.transcribe(audio, task="transcribe", word_timestamps=True,
                                   condition_on_previous_text=False, beam_size=5)
    cues = ["WEBVTT"]
    for part in segments:
        words = part.text.strip()
        if words and part.end > part.start:
            cues.append(f"{stamp(part.start)} --> {stamp(part.end)}\n{html.escape(words, quote=False)}")
    if len(cues) == 1:
        raise SystemExit("No words detected")
    with tempfile.NamedTemporaryFile(dir=args.output.parent, delete=False) as staged:
        try:
            staged.write(("\n\n".join(cues) + "\n").encode("utf-8"))
            staged.flush()
            os.fsync(staged.fileno())
            os.replace(staged.name, args.output)
        finally:
            Path(staged.name).unlink(missing_ok=True)


if __name__ == "__main__":
    main()

