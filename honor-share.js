/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: honor-share.js
Movements: Render share pages and PNG cards from the published plaque.
Purpose: Keep the honoree and the owner's dedication together in shared links.
Does NOT: Add tribute wording or publish edits.
*/
import { ImageResponse } from "workers-og";

const origin = "https://cybercrowdradio.com";
const escape = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function block(text, style) {
  return {type:"div", props:{style, children:text}};
}
async function shareImage(name, lines) {
  const longest = Math.max(...lines.map(line => Array.from(line).length), 1);
  const size = longest > 160 ? 20 : longest > 75 ? 26 : 36;
  const card = {type:"div", props:{
    style:{width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",
      padding:"24px 54px",backgroundColor:"#17130f",border:"7px solid #bf9c58",color:"#fff4db"},
    children:[
      block("Wall of Honor",{fontSize:28,color:"#edd399"}),
      block(name,{fontSize:name.length>40?36:62,marginTop:12,wordBreak:"break-all"}),
      ...lines.map(line => block(line || " ",{fontSize:size,marginTop:6,whiteSpace:"pre-wrap",wordBreak:"break-all"})),
      block("cybercrowdradio.com",{fontSize:24,marginTop:18,color:"#edd399"})
    ]
  }};
  return new ImageResponse(card,{width:1200,height:630,headers:{"Cache-Control":"public, max-age=60"}});
}
export async function honorShare(request, id, image) {
  const upstream = await fetch("https://radio-authority.cybercrowdradio.workers.dev/api/honor-wall",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"list"})
  });
  if (!upstream.ok) return new Response("Wall unavailable",{status:503});
  const {entries} = await upstream.json();
  const entry = entries.find(row => row.position === id);
  if (!entry) return new Response("Plaque not found",{status:404});
  const lines = entry.dedication.split("\n");
  if (image) return request.method === "HEAD" ? new Response(null,{headers:{"content-type":"image/png"}}) : shareImage(entry.name,lines);
  const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify([entry.name,lines])));
  const version = Array.from(new Uint8Array(digest).slice(0,8), v => v.toString(16).padStart(2,"0")).join("");
  const url = origin + "/honor/" + id;
  const picture = url + ".png?v=" + version;
  const name = escape(entry.name), dedication = escape(entry.dedication);
  const title = name + " · Wall of Honor · CyberCrowd Radio";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="CyberCrowd Radio">
<meta property="og:url" content="${url}"><meta property="og:title" content="${title}"><meta property="og:description" content="${dedication}"><meta property="og:image" content="${picture}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${name} · ${dedication}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${picture}">
<style>body{margin:0;background:#17130f;color:#fff4db;font:1.2rem/1.5 system-ui}main{margin:8vh auto;padding:2rem;max-width:36rem;border:2px solid #bf9c58}h1{font-family:Georgia,serif}p{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#edd399}</style></head>
<body><main><a href="/archive#honor-${id}">Wall of Honor</a><h1>${name}</h1><p>${dedication}</p><a href="/">cybercrowdradio.com</a></main></body></html>`;
  return new Response(request.method === "HEAD" ? null : html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-cache"}});
}
