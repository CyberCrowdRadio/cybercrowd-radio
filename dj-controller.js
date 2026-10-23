/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
LIVE STREAM - OCEAN DROPLET

FILE:
dj-controller.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Feed the voice queue.

FUNCTION:
Stand beside the stream and keep Kinetic talking. Ask the
speech writer for the words, have the voice maker record the
clips ahead of time, and push the finished clips into the
voice queue through the stream's own server door.

Nothing in this file speaks on a clock. There are no timers
here: no opening, no station ID, no between-songs lines fired
by the minute. A song intro is recorded the first time its
song starts - filed on the shelf under the song's own name -
and replayed free every time that song comes around again.
An intro that is not ready inside its window is shelved for
next time: never aired late, never played over the wrong
song, never deleted, never re-bought. A start of this file
buys nothing. A song whose title or artist names an AI music
generator is never announced.

If anything fails, the music plays on. This file can miss a
moment; it can never stop the station.

The sign-off is not used here: it belongs to the GO LIVE
handoff, a separate job.

Run:
  node dj-controller.js
Setup: OPENAI_API_KEY is read from /opt/cc.env on the server;
the key never lives in this file. The stream's server door
must be open - radio.liq carries settings.server.telnet.
*/

'use strict';

var fs = require('fs');
var http = require('http');
var net = require('net');
var path = require('path');
var childProcess = require('child_process');

var HOME = '/opt/cybercrowd';
var VOICE_DIR = path.join(HOME, 'voice');
var WRITER_FILE = path.join(HOME, 'dj-speech-writer.js');
var MAKER_FILE = path.join(HOME, 'dj-voice-maker.py');
var ENV_FILE = '/opt/cc.env';

var SERVER_HOST = '127.0.0.1';
var SERVER_PORT = 1234;
var PUSH_COMMAND = 'voice_queue.push';

var STATUS_URL = 'http://127.0.0.1:8000/status-json.xsl';
var MOUNT = '/stream';
var POLL_MS = 5000;

var INTRO_DEADLINE_MS = 12000;

var BANNED = ['suno', 'sonvia', 'donna'];

var writer = null;
var lastTitle = null;
var introBusy = false;

function log(line) {
  console.log(new Date().toISOString() + ' [dj-controller] ' + line);
}

function loadEnv() {
  var lines;
  try {
    lines = fs.readFileSync(ENV_FILE, 'utf8').split('\n');
  } catch (e) {
    log('cannot read ' + ENV_FILE + ': ' + e.message);
    return;
  }
  lines.forEach(function (line) {
    var cut = line.indexOf('=');
    if (cut > 0) {
      var name = line.slice(0, cut).trim();
      var value = line.slice(cut + 1).trim();
      if (name && !process.env[name]) process.env[name] = value;
    }
  });
}

function makeClip(text, outFile) {
  return new Promise(function (resolve) {
    childProcess.execFile(
      'python3',
      [MAKER_FILE, text, '--out', outFile],
      { env: process.env, timeout: 60000 },
      function (err) {
        if (err) {
          log('voice maker failed (' + path.basename(outFile) + '): ' + err.message);
          resolve(false);
          return;
        }
        resolve(fs.existsSync(outFile));
      }
    );
  });
}

function pushClip(file) {
  return new Promise(function (resolve) {
    var socket = net.createConnection(SERVER_PORT, SERVER_HOST);
    var settled = false;
    function settle(ok, why) {
      if (settled) return;
      settled = true;
      if (why) log(why);
      try { socket.end('quit\r\n'); } catch (e) {}
      resolve(ok);
    }
    socket.setTimeout(5000);
    socket.on('connect', function () {
      socket.write(PUSH_COMMAND + ' ' + file + '\r\n');
    });
    socket.on('data', function (data) {
      log('queue answered: ' + String(data).trim());
      settle(true);
    });
    socket.on('timeout', function () {
      settle(false, 'push timed out: ' + path.basename(file));
      socket.destroy();
    });
    socket.on('error', function (err) {
      settle(false, 'push failed (' + path.basename(file) + '): ' + err.message);
    });
  });
}

function currentTrack() {
  return new Promise(function (resolve) {
    var req = http.get(STATUS_URL, { timeout: 4000 }, function (res) {
      var body = '';
      res.on('data', function (chunk) { body += chunk; });
      res.on('end', function () {
        try {
          var stats = JSON.parse(body);
          var sources = stats.icestats.source;
          if (!sources) { resolve(''); return; }
          if (!Array.isArray(sources)) sources = [sources];
          for (var i = 0; i < sources.length; i++) {
            var s = sources[i];
            if (s && s.listenurl && s.listenurl.indexOf(MOUNT) !== -1) {
              resolve(s.title || '');
              return;
            }
          }
          resolve('');
        } catch (e) {
          resolve('');
        }
      });
    });
    req.on('error', function () { resolve(''); });
    req.on('timeout', function () { req.destroy(); resolve(''); });
  });
}

function splitTrack(title) {
  var cut = title.indexOf(' - ');
  if (cut === -1) return null;
  var artist = title.slice(0, cut).trim();
  var song = title.slice(cut + 3).trim();
  if (!artist || !song) return null;
  var low = (artist + ' ' + song).toLowerCase();
  for (var i = 0; i < BANNED.length; i++) {
    if (low.indexOf(BANNED[i]) !== -1) return null;
  }
  return { artist: artist, song: song };
}

// The shelf name for a song's intro: the song's own name,
// made file-safe, plus a short stable hash of the full
// "artist - song" string. Same song, same file, forever.
function shelfFile(artist, song) {
  var full = artist + ' - ' + song;
  var clean = full.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  var hash = 5381;
  for (var i = 0; i < full.length; i++) {
    hash = ((hash << 5) + hash + full.charCodeAt(i)) >>> 0;
  }
  var hex = ('000000' + hash.toString(16)).slice(-6);
  return path.join(VOICE_DIR, 'intro-' + clean + '-' + hex + '.mp3');
}

function doIntro(title, changeAt) {
  var parts = splitTrack(title);
  if (!parts) {
    log('intro skipped (no clean title/artist): ' + title);
    return;
  }
  introBusy = true;
  var outFile = shelfFile(parts.artist, parts.song);
  if (fs.existsSync(outFile)) {
    pushClip(outFile).then(function (pushed) {
      introBusy = false;
      if (pushed) log('intro on air (shelf): ' + title);
    });
    return;
  }
  var words = writer.words('songIntro', parts.song, parts.artist);
  makeClip(words, outFile).then(function (ok) {
    introBusy = false;
    if (!ok) return;
    if (Date.now() - changeAt > INTRO_DEADLINE_MS) {
      log('intro late, shelved for next time: ' + title);
      return;
    }
    pushClip(outFile).then(function (pushed) {
      if (pushed) log('intro on air (new): ' + title);
    });
  });
}

function poll() {
  currentTrack().then(function (title) {
    if (!title) return;
    if (lastTitle === null) {
      lastTitle = title;
      log('now playing: ' + title);
      return;
    }
    if (title !== lastTitle) {
      var changeAt = Date.now();
      lastTitle = title;
      log('track change: ' + title);
      if (!introBusy) doIntro(title, changeAt);
    }
  });
}

function main() {
  loadEnv();
  if (!process.env.OPENAI_API_KEY) {
    log('OPENAI_API_KEY not found in ' + ENV_FILE + ' - the DJ cannot speak. Music is untouched.');
    return;
  }
  require(WRITER_FILE);
  writer = globalThis.DJSpeech;
  if (!writer || typeof writer.words !== 'function') {
    log('speech writer did not load - the DJ cannot speak. Music is untouched.');
    return;
  }
  log('Kinetic is on air - intros only, no timers.');
  setInterval(poll, POLL_MS);
}

main();
