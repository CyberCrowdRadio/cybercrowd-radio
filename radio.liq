#
# CYBERCROWD
#
# LANE:
# LIVE STREAM - OCEAN DROPLET
#
# FILE:
# radio.liq
#
# BUILD LAW:
# 1 FILE
# 1 JOB
# 1 FUNCTION
#
# JOB:
# Be the sequence.
#
# FUNCTION:
# Load the DJ pieces in exact order and start the station.
# It holds no logic of its own - every law lives in its own
# piece. The speech writer and the voice maker are tools the
# box runs beside the stream; they feed the voice queue and
# are not lines in this file.
#

settings.init.allow_root := true

%include "dj-music-queue.liq"
%include "dj-voice-queue.liq"
%include "dj-timing.liq"
%include "dj-ducking.liq"
%include "dj-backup.liq"
%include "dj-broadcast.liq"
