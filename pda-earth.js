/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: pda-earth.js
Movements: Pan a flat map, zoom around a point and select country flags to browse published channels.
Purpose: Show areas using Natural Earth outlines and Google DSPL country reference coordinates.
Does NOT: Locate people from private account information.
*/
const byId = id => document.getElementById(id);
const canvas = byId('earth'), ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const region = byId('area');
const names = new Intl.DisplayNames(['en'],{type:'region'});
let areas = [], rings = [], flags = [];
let zoom = 1, longitude = 0, latitude = 0;
const wrap = x => ((x+180)%360+360)%360-180;
const sx = () => W * zoom / 360;
const sy = () => H * zoom / 180;
const at = (lon,lat) => [W/2 + wrap(lon-longitude)*sx(), H/2-(lat-latitude)*sy()];
const within = ([x,y]) => x>=0 && x<=W && y>=0 && y<=H;
const glyph = code => [...code].map(ch=>String.fromCodePoint(127397+ch.charCodeAt(0))).join('');
const directory = (window.STATION_CONFIG?.channels || []).filter(channel=>{
  try { const url=new URL(channel.src);
    return channel.name && url.protocol==='https:' && !url.username && !url.password && /^[A-Z]{2}$/.test(channel.publicCountry);
  } catch { return false; }
});
const active = new Set(directory.map(c=>c.publicCountry));
function listing() {
  const visible = new Set(areas.filter(a=>within(at(a.lon,a.lat))).map(a=>a.code));
  const selected = region.value;
  const entries = directory.filter(c=>selected ? c.publicCountry===selected : visible.has(c.publicCountry));
  byId('area-status').textContent = entries.length ? entries.length+' public channel'+(entries.length===1?'':'s') :
    'No channels have published a location in '+(selected ? names.of(selected) : 'this area')+'.';
  byId('area-channels').replaceChildren(...entries.map(c=>{
    const row=document.createElement('li'), link=document.createElement('a');
    link.textContent=c.name;link.href='channel-view.html?channel='+encodeURIComponent(c.id||c.name);
    row.append(link);return row;
  }));
}
function draw() {
  const limit=90-90/zoom;
  latitude=Math.max(-limit,Math.min(limit,latitude));
  longitude=wrap(longitude);
  ctx.fillStyle='#102e3d';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#315563';ctx.lineWidth=1;ctx.beginPath();
  for(let lon=-180;lon<180;lon+=30){const [x]=at(lon,0);ctx.moveTo(x,0);ctx.lineTo(x,H);}
  for(let lat=-60;lat<=60;lat+=30){const [,y]=at(0,lat);ctx.moveTo(0,y);ctx.lineTo(W,y);}
  ctx.stroke();
  ctx.strokeStyle='#a0ddcd';ctx.lineWidth=1.7/zoom;
  for(const shift of [-360,0,360]){
    ctx.save();ctx.translate(W/2+(shift-longitude)*sx(),H/2+latitude*sy());
    ctx.scale(zoom,zoom);for(const path of rings)ctx.stroke(path);ctx.restore();
  }
  flags=[];
  const size=Math.max(18,21*W/Math.max(200,canvas.clientWidth));
  ctx.font=size+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const area of areas){
    const [x,y]=at(area.lon,area.lat);
    if(!within([x,y])||flags.some(f=>Math.abs(x-f.x)<size*1.4 && Math.abs(y-f.y)<size*1.15))continue;
    flags.push({x,y,area,size});ctx.fillText(glyph(area.code),x,y);
  }
  document.querySelector('.rotation span').textContent=zoom+'×';
  byId('minus').disabled=zoom===1;byId('plus').disabled=zoom===16;listing();
}
function focusArea(code){
  const target=areas.find(a=>a.code===code);
  if(target){longitude=target.lon;latitude=target.lat;zoom=Math.max(zoom,4);}
  region.value=code;draw();
}
function magnify(factor,x=W/2,y=H/2){
  const lon=longitude+(x-W/2)/sx(),lat=latitude-(y-H/2)/sy();
  zoom=Math.max(1,Math.min(16,zoom*factor));
  longitude=lon-(x-W/2)/sx();latitude=lat+(y-H/2)/sy();
  region.value='';draw();
}
region.onchange=()=>focusArea(region.value);
byId('west').onclick=()=>{region.value='';longitude-=30/zoom;draw();};
byId('east').onclick=()=>{region.value='';longitude+=30/zoom;draw();};
byId('plus').onclick=()=>magnify(2);byId('minus').onclick=()=>magnify(.5);
canvas.onkeydown=e=>{
  const action={ArrowLeft:'west',ArrowRight:'east','+':'plus','=':'plus','-':'minus'}[e.key];
  if(action){e.preventDefault();byId(action).click();}
};
function point(e){const b=canvas.getBoundingClientRect();return [(e.clientX-b.left)*W/b.width,(e.clientY-b.top)*H/b.height];}
let drag, lastTap;
canvas.onpointerdown=e=>{if(!e.isPrimary || e.button!==0)return;const [x,y]=point(e);drag={id:e.pointerId,x,y,lon:longitude,lat:latitude,moved:false};canvas.setPointerCapture(e.pointerId);};
canvas.onpointermove=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const [x,y]=point(e),dx=x-drag.x,dy=y-drag.y;
  if(!drag.moved && Math.hypot(dx,dy)*canvas.clientWidth/W<6)return;
  drag.moved=true;longitude=drag.lon-dx/sx();latitude=drag.lat+dy/sy();region.value='';draw();
};
canvas.onpointerup=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const moved=drag.moved;drag=undefined;if(moved){lastTap=undefined;return;}
  const [x,y]=point(e);
  const flag=flags.find(f=>Math.abs(f.x-x)<=f.size*.7&&Math.abs(f.y-y)<=f.size*.58);
  if(flag){lastTap=undefined;focusArea(flag.area.code);return;}
  const now=performance.now();
  if(lastTap && now-lastTap.time<450 && Math.hypot(lastTap.x-x,lastTap.y-y)<40){magnify(2,x,y);lastTap=undefined;}
  else lastTap={x,y,time:now};
};
canvas.onpointercancel=()=>{drag=undefined;lastTap=undefined;};
async function data(file){const r=await fetch(file);if(!r.ok)throw Error();return r.json();}
try{
  const [land,centers]=await Promise.all([data('pda-land.json'),data('pda-areas.json')]);
  rings=land.map(line=>{
    const path=new Path2D();let previous;
    for(const [lon,lat] of line){
      const x=lon*W/360,y=-lat*H/180;
      if(previous===undefined||Math.abs(previous-lon)>180)path.moveTo(x,y);else path.lineTo(x,y);
      previous=lon;
    }return path;
  });
  areas=centers.map(([code,lat,lon])=>({code,lat,lon}));
  for(const a of [...areas].sort((a,b)=>names.of(a.code).localeCompare(names.of(b.code))))
    region.add(new Option(glyph(a.code)+' '+names.of(a.code),a.code));
  const rank=c=>active.has(c)?0:['US','BR','GB','ZA','IN','JP','AU','CA','CN'].includes(c)?1:2;
  areas.sort((a,b)=>rank(a.code)-rank(b.code));
  new ResizeObserver(draw).observe(canvas);draw();
}catch{byId('area-status').textContent='Map data could not load. Reload to try again.';}
