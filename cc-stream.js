/* CC Stream Player — live streaming receiver. 2026-10-16.
 * James: "Make it live streaming" / "Build itt" / "Allowed"
 *
 * This is a STREAM RECEIVER, not a playlist player.
 * It connects to ONE stream URL and plays it continuously.
 * Like cyberradio.net — one flow, no track skipping, no dead tracks.
 *
 * James provides the stream URL (his Cloudflare lane).
 * Set it in config.js as STREAM_URL, or call CCStream.setUrl(url).
 *
 * DOES: connect, play, pause, volume, ON AIR indicator, lock screen.
 * DOES NOT: track lists, skipping, DJ chatter, playlist logic.
 */

(function () {
  "use strict";

  var audio = null;
  var streamUrl = null;
  var isPlaying = false;

  // Get URL from config, or from a previous setUrl call
  function getUrl() {
    if (streamUrl) return streamUrl;
    if (window.CCConfig && window.CCConfig.STREAM_URL) {
      return window.CCConfig.STREAM_URL;
    }
    try {
      var saved = localStorage.getItem('cc-stream-url');
      if (saved) return saved;
    } catch (_) {}
    return null;
  }

  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'none';

    audio.addEventListener('playing', function () {
      isPlaying = true;
      updateUI(true);
      updateMediaSession();
    });
    audio.addEventListener('pause', function () {
      isPlaying = false;
      updateUI(false);
    });
    audio.addEventListener('error', function () {
      isPlaying = false;
      updateUI(false);
      setStatus('Stream error — retrying…');
      // Auto-retry in 5s
      setTimeout(function () {
        if (!isPlaying) play();
      }, 5000);
    });
    // If stream stalls, retry
    audio.addEventListener('stalled', function () {
      setTimeout(function () {
        if (audio && audio.paused && isPlaying) {
          audio.load();
          audio.play().catch(function () {});
        }
      }, 3000);
    });

    return audio;
  }

  function play() {
    var url = getUrl();
    if (!url) {
      setStatus('No stream URL set');
      return;
    }
    var a = ensureAudio();
    if (a.src !== url) {
      a.src = url;
      a.load();
    }
    a.play().then(function () {
      isPlaying = true;
      updateUI(true);
    }).catch(function (e) {
      setStatus('Tap play to start');
    });
  }

  function pause() {
    if (audio) {
      audio.pause();
      // For live streams, fully unload to stop buffering
      audio.removeAttribute('src');
      audio.load();
    }
    isPlaying = false;
    updateUI(false);
  }

  function toggle() {
    if (isPlaying) pause();
    else play();
  }

  function setVolume(v) {
    var a = ensureAudio();
    a.volume = Math.max(0, Math.min(1, v));
    try { localStorage.setItem('cc-volume', a.volume); } catch (_) {}
  }

  function getVolume() {
    if (audio) return audio.volume;
    try {
      var v = parseFloat(localStorage.getItem('cc-volume'));
      return isNaN(v) ? 0.9 : v;
    } catch (_) { return 0.9; }
  }

  function setUrl(url) {
    streamUrl = url;
    try { localStorage.setItem('cc-stream-url', url); } catch (_) {}
    // If currently playing, reconnect to new URL
    if (isPlaying) {
      pause();
      setTimeout(play, 500);
    }
  }

  function setStatus(t) {
    var el = document.getElementById('streamStatus');
    if (el) el.textContent = t;
  }

  function updateUI(playing) {
    // ON AIR badge
    var badges = document.querySelectorAll('.on-air-badge');
    badges.forEach(function (b) {
      b.classList.toggle('live', playing);
      b.textContent = playing ? '● ON AIR' : '○ OFF AIR';
    });
    // Play/pause buttons
    var btns = document.querySelectorAll('[data-stream-toggle]');
    btns.forEach(function (b) {
      b.textContent = playing ? '❚❚' : '▶';
      b.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    });
    setStatus(playing ? 'Live' : 'Paused');
  }

  function updateMediaSession() {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Cybercrowd Radio',
        artist: 'Sonny Daze',
        album: 'Live 24/7',
      });
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
    } catch (_) {}
  }

  // Wire up any [data-stream-toggle] buttons and #streamVol sliders on the page
  function wireUI() {
    document.querySelectorAll('[data-stream-toggle]').forEach(function (btn) {
      btn.addEventListener('click', toggle);
    });
    var vol = document.getElementById('streamVol');
    if (vol) {
      vol.value = getVolume() * 100;
      vol.addEventListener('input', function () {
        setVolume(vol.value / 100);
      });
      // Init volume
      setVolume(vol.value / 100);
    }
  }

  window.CCStream = {
    play: play,
    pause: pause,
    toggle: toggle,
    setUrl: setUrl,
    setVolume: setVolume,
    getVolume: getVolume,
    isPlaying: function () { return isPlaying; },
    getUrl: getUrl,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireUI);
  } else {
    wireUI();
  }
})();
