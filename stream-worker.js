/* stream-worker.js — Cybercrowd Radio secure streaming Worker
 *
 * ONE JOB: serve audio from R2. Hide the real URLs. Browser is a dumb receiver.
 *
 * Routes:
 *   /t/<opaque-id>  → streams the audio file (Range supported)
 *   /now            → { id, title, offset } — what the station is playing right now
 *
 * Does not: touch the site HTML, the tip jar, billing, or chat.
 * Does not: expose R2 URLs, bucket names, or file paths to the browser.
 */

function parseRange(header, size) {
  var m = header.match(/bytes=(\d*)-(\d*)/);
  if (!m) return null;
  var start = m[1] === '' ? null : parseInt(m[1], 10);
  var end = m[2] === '' ? null : parseInt(m[2], 10);
  if (start === null && end === null) return null;
  if (start === null) { start = size - end; end = size - 1; }
  if (end === null || end >= size) end = size - 1;
  if (start >= size || start > end) return null;
  return { start: start, end: end };
}

function contentTypeFor(key) {
  if (key.endsWith('.m4a')) return 'audio/mp4';
  if (key.endsWith('.mp3')) return 'audio/mpeg';
  if (key.endsWith('.wav')) return 'audio/wav';
  if (key.endsWith('.ogg')) return 'audio/ogg';
  return 'application/octet-stream';
}

// Station epoch — when the 24/7 broadcast "started." Every listener joins
// the same point in the rotation, like tuning a real radio.
var STATION_EPOCH = new Date('2026-10-14T00:00:00-05:00').getTime();

async function nowPlaying(env) {
  // Read the track manifest from KV: ordered list of { id, title, duration }
  var manifest = await env.TRACKS.get('manifest', 'json');
  if (!manifest || !manifest.length) {
    return new Response(JSON.stringify({ error: 'no manifest' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  var now = Date.now();
  var elapsed = Math.floor((now - STATION_EPOCH) / 1000);
  var total = 0, i;
  for (i = 0; i < manifest.length; i++) total += manifest[i].duration || 210;
  if (total <= 0) total = 1;

  var pos = elapsed % total;
  for (i = 0; i < manifest.length; i++) {
    var d = manifest[i].duration || 210;
    if (pos < d) {
      return new Response(JSON.stringify({
        id: manifest[i].id,
        title: manifest[i].title,
        offset: pos,
        duration: d,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    pos -= d;
  }

  // Fallback: first track
  return new Response(JSON.stringify({
    id: manifest[0].id,
    title: manifest[0].title,
    offset: 0,
    duration: manifest[0].duration || 210,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export default {
  async fetch(request, env) {
    var url = new URL(request.url);

    // --- /now: what is the station playing right now? ---
    if (url.pathname === '/now') {
      return nowPlaying(env);
    }

    // --- /t/<opaque-id>: stream the audio ---
    var m = url.pathname.match(/^\/t\/([A-Za-z0-9_-]+)$/);
    if (!m) {
      return new Response('Not found', { status: 404 });
    }

    // Opaque ID → R2 key. The browser never learns the real path.
    var key = await env.TRACKS.get('id:' + m[1]);
    if (!key) {
      return new Response('Not found', { status: 404 });
    }

    var head = await env.MEDIA.head(key);
    if (!head) {
      return new Response('Not found', { status: 404 });
    }

    var size = head.size;
    var rangeHeader = request.headers.get('range');

    if (rangeHeader) {
      var r = parseRange(rangeHeader, size);
      if (!r) {
        return new Response('Range not satisfiable', {
          status: 416,
          headers: { 'Content-Range': 'bytes */' + size },
        });
      }
      var obj = await env.MEDIA.get(key, {
        range: { offset: r.start, length: r.end - r.start + 1 },
      });
      var s = obj.range.offset;
      var e = obj.range.offset + obj.range.length - 1;
      var headers = new Headers();
      headers.set('Content-Type', contentTypeFor(key));
      headers.set('Content-Range', 'bytes ' + s + '-' + e + '/' + obj.size);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Content-Length', String(obj.range.length));
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Access-Control-Allow-Origin', '*');
      // Stream — never buffer. Body streaming does not count toward CPU.
      return new Response(obj.body, { status: 206, headers: headers });
    }

    var full = await env.MEDIA.get(key);
    var fullHeaders = new Headers();
    fullHeaders.set('Content-Type', contentTypeFor(key));
    fullHeaders.set('Accept-Ranges', 'bytes');
    fullHeaders.set('Content-Length', String(full.size));
    fullHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    fullHeaders.set('Access-Control-Allow-Origin', '*');
    return new Response(full.body, { status: 200, headers: fullHeaders });
  },
};
