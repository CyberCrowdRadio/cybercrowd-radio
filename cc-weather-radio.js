/* Repo: cybercrowd-radio | File: cc-weather-radio.js
 * Job: play Kinetic's saved-ZIP forecast inside the existing station receiver.
 * No DOM, banners, windows, browser speech, ZIP prompts, or second station.
 * The common stream continues through a shared 30-second weather bed.
 * Timed HLS metadata supplies the actual heard cue; wall time only preloads.
 */
(function () {
  'use strict';
  var HOST = 'https://stream.cybercrowdradio.com';
  var current = null;
  function token() { try { return localStorage.getItem('ccr-session') || ''; } catch (_) { return ''; } }
  function request(path, body) {
    return fetch(HOST + path, { method: body ? 'POST' : 'GET', cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(body ? 40000 : 8000) })
      .then(function (r) { if (!r.ok) throw new Error('weather-unavailable'); return r.json(); });
  }
  function marker(text) {
    var match = /^CCWX1~(\d{13})~30$/.exec(text || '');
    if (!match || (Number(match[1]) - 1800000) % 10800000) return null;
    return { id: match[1], seconds: 30 };
  }
  // Decode ID3v2.3/v2.4 TIT2 emitted with the actual audio, including UTF-16.
  function titles(bytes) {
    var result = [], view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    function sync(p) { return ((view[p]&127)<<21)|((view[p+1]&127)<<14)|((view[p+2]&127)<<7)|(view[p+3]&127); }
    for (var base=0;base+10<=view.length;base++) {
      if (view[base]!==73 || view[base+1]!==68 || view[base+2]!==51) continue;
      var version=view[base+3], end=Math.min(view.length,base+10+sync(base+6)), p=base+10;
      if (version!==3 && version!==4) continue;
      if (view[base+5]&64) { var ext=version===4?sync(p):new DataView(view.buffer,view.byteOffset+p,4).getUint32(0); p += version===4?ext:4+ext; }
      while (p+10<=end) {
        var size=version===4?sync(p+4):new DataView(view.buffer,view.byteOffset+p+4,4).getUint32(0);
        if (!size || p+10+size>end) break;
        if (view[p]===84 && view[p+1]===73 && view[p+2]===84 && view[p+3]===50) {
          var encoding=view[p+10], data=view.slice(p+11,p+10+size);
          try { result.push(new TextDecoder(encoding===1?'utf-16':encoding===2?'utf-16be':encoding===3?'utf-8':'iso-8859-1').decode(data).replace(/\0/g,'')); } catch (_) {}
        }
        p+=10+size;
      }
      base=end-1;
    }
    return result;
  }
  function stop(state) { if (state.voice) { state.voice.stop(); state.voice=null; } }
  function cue(state, text, pts) {
    if (!Number.isFinite(pts)) return;
    var found=marker(text);
    if (found) {
      var exists=state.cues.find(function (c) { return c.id===found.id; });
      if (!exists) state.cues.push({ id:found.id, start:pts, end:pts+30, started:false, finished:false });
    } else {
      // The next actual track is a hard boundary, including any THUNDER song.
      state.cues.forEach(function (c) { if (pts>c.start && pts<c.end) { c.end=pts; stop(state); } });
    }
    state.cues.sort(function (a,b) { return a.start-b.start; });
    tick(state);
  }
  function tick(state) {
    if (current!==state) return;
    var pos=state.audio.currentTime;
    if (state.session!==token()) {
      stop(state); state.ready=null; state.session=token(); state.preparing=false;
      state.cues.forEach(function (c) { c.finished=true; });
      return;
    }
    var active=state.cues.find(function (c) { return !c.finished && pos>=c.start+1 && pos<c.end-1; });
    if (!active || state.audio.paused || state.audio.seeking || state.waiting || state.audio.readyState<3 || state.audio.playbackRate!==1) { stop(state); return; }
    var ready=state.ready;
    if (!ready || ready.id!==active.id || ready.session!==state.session) return;
    var lateness=pos-(active.start+1);
    // Begin with the complete introduction; only a paused report resumes at an offset.
    if (!active.started && lateness>1.25) { active.finished=true; return; }
    if (!active.started) active.voiceStart=pos;
    var offset=pos-active.voiceStart;
    if (offset>=ready.buffer.duration) { active.finished=true; stop(state); return; }
    if (!state.voice && window.CCEQEngine) {
      state.voice=window.CCEQEngine.playOverlay(ready.buffer,offset,Math.min(ready.buffer.duration-offset,active.end-1-pos));
      if (state.voice) active.started=true;
    }
  }
  async function prepare(state) {
    if (current!==state || state.preparing || !token()) return;
    var auth=token();
    state.preparing=true;
    try {
      var status=await request('/weather/status');
      if (!status.ready || status.markAt-Date.now()>10*60*1000) return;
      if (state.ready && state.ready.id===String(status.markAt) && state.ready.session===auth) return;
      state.preparing=true;
      var ticket=await request('/weather/prepare',{session:auth,markAt:status.markAt});
      for (var i=0;i<150;i++) {
        if (current!==state || token()!==auth) return;
        var answer=await request('/weather/ticket/'+ticket.ticket);
        if (answer.state==='failed') return;
        if (answer.state==='ready') {
          if (!/^\/weather\/audio\/[a-f0-9]{64}\.mp3$/.test(answer.audio)) return;
          var response=await fetch(HOST+answer.audio,{cache:'no-store',signal:AbortSignal.timeout(15000)});
          if (!response.ok) return;
          var engine=window.CCEQEngine, ctx=engine && engine.audioContext();
          if (!ctx) return;
          var buffer=await ctx.decodeAudioData(await response.arrayBuffer());
          if (buffer.duration>26 || current!==state || token()!==auth) return;
          state.ready={id:String(ticket.markAt),session:auth,buffer:buffer};
          return;
        }
        await new Promise(function (resolve) { setTimeout(resolve,2000); });
      }
    } catch (_) { /* A missing report never interrupts the station. */ }
    finally { if (current===state) state.preparing=false; }
  }
  function destroy() {
    var state=current;
    if (!state) return;
    current=null; stop(state); clearInterval(state.timer); clearInterval(state.poll);
    state.events.forEach(function (e) { state.audio.removeEventListener(e[0],e[1]); });
    if (state.hls) state.hls.destroy();
  }
  async function attach(audio, fallback) {
    if (current && current.audio===audio) return true;
    destroy();
    if (!audio || !/^https:\/\/stream\.cybercrowdradio\.com\/stream\/?$/.test(fallback)) return;
    var status;
    try { status=await request('/weather/status'); } catch (_) { return false; }
    if (!status.ready || status.protocol!==1) return false;
    var state={audio:audio,session:token(),cues:[],ready:null,preparing:false,voice:null,events:[],hls:null};
    current=state;
    function on(name,fn) { audio.addEventListener(name,fn); state.events.push([name,fn]); }
    function reset() { stop(state); }
    ['pause','waiting','seeking','ended','error','ratechange'].forEach(function (e) { on(e,reset); });
    on('timeupdate',function () { tick(state); });
    on('waiting',function () { state.waiting=true; });
    on('playing',function () { state.waiting=false; tick(state); });
    if (window.Hls && window.Hls.isSupported()) {
      var hls=state.hls=new window.Hls({ maxLiveSyncPlaybackRate:1, liveSyncDurationCount:3, backBufferLength:60 });
      hls.on(window.Hls.Events.FRAG_PARSING_METADATA,function (_,data) {
        data.samples.forEach(function (sample) { titles(sample.data).forEach(function (text) { cue(state,text,sample.pts); }); });
      });
      hls.on(window.Hls.Events.ERROR,function (_,data) {
        if (data.fatal && current===state) { var wasPlaying=!audio.paused; destroy(); audio.src=fallback; if (wasPlaying) audio.play().catch(function () {}); }
      });
      hls.loadSource(HOST+'/hls/live.m3u8'); hls.attachMedia(audio);
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src=HOST+'/hls/live.m3u8';
      function track(track) {
        if (track.kind!=='metadata') return;
        track.mode='hidden';
        var handler=function () {
          Array.from(track.activeCues||[]).forEach(function (item) {
            var value=item.value||{};
            if (value.key==='TIT2') cue(state,String(value.data||''),item.startTime);
          });
        };
        track.addEventListener('cuechange',handler);
      }
      Array.from(audio.textTracks||[]).forEach(track);
      if (audio.textTracks) audio.textTracks.addEventListener('addtrack',function (event) { track(event.track); });
    } else { destroy(); return; }
    state.timer=setInterval(function () { tick(state); state.cues=state.cues.filter(function (c) { return c.end>audio.currentTime-60; }); },100);
    state.poll=setInterval(function () { prepare(state); },60000);
    prepare(state);
    return true;
  }
  window.addEventListener('cc-account-verified',function () { if (current) { tick(current); prepare(current); } });
  window.addEventListener('storage',function (e) { if (current && (e.key==='ccr-session'||e.key===null)) { tick(current); prepare(current); } });
  window.CCWeatherRadio={attach:attach,destroy:destroy};
})();
