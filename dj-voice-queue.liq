#
# CYBERCROWD
#
# LANE:
# LIVE STREAM - OCEAN DROPLET
#
# FILE:
# dj-voice-queue.liq
#
# BUILD LAW:
# 1 FILE
# 1 JOB
# 1 FUNCTION
#
# JOB:
# Be the waiting room for finished voice clips.
#
# FUNCTION:
# Hold voice clips in their own queue, separate from the music
# line. Nothing else - it holds, it does not speak, mix, or time.
#

voice_queue = request.queue(id="voice_queue")
