#
# CYBERCROWD
#
# LANE:
# LIVE STREAM - OCEAN DROPLET
#
# FILE:
# dj-ducking.liq
#
# BUILD LAW:
# 1 FILE
# 1 JOB
# 1 FUNCTION
#
# JOB:
# Merge the DJ's voice over the music - the freeway merge.
#
# FUNCTION:
# When a voice clip plays, lower the music smooth underneath
# it; when the clip ends, bring the music back to full. No
# hard cuts on either side. When no clip is playing, the
# music passes through untouched.
#

dj_mix = smooth_add(
  normal=music,
  special=voice_queue,
  p={0.15},
  duration=1.0
)
