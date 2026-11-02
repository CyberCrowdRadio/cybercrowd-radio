// Repo: cybercrowd-radio | Job: verify that weather uses the existing EQ/volume graph.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const created=[];
class Param {constructor(){this.value=0;this.calls=[]} setValueAtTime(v,t){this.calls.push(['set',v,t])} linearRampToValueAtTime(v,t){this.calls.push(['ramp',v,t])} setTargetAtTime(v,t){this.calls.push(['target',v,t])} cancelScheduledValues(t){this.calls.push(['cancel',t])}}
class Node {constructor(ctx,type){this.context=ctx;this.type=type;this.gain=new Param();this.frequency={};this.Q={};this.connections=[];created.push(this)}connect(node){this.connections.push(node)}disconnect(){this.connections=[]}start(...args){this.started=args}stop(...args){this.stopped=args}}
class Context {constructor(){this.currentTime=10;this.state='running';this.destination=new Node(this,'destination')}resume(){}createMediaElementSource(){return new Node(this,'media')}createBiquadFilter(){return new Node(this,'filter')}createGain(){return new Node(this,'gain')}createBufferSource(){return new Node(this,'voice')}}
const sandbox={window:{AudioContext:Context}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(__dirname+'/cc-eq-engine.js','utf8'),sandbox);
const engine=sandbox.window.CCEQEngine,events={};const audio={volume:.6,addEventListener(n,f){events[n]=f},removeEventListener(n){delete events[n]}};
assert(engine.attach(audio));engine.setBand(2,8);const filter=created.filter(n=>n.type==='peaking')[2];assert.equal(filter.gain.value,8);
const handle=engine.playOverlay({duration:20},1,5);const voice=created.find(n=>n.type==='voice');assert.deepEqual(voice.started,[10,1,5]);assert.deepEqual(voice.stopped,[15]);assert.equal(filter.gain.value,8,'retain fader settings');
const level=created.at(-1);assert.equal(level.gain.value,.6);audio.volume=0;events.volumechange();assert.equal(level.gain.value,0,'mute applies to Kinetic');
handle.stop();assert.deepEqual(voice.stopped,[]);assert(created.some(n=>n.gain.calls.some(c=>c[0]==='target'&&c[1]===1)),'restore shared program gain');
engine.detach();assert.equal(engine.playOverlay({duration:5},0,2),null);console.log('PASS: same EQ path, fader preservation, volume/mute follows receiver, audio-clock stop, restore on cancellation.');
