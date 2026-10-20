#
# CYBERCROWD
#
# LANE:
# LIVE STREAM - OCEAN DROPLET
#
# FILE:
# dj-timing.liq
#
# BUILD LAW:
# 1 FILE
# 1 JOB
# 1 FUNCTION
#
# JOB:
# Own the DJ's clock.
#
# FUNCTION:
# Hold the timing laws every other piece obeys - how far ahead
# an introduction must be ready, the fit rule that decides
# whether a voice clip may start, and the thunder law: a
# thunder-marked song gets its full commentary BEFORE it starts
# and nothing over its entry. It writes nothing, voices
# nothing, mixes nothing. It keeps the time.
#

# PREPARE: an introduction must be fully ready this many
# seconds before the song it belongs to begins.
dj_prepare_lead = 30.0

# SPEAK: a clip may start only if it fits inside its window
# with this many seconds to spare.
dj_speak_margin = 2.0

# The fit decision: true means the clip may speak.
def dj_clip_fits(clip_seconds, window_seconds) =
  clip_seconds + dj_speak_margin <= window_seconds
end

# THUNDER: for a thunder-marked song, PREPARE readies a full
# commentary and its moment is BEFORE the song starts - it
# pushes in, finishes, and pushes out, then the song hits
# bare. The entry decision: may a voice play over this song's
# entry? Thunder-marked: never.
def dj_entry_open(thunder_marked) =
  not thunder_marked
end
