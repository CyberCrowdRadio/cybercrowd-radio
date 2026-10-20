#!/usr/bin/env python3
#
# CYBERCROWD
#
# REPO:
# CyberCrowdRadio/cybercrowd-radio
#
# LANE:
# LIVE STREAM - OCEAN DROPLET
#
# FILE:
# dj-voice-maker.py
#
# BUILD LAW:
# 1 FILE
# 1 JOB
# 1 FUNCTION
#
# JOB:
# Turn the DJ's finished words into a voice clip.
#
# FUNCTION:
# Given the exact words, generate one MP3 in the DJ's voice -
# the female voice. Runs in the background, ahead of time.
# On failure it saves nothing and the music plays on.
#
# Run:
#   python3 dj-voice-maker.py "You're listening to Cybercrowd Radio." --out kinetic.mp3
# Setup: OPENAI_API_KEY must be set on the server. The key never
# lives in this file. Voice can be changed in one place:
# the KINETIC_TTS_VOICE setting. Her performance direction
# lives in one place: DJ_DIRECTION below.
#
import argparse
import json
import os
from pathlib import Path
import sys
import tempfile
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

DJ_DIRECTION = (
    "Voice: a woman in her thirties with grit in her throat - a late-night "
    "FM rock DJ with Joan Jett attitude, warm and a little wild. "
    "Delivery: fast, loose, and grinning, talking to one friend at 2 a.m., "
    "never reading a script. Punch the words that matter and mean the howl. "
    "Never sound like an announcer, a robot, or a voicemail menu."
)


def generate_voice(text, output="kinetic.mp3", *, voice=None, model=None):
    """Generate one MP3; return its Path only after a complete successful write.

    Call from a background worker before the announcement is due on air.
    On failure, let the station continue music without this announcement.
    """
    text = text.strip()
    if not text:
        raise ValueError("Announcement text cannot be empty.")
    if len(text) > 4096:
        raise ValueError("Keep each announcement at or below 4096 characters.")
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        raise RuntimeError("Set OPENAI_API_KEY on your server first.")
    destination = Path(output)
    if destination.suffix.lower() != ".mp3":
        raise ValueError("Output filename must end in .mp3.")
    payload = {
        "model": model or os.environ.get("KINETIC_TTS_MODEL", "gpt-4o-mini-tts"),
        "voice": voice or os.environ.get("KINETIC_TTS_VOICE", "nova"),
        "input": text,
        "response_format": "mp3",
    }
    if payload["model"] == "gpt-4o-mini-tts":
        payload["instructions"] = DJ_DIRECTION
    request = Request(
        "https://api.openai.com/v1/audio/speech",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": "Bearer " + key,
                 "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=90) as response:
            audio = response.read()
    except HTTPError as exc:
        raise RuntimeError(
            "Voice API returned HTTP %s. Check API access, billing, model, "
            "and voice settings. No new audio was saved." % exc.code
        ) from None
    except (URLError, TimeoutError) as exc:
        raise RuntimeError("Voice service connection failed; keep music playing.") from None
    if not audio:
        raise RuntimeError("Voice service returned empty audio.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=destination.parent, suffix=".tmp", delete=False) as f:
            temporary = Path(f.name)
            f.write(audio)
        os.replace(temporary, destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return destination


def main():
    parser = argparse.ArgumentParser(description="Generate the DJ's speech on the server, in her voice.")
    parser.add_argument("text", help="The exact announcement to speak")
    parser.add_argument("--out", default="kinetic.mp3", help="Output MP3 path")
    parser.add_argument("--voice", default=None, help="Override the default nova voice")
    parser.add_argument("--model", default=None, help="Override the default gpt-4o-mini-tts model")
    args = parser.parse_args()
    try:
        result = generate_voice(args.text, args.out, voice=args.voice, model=args.model)
    except (ValueError, RuntimeError, OSError) as exc:
        print("Voice generation failed: " + str(exc), file=sys.stderr)
        return 1
    print("Saved: " + str(result.resolve()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
