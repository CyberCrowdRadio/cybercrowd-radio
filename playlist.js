/* playlist.js — Cybercrowd Radio autoplay
 * ONE JOB: play James's songs like a radio station. Hit PLAY, it runs.
 * Suno tracks via embed, Donna tracks via direct audio.
 * Auto-advances. DJ bot talks between songs.
 * Does not: touch the live stream, the request queue.
 */
(function () {
  'use strict';

  var SUNO_TRACKS = [{"title": "CYBERCROWD RADIO", "embed_id": "94d57421-5eba-4e8f-b853-a1a7f02306c8"}, {"title": "CYBERCROWD RADIO", "embed_id": "8bf095de-2e32-4b3a-ba2a-f63249361e3b"}, {"title": "Not For Sale", "embed_id": "726887e1-5ce3-46a8-b07f-d076a4e49c6b"}, {"title": "Still Lethal", "embed_id": "274004e1-671b-4195-b47c-01adc55afca0"}, {"title": "Still Lethal", "embed_id": "bbeb6733-0415-4812-a7cc-52265bc8ca95"}, {"title": "One for Each of You, Darling", "embed_id": "b7e69b90-9115-4ee7-b29c-79de641ec586"}, {"title": "My Mother's Song", "embed_id": "b9e64504-4648-4246-a85f-9b9ebd650f3c"}, {"title": "Truth Gets Dragged In", "embed_id": "63eb2895-f425-455a-bd85-9c966304184f"}, {"title": "BOUND TO BREAK", "embed_id": "7995ba3e-995d-4265-b4b0-4568f9c0de62"}, {"title": "allergic to deceptions!", "embed_id": "51662fce-0bfe-4838-8ed5-aebd3db22017"}, {"title": "I did not come here for you!", "embed_id": "3b595d86-83fe-46ad-857e-34aa66ec40a1"}, {"title": "Please please!", "embed_id": "f2b29d3b-2aae-40bd-a26d-faa6f69a811f"}, {"title": "Finger fucking the phone", "embed_id": "42fbe139-ec9f-4ea0-92fd-e06da95c8c2e"}, {"title": "The Bar of Thoughts", "embed_id": "8ec86d30-0587-4668-af0a-88095c5c633b"}, {"title": "MR. TREE — FULL THROTTLE SPROINK MODE", "embed_id": "61199594-977a-4374-b065-2809b1ab0a28"}, {"title": "Mr. Sun", "embed_id": "1fdef2cc-fa03-4ff7-aa28-93c7c23dfc80"}, {"title": "Mushroom Man", "embed_id": "b931c279-5f16-463d-bd66-31b208db3332"}, {"title": "You Wiggle Like a Puppy", "embed_id": "647b2b8f-656d-410b-b463-2c23353d0b53"}, {"title": "North is North", "embed_id": "e31f5435-e1c1-4808-bf6c-357316e91132"}, {"title": "Paper Cup Moon", "embed_id": "08ea1d3d-16e5-4b8e-85ea-1d29473ca9f0"}, {"title": "Warriors of the Night", "embed_id": "4495ec4d-9a63-49aa-ad67-edc898efaa17"}, {"title": "Young Guns", "embed_id": "e2931e79-2549-42a7-9699-d98a2ca9dc67"}, {"title": "I did not come here for you!", "embed_id": "4814c057-06fd-4fe8-b97f-ddee25c4b724"}, {"title": "Untitled", "embed_id": "93fa1246-05d8-4ced-9927-f7cd52e57c1a"}, {"title": "Paper Cup Moon", "embed_id": "29f3e668-24d3-4734-a4b7-28d6327518be"}, {"title": "BOUND TO BREAK", "embed_id": "d06ca240-172e-4c51-8582-45d5a80d6df7"}, {"title": "scared of dreams", "embed_id": "1d39119c-048f-4384-aded-0e4f6105a64a"}, {"title": "Atomic Kricket", "embed_id": "7f213a7f-ef09-4e42-828b-bdabd50d40b2"}, {"title": "Taxi to Train (Remastered)", "embed_id": "5d6e29fb-fee7-4866-8705-f272c2c63f44"}, {"title": "191.7s Recording (Apr 6 @ 7:38 PM)", "embed_id": "a8b1ad0e-7998-489d-a0c7-ec0f2258656b"}, {"title": "dance of the dancers", "embed_id": "02b78a00-fd8a-4b44-abf8-693c5db4bd03"}, {"title": "GOODNUFF TO HOLD", "embed_id": "2b605440-684f-4ed4-a0f5-c1cf5b495dc5"}, {"title": "GOODNUFF TO HOLD", "embed_id": "d9e5140a-85e9-4b98-8927-fc7379c2298e"}, {"title": "GOODNUFF TO HOLD", "embed_id": "ad2a702f-de6c-49fe-b01c-0dc6168f67b6"}, {"title": "The Reflection They Refuse", "embed_id": "e30fe767-7b8c-447f-9539-9c7fb4287807"}, {"title": "One for Each of You, Darling", "embed_id": "9eeb632a-0779-4e40-b4a5-49a449e59982"}, {"title": "The Reflection They Refuse", "embed_id": "d89c02a0-d7e1-4ffb-9599-eee7bd96c6fa"}, {"title": "One for Each of You, Darling", "embed_id": "f04605ac-61f9-4c30-86ab-a49ba42aeeb2"}, {"title": "whooshing", "embed_id": "95325460-a14d-4dfd-978f-0094ea47114a"}, {"title": "SilentBobb ServerRoom", "embed_id": "c435cc7c-2182-4379-84c0-f8be5129ff22"}, {"title": "Welcome to Outcast clubhouse", "embed_id": "a61be1ae-decf-4f6d-b6b4-5a24e69696c1"}, {"title": "Mother's song", "embed_id": "e22466c2-1d00-4f0e-9728-5b7ac77d8f22"}, {"title": "Taxi to Train (Remastered)", "embed_id": "91d753df-77ca-4254-9abc-4c20760d4fd4"}, {"title": "Another Lie", "embed_id": "125b8075-0431-4f41-9e9e-c4112f62acf2"}, {"title": "Atomic Kricket", "embed_id": "d6a92371-da8f-483a-910d-a16548b2c00c"}, {"title": "Welcome to Outcast clubhouse", "embed_id": "90d2a05a-4d39-4f21-845b-7147a9a3b037"}, {"title": "Pocket Full of Stars", "embed_id": "b196966a-2aaf-4de3-a3fa-3524e8cad9a5"}, {"title": "Finger fucking the phone", "embed_id": "f390552b-351f-42e4-823a-833f39855fc0"}, {"title": "Get in or get gone", "embed_id": "b280bdc7-82bb-4412-85a5-02454b66e111"}, {"title": "My Mother's Song", "embed_id": "2187625c-4e8c-4e5a-9712-af30796de49e"}, {"title": "Taxi to Train", "embed_id": "07192cbb-6b59-4279-b2b3-cbc5c684cc73"}, {"title": "Murder Minded", "embed_id": "a7bf6bf6-42ea-4e40-966a-08c6dda716d1"}, {"title": "99 Nights", "embed_id": "06857090-caf0-474a-bed8-8372f270b591"}, {"title": "Cosmic Jellyfish It", "embed_id": "6ae84559-18da-4421-b62f-82601890b9df"}, {"title": "Another Lie", "embed_id": "0d7ea5eb-adad-4f2d-8840-d5ff58def57c"}];

  var DONNA_TRACKS = [{"title": "Firmament Prison", "audio_url": "https://origin.media.musicdonna.com/audios/6d41b629-e932-47bc-bff4-03ee4a65f660-1751573608454.m4a"}, {"title": "Raising Demons", "audio_url": "https://origin.media.musicdonna.com/audios/d3ec329a-93dc-40e6-a8ef-5b2c25813b8a-1751598239095.m4a"}, {"title": "Flat Earth NASA writes the script", "audio_url": "https://media.musicdonna.com/audios/27b7c1cd-dfab-46f3-b22f-c948b906986f-1751595899072.m4a"}, {"title": "Liquid Sunshine Sonata", "audio_url": "https://origin.media.musicdonna.com/audios/fb763ae2-b06e-48e1-9dcb-d694d4bc5c1c-1751597189088.m4a"}, {"title": "the pick of braille", "audio_url": "https://media.musicdonna.com/audios/822389b5-1a04-4437-98da-f92e63dcb0c5-1751599021372.m4a"}, {"title": "Blue Ice Illusions", "audio_url": "https://origin.media.musicdonna.com/audios/2d2a44d9-97f6-4d49-b83d-c3b3accb82fc-1751609639337.m4a"}, {"title": "alligator alcatraz", "audio_url": "https://content.media.musicdonna.com/audios/073d7940-9153-4ed0-820b-3b3b926e8b0b-1751611019331.m4a"}, {"title": "Brother", "audio_url": "https://media.musicdonna.com/audios/7039e26b-ec68-4136-9a01-887afdc4013d-1751657042543.m4a"}, {"title": "hillbilly heavy metal", "audio_url": "https://media.musicdonna.com/audios/2689b391-3f0f-4ff5-8c55-d29a124db655-1751903735262.m4a"}, {"title": "twinkle twinkle", "audio_url": "https://content.media.musicdonna.com/audios/301f1750-ae84-4441-affc-9516b14a3413-1751927918771.m4a"}, {"title": "Funky Animal Party", "audio_url": "https://media.musicdonna.com/audios/fffc2f6d-2973-4cbb-b8d1-ce2fe2b86801-1751930195681.m4a"}, {"title": "ABC Funk Dance", "audio_url": "https://media.musicdonna.com/audios/fc327046-ec38-41c2-bf42-773d05b85ff4-1753064796123.m4a"}, {"title": "Back and Forth", "audio_url": "https://origin.media.musicdonna.com/audios/d425edb2-f22f-49c8-a4ee-4296546141e1-1753837079322.m4a"}, {"title": "A Genius in Bloom", "audio_url": "https://content.media.musicdonna.com/audios/097a4848-a904-4215-8184-a456635c9b23-1753312716820.m4a"}];

  var queue = [];
  var qi = 0;
  var playing = false;
  var audio = null;
  var sunoTimer = null;
  var playBtn = null;
  var nowEl = null;
  var playerEl = null;

  function normTitle(t) { return (t || '').toLowerCase().trim(); }

  function spreadOut(tracks) {
    var groups = {};
    var i, t, k;
    for (i = 0; i < tracks.length; i++) {
      t = tracks[i];
      k = normTitle(t.track.title);
      if (!groups[k]) groups[k] = [];
      groups[k].push(t);
    }
    var out = [];
    var lastKey = null;
    while (true) {
      var bestKey = null, bestLen = -1, fallbackKey = null, fallbackLen = -1;
      for (k in groups) {
        if (!groups[k].length) continue;
        if (k !== lastKey && groups[k].length > bestLen) { bestLen = groups[k].length; bestKey = k; }
        if (groups[k].length > fallbackLen) { fallbackLen = groups[k].length; fallbackKey = k; }
      }
      if (bestKey === null && fallbackKey === null) break;
      var pick = bestKey !== null ? bestKey : fallbackKey;
      out.push(groups[pick].shift());
      lastKey = pick;
    }
    return out;
  }

  function buildQueue() {
    var all = [];
    var i;
    for (i = 0; i < SUNO_TRACKS.length; i++) all.push({ track: SUNO_TRACKS[i], kind: 'Suno' });
    for (i = 0; i < DONNA_TRACKS.length; i++) all.push({ track: DONNA_TRACKS[i], kind: 'Donna' });
    queue = spreadOut(all);
    qi = 0;
  }

  function sunoEmbed(id) { return 'https://suno.com/embed/' + id; }

  function stopAll() {
    if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
    if (sunoTimer) { clearTimeout(sunoTimer); sunoTimer = null; }
    var frames = playerEl.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) frames[i].remove();
  }

  function setNow(t) { if (nowEl) nowEl.textContent = t; }

  function djSay(fn) {
    if (window.CCRadioAnnouncer && window.CCRadioAnnouncer[fn]) {
      try { window.CCRadioAnnouncer[fn](); } catch (e) {}
    }
  }

  function playCurrent() {
    if (!playing || qi >= queue.length) { stopRadio(); return; }
    var e = queue[qi];
    stopAll();
    setNow('Now playing: ' + e.track.title);
    djSay('trackStarted');
    if (window.CCRadioAnnouncer && window.CCRadioAnnouncer.sayTitle) {
      try { window.CCRadioAnnouncer.sayTitle(e.track.title); } catch (ex) {}
    }
    if (e.kind === 'Suno') {
      var f = document.createElement('iframe');
      f.src = sunoEmbed(e.track.embed_id);
      f.width = '100%'; f.height = '140';
      f.style.borderRadius = '12px';
      f.frameBorder = '0';
      f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      playerEl.appendChild(f);
      // Suno embeds don't fire end events — advance on a timer (3:30 default).
      sunoTimer = setTimeout(nextTrack, 210000);
    } else {
      audio = new Audio(e.track.audio_url);
      audio.addEventListener('ended', nextTrack);
      audio.play().catch(function () { nextTrack(); });
    }
    updateBtn();
  }

  function nextTrack() {
    qi++;
    if (qi >= queue.length) { buildQueue(); } // loop the station
    playCurrent();
  }

  function startRadio() {
    if (!queue.length) buildQueue();
    playing = true;
    djSay('welcome');
    playCurrent();
  }

  function stopRadio() {
    playing = false;
    stopAll();
    setNow('Radio stopped — hit PLAY to start the station.');
    updateBtn();
  }

  function updateBtn() {
    if (playBtn) playBtn.textContent = playing ? 'STOP' : 'PLAY';
  }

  function build() {
    var section = document.getElementById('playlist');
    if (!section) return;
    playerEl = document.getElementById('plPlayer');
    nowEl = document.getElementById('plNow');
    playBtn = document.getElementById('plPlayBtn');
    if (!playerEl || !nowEl) return;
    buildQueue();
    var count = document.getElementById('plCount');
    if (count) count.textContent = queue.length + ' tracks';
    setNow('Hit PLAY — the AI holds it down till Sonny is live.');
    if (playBtn) {
      updateBtn();
      playBtn.addEventListener('click', function () {
        if (playing) stopRadio(); else startRadio();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else { build(); }
})();
