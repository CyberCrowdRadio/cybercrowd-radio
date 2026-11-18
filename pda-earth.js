/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: pda-earth.js
Movements: Turn the world map with touch, keyboard or the rotation controls.
Purpose: Draw the same Earth through a full rotation. Land outlines derive from Natural Earth via vega-datasets world-110m.
Does NOT: Generate PINGs or claim a location for a user.
*/
const canvas = document.getElementById('earth');
const ctx = canvas.getContext('2d');
const rad = Math.PI / 180;
let longitude = 0;
let land = [];
function project(lon, lat) {
  const phi = lat * rad, theta = (lon - longitude) * rad;
  return [280 + 254 * Math.cos(phi) * Math.sin(theta), 280 - 254 * Math.sin(phi), Math.cos(phi) * Math.cos(theta) >= 0];
}
function trace(line) {
  let visible = false;
  ctx.beginPath();
  for (const [lon,lat] of line) {
    const [x,y,front] = project(lon,lat);
    if (front) { if (visible) ctx.lineTo(x,y); else ctx.moveTo(x,y); }
    visible = front;
  }
  ctx.stroke();
}
function draw() {
  ctx.clearRect(0,0,560,560);
  ctx.fillStyle = '#102e3d';ctx.strokeStyle='#67959e';
  ctx.beginPath();ctx.arc(280,280,254,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#315563';ctx.lineWidth=1;
  for(let lon=-180;lon<180;lon+=30) trace(Array.from({length:91},(_,i)=>[lon,i*2-90]));
  for(let lat=-60;lat<=60;lat+=30) trace(Array.from({length:181},(_,i)=>[i*2-180,lat]));
  ctx.strokeStyle='#a0ddcd';ctx.lineWidth=2;
  land.forEach(trace);
}
function turn(step) {longitude=(longitude+step)%360;draw();}
document.getElementById('west').onclick=()=>turn(-24);
document.getElementById('east').onclick=()=>turn(24);
canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();turn(e.key==='ArrowLeft'?-12:12);}};
let start;
canvas.onpointerdown=e=>{start=e.clientX;canvas.setPointerCapture(e.pointerId);};
canvas.onpointermove=e=>{if(start!==undefined){turn((start-e.clientX)*.6);start=e.clientX;}};
canvas.onpointerup=canvas.onpointercancel=()=>{start=undefined;};
draw();
try {
  const result=await fetch('pda-land.json');
  if(!result.ok)throw Error();
  land=await result.json();draw();
} catch {canvas.setAttribute('aria-label','World outlines unavailable');}
