/* Cybercrowd Radio — edge worker.
   Serves the static station site and the Sonny Daze stream from R2.
   DOES NOT: signup, verification email, accounts — those live in radio-authority. */

/* ---- Sonny Daze stream: serve audio from R2. Bucket IS the playlist. ---- */
const MUSIC_PREFIX = 'full/';
const STATION_EPOCH = new Date('2026-10-14T00:00:00-05:00').getTime();

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
  var k = key.toLowerCase();
  if (k.endsWith('.m4a')) return 'audio/mp4';
  if (k.endsWith('.mp3')) return 'audio/mpeg';
  if (k.endsWith('.wav')) return 'audio/wav';
  if (k.endsWith('.ogg')) return 'audio/ogg';
  if (k.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}
function isAudioKey(key) {
  var k = key.toLowerCase();
  return k.endsWith('.mp3') || k.endsWith('.m4a') || k.endsWith('.wav') || k.endsWith('.ogg') || k.endsWith('.mp4');
}
function estimateDuration(size) {
  var s = Math.round(size / 16000);
  if (s < 30) s = 30;
  if (s > 1200) s = 1200;
  return s;
}
function titleFromKey(key) {
  var name = key.slice(MUSIC_PREFIX.length);
  var dot = name.lastIndexOf('.');
  if (dot > 0) name = name.slice(0, dot);
  return name.replace(/[_-]+/g, ' ').trim() || name;
}
let _rotation = null, _rotationAt = 0;
async function getRotation(env) {
  var now = Date.now();
  if (_rotation && (now - _rotationAt) < 60000) return _rotation;
  var tracks = [], cursor = undefined, n = 0;
  while (true) {
    var res = await env.MEDIA.list({ prefix: MUSIC_PREFIX, cursor: cursor, limit: 1000 });
    for (var i = 0; i < res.objects.length; i++) {
      var o = res.objects[i];
      if (!isAudioKey(o.key)) continue;
      tracks.push({ id: String(n++), title: titleFromKey(o.key), duration: estimateDuration(o.size), key: o.key });
    }
    if (res.truncated) { cursor = res.cursor; } else { break; }
  }
  tracks.sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });
  for (var j = 0; j < tracks.length; j++) tracks[j].id = String(j);
  _rotation = tracks; _rotationAt = now;
  return tracks;
}
function jsonResp(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' },
  });
}
async function nowPlaying(env) {
  var tracks = await getRotation(env);
  if (!tracks.length) return jsonResp({ error: 'no tracks in bucket' }, 503);
  var elapsed = Math.floor((Date.now() - STATION_EPOCH) / 1000);
  var total = 0, i;
  for (i = 0; i < tracks.length; i++) total += tracks[i].duration;
  if (total <= 0) total = 1;
  var pos = ((elapsed % total) + total) % total;
  for (i = 0; i < tracks.length; i++) {
    var d = tracks[i].duration;
    if (pos < d) return jsonResp({ id: tracks[i].id, title: tracks[i].title, offset: pos, duration: d });
    pos -= d;
  }
  return jsonResp({ id: tracks[0].id, title: tracks[0].title, offset: 0, duration: tracks[0].duration });
}
async function streamTrack(request, env, id) {
  var tracks = await getRotation(env);
  var track = tracks[parseInt(id, 10)];
  if (!track) return new Response('Not found', { status: 404 });
  var key = track.key;
  var head = await env.MEDIA.head(key);
  if (!head) return new Response('Not found', { status: 404 });
  var size = head.size, rangeHeader = request.headers.get('range');
  if (rangeHeader) {
    var r = parseRange(rangeHeader, size);
    if (!r) return new Response('Range not satisfiable', { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    var obj = await env.MEDIA.get(key, { range: { offset: r.start, length: r.end - r.start + 1 } });
    var s = obj.range.offset, e = obj.range.offset + obj.range.length - 1;
    var headers = new Headers();
    headers.set('Content-Type', contentTypeFor(key));
    headers.set('Content-Range', 'bytes ' + s + '-' + e + '/' + obj.size);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Length', String(obj.range.length));
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
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
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* Sonny Daze stream routes — served from the R2 bucket, no manifest. */
    if (url.pathname === '/now') {
      return nowPlaying(env);
    }
    if (url.pathname === '/station-id') {
      // The CYBERCROWD RADIO station ID song, for GO LIVE standby loop.
      var tracks = await getRotation(env);
      for (var si = 0; si < tracks.length; si++) {
        if (tracks[si].title.toLowerCase().indexOf('cybercrowd radio') >= 0) {
          return jsonResp({ id: tracks[si].id, title: tracks[si].title, duration: tracks[si].duration });
        }
      }
      return jsonResp({ error: 'no station id found' }, 404);
    }
    if (url.pathname === '/tracks') {
      // Full track list for sequential playback.
      var allTracks = await getRotation(env);
      return jsonResp(allTracks.map(function (t) {
        return { id: t.id, title: t.title, duration: t.duration };
      }));
    }
    var tm = url.pathname.match(/^\/t\/(\d+)$/);
    if (tm) {
      return streamTrack(request, env, tm[1]);
    }

    /* Everything else: the static station site. */
    return env.ASSETS.fetch(request);
  },
};
