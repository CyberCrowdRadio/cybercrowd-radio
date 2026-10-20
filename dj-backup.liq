#
# CYBERCROWD
#
# LANE:
# LIVE STREAM - OCEAN DROPLET
#
# FILE:
# dj-backup.liq
#
# BUILD LAW:
# 1 FILE
# 1 JOB
# 1 FUNCTION
#
# JOB:
# No dead air.
#
# FUNCTION:
# Guard the finished mix: if the main line ever runs dry, a
# backup playlist of real songs takes over. Silence is never
# the plan - the last level only keeps the tower connected
# if both music sources are down at once.
#

backup_music = playlist("/opt/cybercrowd/backup")

radio = fallback(track_sensitive=false, [dj_mix, backup_music, blank()])
