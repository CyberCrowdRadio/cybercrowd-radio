// Repo: cybercrowd-radio | Job: exercise audio cue playback without a UI.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const callbacks={},events={},mix=[],stops=[];let auth='signed-in';
class Hls { static isSupported(){return true} static Events={FRAG_PARSING_METADATA:'metadata',ERROR:'error'}; on(n,f){callbacks[n]=f} loadSource(){} attachMedia(){} destroy(){} }
const audio={currentTime:0,paused:false,seeking:false,readyState:4,playbackRate:1,addEventListener(n,f){(events[n]||=[]).push(f)},removeEventListener(){},canPlayType(){return ''}};
const context={window:{Hls,CCEQEngine:null},console};
context.window.CCEQEngine={playOverlay(buffer,offset,seconds){mix.push({offset,seconds});return {stop(){stops.push(1)}}},audioContext(){return {}}};
Object.assign(context,{localStorage:{getItem(){return auth}},fetch:async()=>({ok:true,json:async()=>({protocol:1,ready:true,markAt:Date.now()+3600000})}),AbortSignal,Uint8Array,DataView,TextDecoder,Date,Number,Promise,setTimeout,clearInterval(){},setInterval(){return 1}});
context.window.addEventListener=()=>{};
vm.createContext(context);
let code=fs.readFileSync(__dirname+'/cc-weather-radio.js','utf8').replace(/\}\)\(\);\s*$/, 'window.__test={marker:marker,titles:titles,cue:cue,tick:tick,state:function(){return current}};})();');
vm.runInContext(code,context);
const test=context.window.__test;
const mark=Date.parse('2026-11-02T03:30:00Z'),title='CCWX1~'+mark+'~30';
function id3(text){const data=Buffer.from('\x03'+text);const frame=Buffer.alloc(10);frame.write('TIT2');frame.writeUInt32BE(data.length,4);const tag=Buffer.alloc(10);tag.write('ID3');tag[3]=3;const length=data.length+10;tag[9]=length&127;tag[8]=(length>>7)&127;return Buffer.concat([tag,frame,data])}
(async()=>{
assert(test.marker(title));assert.equal(test.marker('A song'),null);assert.equal(test.marker('CCWX1~'+(mark+3600000)+'~30'),null);
assert.equal(test.titles(id3(title))[0],title);assert.equal(test.titles(new Uint8Array([1,2,3])).length,0);
await context.window.CCWeatherRadio.attach(audio,'https://stream.cybercrowdradio.com/stream');
const state=test.state();state.ready={id:String(mark),session:auth,buffer:{duration:20}};
callbacks.metadata(null,{samples:[{pts:100,data:id3(title)}]});assert.equal(mix.length,0);
audio.currentTime=101.1;test.tick(state);assert.equal(mix.length,1);assert.equal(mix[0].offset,0,'complete Kinetic introduction');assert.equal(mix[0].seconds,20);
audio.paused=true;test.tick(state);assert.equal(stops.length,1);
audio.paused=false;audio.currentTime=105;test.tick(state);assert(Math.abs(mix[1].offset-3.9)<.001);
events.waiting.forEach(fn=>fn());test.tick(state);assert.equal(state.voice,null);events.playing.forEach(fn=>fn());assert(state.voice);
callbacks.metadata(null,{samples:[{pts:110,data:id3('THUNDER song')}]});assert.equal(state.cues[0].end,110);assert(mix.at(-1).seconds<=4);
audio.currentTime=109;test.tick(state);assert.equal(state.voice,null,'stop before the next track');
state.cues=[];audio.currentTime=203;test.cue(state,title,200);assert.equal(state.cues[0].finished,true,'late clip never starts mid-sentence');
auth='other-account';test.tick(state);assert.equal(state.ready,null,'discard account audio on switch');
context.window.CCWeatherRadio.destroy();console.log('PASS: timed ID3 cue, no wall-clock speech trigger, pause/stall/resume, late join skip, next-track hard boundary, account switching.');
})().catch(e=>{console.error(e);process.exitCode=1});
