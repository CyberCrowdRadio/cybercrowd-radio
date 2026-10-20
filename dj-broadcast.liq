#
# CYBERCROWD
#
# LANE:
# LIVE STREAM - OCEAN DROPLET
#
# FILE:
# dj-broadcast.liq
#
# BUILD LAW:
# 1 FILE
# 1 JOB
# 1 FUNCTION
#
# JOB:
# Be the tower.
#
# FUNCTION:
# Send the one finished mix - music and DJ together - out to
# Icecast. One feed, every listener on the same show. It
# holds no opinion about what plays; it only carries the
# finished broadcast out.
#

output.icecast(
  %mp3(bitrate=128),
  host="localhost",
  port=8000,
  password="ChangeMeSource123",
  mount="stream",
  name="Cybercrowd Radio",
  description="One channel. Everybody in.",
  genre="Eclectic",
  url="https://cybercrowdradio.com",
  radio
)
