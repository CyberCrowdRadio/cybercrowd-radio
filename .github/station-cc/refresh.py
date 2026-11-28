"""Process pending R2 recordings and replace the caption catalog after each complete pass."""
import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen

CATALOG = "https://cybercrowdradio.com/tracks"
MEDIA = "https://media.cybercrowdradio.com/"
ROOT = Path(__file__).resolve().parent
OUTPUT = Path("station-captions.json")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--limit", type=int, default=3)
    args = parser.parse_args()
    with urlopen(CATALOG, timeout=30) as response:
        tracks = json.load(response)
    if not isinstance(tracks, list) or not tracks:
        raise ValueError("The station catalog is unavailable")
    published = json.loads(OUTPUT.read_text())
    current = {t["key"]: t for t in tracks if t.get("revision") and t.get("key", "").startswith("full/")}
    if not current:
        raise ValueError("No versioned recordings found")
    pending = sorted((t for k, t in current.items() if published.get(k, {}).get("revision") != t["revision"]),
                     key=lambda t: t.get("uploadedAtMs", 0), reverse=True)
    removed = published.keys() - current.keys()
    if args.check:
        print("yes" if pending or removed else "no")
        return
    from package_record import build
    from urllib.error import URLError
    for key in removed:
        del published[key]
    successes = 0
    for track in pending[:args.limit]:
        try:
            with tempfile.TemporaryDirectory() as folder:
                audio = Path(folder, "recording")
                captions = Path(folder, "captions.vtt")
                with urlopen(MEDIA + quote(track["key"]), timeout=90) as r:
                    tag = r.headers.get("ETag", "").strip('"')
                    if tag != track["revision"]:
                        print("Catalog revision changed", track["key"])
                        continue
                    with audio.open("wb") as f:
                        import shutil
                        shutil.copyfileobj(r, f)
                result = subprocess.run([sys.executable, str(ROOT / "transcribe.py"), str(audio), str(captions),
                                "--model", os.environ["CAPTION_MODEL"], "--separator", os.environ["CAPTION_SEPARATOR"],
                                "--threads", "3"], capture_output=True, text=True)
                if result.returncode:
                    if result.stderr.strip().endswith("No words detected"):
                        captions.write_text("WEBVTT\n")
                    else:
                        raise RuntimeError(result.stderr[-500:])
                published[track["key"]] = dict(build(str(audio), captions), revision=track["revision"])
                successes += 1
                print("Captioned", track["key"], flush=True)
        except (URLError, OSError, RuntimeError, subprocess.SubprocessError) as exc:
            print("Caption processing failed", track["key"], exc, flush=True)
            continue
    if successes or removed:
        stage = OUTPUT.with_suffix(".tmp")
        stage.write_text(json.dumps(published, separators=(",", ":")))
        stage.replace(OUTPUT)


if __name__ == "__main__":
    main()
