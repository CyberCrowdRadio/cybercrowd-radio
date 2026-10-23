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
# order, and the queue plays first. When the queue is
# empty, the folder plays underneath it, shuffled, and
# watches itself for new songs - so the station never
# waits on the keeper, and never stops. Nothing else
# in the DJ touches the folder - every other piece
# plugs into this line.
#

music_queue = request.queue(id="music_queue")
folder_music = playlist(mode="randomize", reload="watch", "/opt/cybercrowd/music")
music = fallback(track_sensitive=false, [music_queue, folder_music])
