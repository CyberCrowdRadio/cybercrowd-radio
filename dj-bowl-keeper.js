/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
LIVE STREAM - OCEAN DROPLET

FILE:
dj-bowl-keeper.js

LIVES AT:
/opt/cybercrowd/dj-bowl-keeper.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Keep the fishing bowl.

FUNCTION:
Stand beside the stream and feed the music queue in
30-minute blocks drawn from the bowl, by the CHIME
FORMULA. The bowl is every song in the music folder.
A song that has played leaves the bowl and is written
down in the bowl state, on disk, so a restart of this
file - or of the player - picks the bowl up exactly
where it was. The chime - the station break song - is
divided in half, and each block pulls 30 minutes
minus that half, measured off the WALL CLOCK toward
the next top or half of the hour: the chime starts
early by its half and is sounding, centered, exactly
as the mark strikes. A song playing across the mark
finishes - its end counts as the mark. That is the
chime zone. Every pull is measured fresh off the
wall clock, so an overflow or an underflow corrects
itself at the next mark and never piles up. Blocks
are poured through the stream's own server door, the
chime poured last. When what is left in the bowl
cannot fill a block's pull, that is the full reset:
every song goes back in, the whole bowl is
reshuffled, and the clock restarts. A song this file
cannot measure is set aside for the round and named
in the log - it is never drawn blind. After each
draw, the block plan is written down for the DJ
controller: the block's songs in order, the mark the
block aims at, the chime's length and place, and the
two songs the title intro will name.

If anything fails, the music plays on. Under the music
queue stands the folder itself, playing as it always
has. This file can miss a block; it can never stop the
station.

DOES NOT:
Speak, hold voice clips, or touch the voice queue.
Decide what the DJ says. Change the pool - songs are
only ever read from the folder, never moved or renamed.

Run:
  node dj-bowl-keeper.js

Setup: the music queue must exist - dj-music-queue.liq
carries it. Song lengths are measured with ffprobe,
which must be on the box. The stream's server door must
be open - radio.liq carries settings.server.telnet.
*/

'use strict';

var fs = require('fs');
var net = require('net');
var path = require('path');
var childProcess = require('child_process');

var HOME = '/opt/cybercrowd';
var MUSIC_DIR = path.join(HOME, 'music');
var BREAK_FILE = path.join(HOME, 'break', 'CYBERCROWD RADIO.mp3');
var STATE_FILE = path.join(HOME, 'bowl-state.json');
var PLAN_FILE = path.join(HOME, 'bowl-plan.json');

var SERVER_HOST = '127.0.0.1';
var SERVER_PORT = 1234;
var PUSH_COMMAND = 'music_queue.push';

var BLOCK_SECONDS = 30 * 60;
var POLL_MS = 15000;
var FEED_EARLY_SECONDS = 60;
var MIN_PULL_SECONDS = 60;

var AUDIO_EXTS = ['.mp3', '.m4a', '.aac', '.ogg', '.oga', '.opus', '.flac', '.wav'];

var state = null;
var feeding = false;

function log(line) {
  console.log(new Date().toISOString() + ' [dj-bowl-keeper] ' + line);
}

function emptyState() {
  return { played: [], durations: {}, blocksFed: 0, nextFeedAt: 0, musicStartAt: 0 };
}

function loadState() {
  try {
    var raw = fs.readFileSync(STATE_FILE, 'utf8');
    var parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.played) || !parsed.durations) {
      return emptyState();
    }
    return parsed;
  } catch (e) {
    return emptyState();
  }
}

function saveState() {
  var tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}

function savePlan(plan) {
  var tmp = PLAN_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(plan, null, 2));
  fs.renameSync(tmp, PLAN_FILE);
}

function measure(file) {
  return new Promise(function (resolve) {
    childProcess.execFile(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration',
       '-of', 'default=noprint_wrappers=1:nokey=1', file],
      { timeout: 20000 },
      function (err, stdout) {
        if (err) { resolve(0); return; }
        var seconds = parseFloat(String(stdout).trim());
        resolve(isFinite(seconds) && seconds > 0 ? seconds : 0);
      }
    );
  });
}

function durationOf(file) {
  var name = path.basename(file);
  var size = 0;
  try { size = fs.statSync(file).size; } catch (e) { return Promise.resolve(0); }
  var cached = state.durations[file];
  if (cached && cached.size === size && cached.seconds > 0) {
    return Promise.resolve(cached.seconds);
  }
  return measure(file).then(function (seconds) {
    if (seconds > 0) {
      state.durations[file] = { seconds: seconds, size: size };
    } else {
      log('cannot measure, set aside for this round: ' + name);
    }
    return seconds;
  });
}

function listPool() {
  var names;
  try {
    names = fs.readdirSync(MUSIC_DIR);
  } catch (e) {
    log('cannot read the music folder: ' + e.message);
    return [];
  }
  return names.filter(function (name) {
    return AUDIO_EXTS.indexOf(path.extname(name).toLowerCase()) !== -1;
  });
}

function shuffle(list) {
  var out = list.slice();
  for (var i = out.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

function markAfter(epochMs) {
  var zoneMs = BLOCK_SECONDS * 1000;
  return Math.ceil(epochMs / zoneMs) * zoneMs;
}

// The chime formula, in one place: from the moment this block's
// music starts, find the wall-clock mark it aims at, and how many
// seconds of music to pull so the chime - starting early by half
// its length - is centered on that mark.
function aimBlock(musicStartAt, chimeSeconds) {
  var halfMs = (chimeSeconds * 1000) / 2;
  var mark = markAfter(musicStartAt);
  var pull = (mark - halfMs - musicStartAt) / 1000;
  while (pull < MIN_PULL_SECONDS) {
    mark += BLOCK_SECONDS * 1000;
    pull = (mark - halfMs - musicStartAt) / 1000;
  }
  return { mark: mark, pullSeconds: pull };
}

function pushOne(file) {
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

function drawBlock(pullSeconds) {
  var pool = listPool();
  var unplayed = pool.filter(function (name) {
    return state.played.indexOf(name) === -1;
  });

  function measureAll(names) {
    var seconds = {};
    var chain = Promise.resolve();
    names.forEach(function (name) {
      chain = chain.then(function () {
        return durationOf(path.join(MUSIC_DIR, name)).then(function (s) {
          seconds[name] = s;
        });
      });
    });
    return chain.then(function () { return seconds; });
  }

  return measureAll(unplayed).then(function (seconds) {
    var playable = unplayed.filter(function (name) { return seconds[name] > 0; });
    var setAside = unplayed.filter(function (name) { return !(seconds[name] > 0); });
    var remaining = playable.reduce(function (sum, name) {
      return sum + seconds[name];
    }, 0);

    if (remaining < pullSeconds) {
      log('the bowl cannot fill this pull (' + Math.round(remaining) +
          's left) - FULL RESET: every song back in, clock restarts');
      state.played = [];
      return drawBlock(pullSeconds);
    }

    if (setAside.length) {
      setAside.forEach(function (name) {
        if (state.played.indexOf(name) === -1) state.played.push(name);
      });
    }

    var order = shuffle(playable);
    var block = [];
    var total = 0;
    for (var i = 0; i < order.length && total < pullSeconds; i++) {
      block.push(order[i]);
      total += seconds[order[i]];
    }
    return { block: block, total: total };
  });
}

function feedBlock(drawn, breakSeconds, aim, musicStartAt) {
  var block = drawn.block;
  var files = block.map(function (name) { return path.join(MUSIC_DIR, name); });
  files.push(BREAK_FILE);

  var chain = Promise.resolve(true);
  files.forEach(function (file) {
    chain = chain.then(function (okSoFar) {
      if (!okSoFar) return false;
      return pushOne(file);
    });
  });

  return chain.then(function (allOk) {
    block.forEach(function (name) {
      if (state.played.indexOf(name) === -1) state.played.push(name);
    });
    state.blocksFed += 1;
    var fedAt = Date.now();
    var chimeEndsAt = aim.mark + (breakSeconds * 1000) / 2;
    state.musicStartAt = chimeEndsAt;
    state.nextFeedAt = chimeEndsAt - FEED_EARLY_SECONDS * 1000;
    saveState();

    var introAfter = block.length >= 4
      ? (2 + Math.floor(Math.random() * 2))
      : Math.max(0, block.length - 2);
    if (introAfter > block.length - 2) introAfter = block.length - 2;
    var plan = {
      block: state.blocksFed,
      fedAt: new Date(fedAt).toISOString(),
      musicStartAt: new Date(musicStartAt).toISOString(),
      markAt: new Date(aim.mark).toISOString(),
      chimeSeconds: Math.round(breakSeconds),
      pullSeconds: Math.round(aim.pullSeconds),
      blockSeconds: Math.round(drawn.total),
      songs: block,
      introAfter: introAfter,
      introPair: block.slice(introAfter, introAfter + 2),
      breakFile: BREAK_FILE
    };
    savePlan(plan);
    log('block ' + state.blocksFed + ' fed: ' + block.length +
        ' songs, ' + Math.round(drawn.total) + 's pulled toward the ' +
        new Date(aim.mark).toISOString() + ' mark, then the chime. Bowl holds ' +
        (listPool().length - state.played.length) + ' songs.');
    if (!allOk) {
      log('a push failed during that feed - the folder underneath keeps the station playing; the bowl state above still stands, and those songs return at the reset.');
    }
  });
}

function tick() {
  if (feeding) return;
  if (Date.now() < state.nextFeedAt) return;
  feeding = true;
  durationOf(BREAK_FILE).then(function (breakSeconds) {
    if (breakSeconds <= 0) {
      log('the break song cannot be measured at ' + BREAK_FILE +
          ' - no block fed this round. The folder keeps the station playing.');
      feeding = false;
      return;
    }
    var musicStartAt = state.musicStartAt && state.musicStartAt > Date.now() - 60000
      ? state.musicStartAt
      : Date.now();
    var aim = aimBlock(musicStartAt, breakSeconds);
    return drawBlock(aim.pullSeconds).then(function (drawn) {
      if (!drawn || !drawn.block.length) {
        log('the draw came up empty - no block fed this round.');
        feeding = false;
        return;
      }
      return feedBlock(drawn, breakSeconds, aim, musicStartAt).then(function () {
        feeding = false;
      });
    });
  }).catch(function (e) {
    log('feed failed: ' + e.message + ' - the folder keeps the station playing.');
    feeding = false;
  });
}

function main() {
  state = loadState();
  durationOf(BREAK_FILE).then(function (breakSeconds) {
    if (breakSeconds <= 0) {
      log('ffprobe or the break song is missing - the keeper cannot measure, so it will not draw blind. It will keep checking. Music is untouched.');
    } else {
      log('the keeper is on the bowl. ' + state.played.length +
          ' songs already set aside, ' + state.blocksFed + ' blocks fed.');
    }
    setInterval(tick, POLL_MS);
    tick();
  });
}

main();
