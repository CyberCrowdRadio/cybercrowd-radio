#!/usr/bin/env bash
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
# dj-pull.sh
#
# LIVES AT:
# /usr/local/bin/dj-pull.sh
#
# BUILD LAW:
# 1 FILE
# 1 JOB
# 1 FUNCTION
#
# JOB:
# Keep the box's stream files equal to the repo's.
#
# FUNCTION:
# Fetch the tracked files from the repo into a staging folder.
# Compare each one against the copy live on the box. Swap in
# only what changed: the .liq set goes to /etc/liquidsoap and
# restarts the stream; the tool set goes to /opt/cybercrowd
# and restarts the DJ controller. If any download fails, swap
# nothing and leave the last good set running. If Node is
# missing, install it once so the controller can run.
#
# The pull does not pull itself. A new version of this file is
# fetched by hand, the same way the first one was.
#
# Run by dj-pull.timer every 5 minutes, or by hand:
#   /usr/local/bin/dj-pull.sh
#

set -u
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

REPO_RAW="https://raw.githubusercontent.com/CyberCrowdRadio/cybercrowd-radio/main"
LIQ_DIR="/etc/liquidsoap"
TOOL_DIR="/opt/cybercrowd"

LIQ_FILES="radio.liq dj-music-queue.liq dj-voice-queue.liq dj-timing.liq dj-ducking.liq dj-backup.liq dj-broadcast.liq"
TOOL_FILES="dj-speech-writer.js dj-voice-maker.py dj-controller.js"

say() {
  echo "[dj-pull] $1"
}

# One pull at a time; if one is already running, step aside.
exec 9>/var/lock/dj-pull.lock
if ! flock -n 9; then
  exit 0
fi

STAGE="$(mktemp -d /tmp/dj-pull.XXXXXX)"
trap 'rm -rf "$STAGE"' EXIT

# Fetch the whole tracked set first. Any failure changes nothing.
for f in $LIQ_FILES $TOOL_FILES; do
  if ! curl -fsSL --max-time 30 "$REPO_RAW/$f" -o "$STAGE/$f" || [ ! -s "$STAGE/$f" ]; then
    say "download failed for $f - nothing changed"
    exit 0
  fi
done

changed() {
  # $1 = staged file, $2 = live file
  if [ ! -f "$2" ]; then
    return 0
  fi
  [ "$(sha256sum "$1" | cut -d' ' -f1)" != "$(sha256sum "$2" | cut -d' ' -f1)" ]
}

liq_changed=0
for f in $LIQ_FILES; do
  if changed "$STAGE/$f" "$LIQ_DIR/$f"; then
    liq_changed=1
  fi
done

tools_changed=0
for f in $TOOL_FILES; do
  if changed "$STAGE/$f" "$TOOL_DIR/$f"; then
    tools_changed=1
  fi
done

# Nothing changed: leave quietly.
if [ "$liq_changed" -eq 0 ] && [ "$tools_changed" -eq 0 ]; then
  exit 0
fi

# The controller needs Node. Install it once, the first time.
if ! command -v node >/dev/null 2>&1; then
  say "node is missing - installing nodejs"
  if apt-get update -qq && apt-get install -y -qq nodejs; then
    say "nodejs installed"
  else
    say "nodejs install FAILED - the DJ controller cannot start yet"
  fi
fi

if [ "$liq_changed" -eq 1 ]; then
  for f in $LIQ_FILES; do
    cp -f "$STAGE/$f" "$LIQ_DIR/$f"
    say "updated stream file: $f"
  done
  systemctl restart liquidsoap-radio.service
  say "liquidsoap-radio restarted"
fi

if [ "$tools_changed" -eq 1 ]; then
  for f in $TOOL_FILES; do
    cp -f "$STAGE/$f" "$TOOL_DIR/$f"
    say "updated tool file: $f"
  done
  if systemctl cat dj-controller.service >/dev/null 2>&1; then
    systemctl restart dj-controller.service
    say "dj-controller restarted"
  fi
fi

exit 0
