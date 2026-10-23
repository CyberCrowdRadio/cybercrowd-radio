#
# CYBERCROWD
#
# LANE:
# LIVE STREAM - OCEAN DROPLET
#
# FILE:
# dj-music-queue.liq
#
# BUILD LAW:
# 1 FILE
# 1 JOB
# 1 FUNCTION
#
# JOB:
# Be the one place the station's music comes from.
#
# FUNCTION:
# Stand the music queue in front of the music folder.
# The bowl keeper pours each block into the queue, in
# order, and the queue plays first. The switch between
# the queue and the folder is track sensitive - it can
# only happen at the end of a song, never inside one -
# so an empty queue can never cut a song off. When the
# queue is empty, the folder plays underneath it, on the
# same plain line the station runs tonight - so the
# station never waits on the keeper, and never stops.
# Nothing else in the DJ touches the folder - every
# other piece plugs into this line.
#

music_queue = request.queue(id="music_queue")
folder_music = playlist("/opt/cybercrowd/music")
music = fallback(track_sensitive=true, [music_queue, folder_music])
