#!/bin/bash
# Cybercrowd Radio — Server Setup Script
# Run this in your DigitalOcean Web Console as root.
# Installs Icecast2 + Liquidsoap for the true broadcast stream.
#
# WHAT THIS DOES:
# 1. Installs Icecast2 (the transmitter) and Liquidsoap (the DJ software)
# 2. Configures Icecast with passwords YOU set below
# 3. Creates a basic Liquidsoap config that plays music and streams to Icecast
# 4. Sets both to start on boot
#
# WHAT IT DOES NOT DO (yet):
# - Upload your 62 songs (you'll do that next)
# - Set up Kinetic's AI voice (needs your OpenAI key)
#
# SET YOUR PASSWORDS HERE before running:
ICECAST_ADMIN_PASS="ChangeMeAdmin123"
ICECAST_SOURCE_PASS="ChangeMeSource123"
ICECAST_RELAY_PASS="ChangeMeRelay123"

set -e
echo "=== Cybercrowd Radio Server Setup ==="

# 1. Update system
echo "[1/5] Updating system..."
apt update && apt upgrade -y

# 2. Install Icecast2 and Liquidsoap
echo "[2/5] Installing Icecast2 and Liquidsoap..."
apt install -y icecast2 liquidsoap

# 3. Configure Icecast2
echo "[3/5] Configuring Icecast2..."
cp /etc/icecast2/icecast.xml /etc/icecast2/icecast.xml.bak

# Set passwords in icecast.xml
sed -i "s|<admin-password>.*</admin-password>|<admin-password>${ICECAST_ADMIN_PASS}</admin-password>|" /etc/icecast2/icecast.xml
sed -i "s|<source-password>.*</source-password>|<source-password>${ICECAST_SOURCE_PASS}</source-password>|" /etc/icecast2/icecast.xml
sed -i "s|<relay-password>.*</relay-password>|<relay-password>${ICECAST_RELAY_PASS}</relay-password>|" /etc/icecast2/icecast.xml

# Enable Icecast2 to start on boot
sed -i "s/ENABLE=false/ENABLE=true/" /etc/default/icecast2

# 4. Create Liquidsoap config
echo "[4/5] Creating Liquidsoap config..."
mkdir -p /etc/liquidsoap
mkdir -p /var/log/liquidsoap
mkdir -p /opt/cybercrowd/music

cat > /etc/liquidsoap/radio.liq << 'LIQEOF'
# Cybercrowd Radio — Liquidsoap config
# Plays music from /opt/cybercrowd/music, streams to Icecast

# Music playlist (add your MP3s to /opt/cybercrowd/music/)
music = playlist("/opt/cybercrowd/music")

# Fallback: if playlist is empty, play silence (replace with backup audio later)
radio = fallback(track_sensitive=false, [music, blank()])

# Output to Icecast
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
LIQEOF

# Update the source password in the .liq to match
sed -i "s/password=\"ChangeMeSource123\"/password=\"${ICECAST_SOURCE_PASS}\"/" /etc/liquidsoap/radio.liq

# Create systemd service for Liquidsoap
cat > /etc/systemd/system/liquidsoap-radio.service << 'SVCEOF'
[Unit]
Description=Cybercrowd Radio Liquidsoap
After=network.target icecast2.service
Requires=icecast2.service

[Service]
User=root
ExecStart=/usr/bin/liquidsoap /etc/liquidsoap/radio.liq
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF

# 5. Start services
echo "[5/5] Starting services..."
systemctl daemon-reload
systemctl enable icecast2
systemctl enable liquidsoap-radio
systemctl start icecast2
sleep 3
systemctl start liquidsoap-radio

echo ""
echo "=== DONE ==="
echo "Icecast admin: http://YOUR_SERVER_IP:8000/admin (user: admin)"
echo "Stream URL: http://YOUR_SERVER_IP:8000/stream"
echo ""
echo "NEXT STEPS:"
echo "1. Upload your 62 songs to /opt/cybercrowd/music/"
echo "2. Change the passwords in /etc/icecast2/icecast.xml"
echo "3. We'll add Kinetic's voice next"
