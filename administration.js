/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: administration.js
Movements: Replace crowded form with a guided team workflow.
Purpose: Invite, apply, review and manage limited appointments one step at a time.
Does NOT: infer authority from browser flags or score credentials automatically.
*/
(function(){
"use strict";
const $=id=>document.getElementById(id),screen=$("screen");
let scope="radio",resource="",role="none",platformRole="none",busy=false;
let backAction=home,loadedCase="",caseNotesCursor=null;
const labels={radio:"My radio room",account:"My account team",platform:"Platform review",channel:"My channels"};
function say(message){$("status").textContent=message;}
function show(title,intro,back){
 $("heading").textContent=title;$("intro").textContent=intro;screen.replaceChildren();
 $("back").hidden=!back;backAction=back||home;
}
async function call(path,body){
 let session="";try{session=localStorage.getItem("ccr-session")||"";}catch(_){}
 if(!session)throw Error("Sign in to continue.");
 const a=await window.CCAuthority.ask(path,{...body,session});
 if(!a||!a.success)throw Error(a&&a.error||"The station could not be reached.");
 return a;
}
function task(fn){return async()=>{if(busy)return;busy=true;say("Working…");try{await fn();say("Ready.");}catch(e){say(e.message);}finally{busy=false;}};}
function button(label,fn,parent=screen){const b=document.createElement("button");b.type="button";b.textContent=label;b.onclick=task(fn);parent.appendChild(b);return b;}
function paragraph(text,parent=screen){const p=document.createElement("p");p.textContent=text;parent.appendChild(p);return p;}
function field(label,type="text",parent=screen,max=1000){
 const l=document.createElement("label");l.textContent=label;const e=document.createElement(type==="textarea"?"textarea":type==="select"?"select":"input");
 if(type!=="textarea"&&type!=="select")e.type=type;if(type==="checkbox")e.checked=false;else e.maxLength=max;
 l.appendChild(e);parent.appendChild(l);return e;
}
function selectRole(parent=screen){
 const e=field("Job to consider","select",parent);
 for(const [value,label] of [["monitor",scope==="platform"?"Monitor — read and examine reports":"Monitor — moderate this room"],["administrator",scope==="platform"?"Administrator — review cases and record decisions":"Administrator — moderate and run rounds"]]){
 const o=document.createElement("option");o.value=value;o.textContent=label;e.appendChild(o);}
 return e;
}
const context=()=>({scope,resource});
async function app(body){return call("/api/admin/applications",{...context(),...body});}
async function enter(kind){
 scope=kind;resource="";
 const a=await call("/api/admin",{...context(),action:"status"});role=a.result.role;
 if(kind==="platform")platformRole=role;
 menu();
}
function home(){
 show("Your team","Choose an area. Each team has its own boundaries.",null);
 button("MY ROOM",()=>enter("radio"));
 button("MY CHANNELS",()=>{show("My channels","Channel teams become available when real channels are created.",home);});
 button("PLATFORM REVIEW",()=>enter("platform"));
 button("Invitations & my applications",()=>inbox());
}
function menu(){
 show(labels[scope]||"Your team","Choose what you want to do next.",home);
 if(role==="owner"){
 button("Invite an admin",invite);button("Review applicants",()=>applicants());
 button("My appointed team",()=>team());
 }
 if(role!=="owner")button("Apply to help",applyForm);
 if(scope==="radio")button("My account's own team",async()=>{scope="account";resource="";const a=await call("/api/admin",{...context(),action:"status"});role=a.result.role;menu();});
 if(scope==="platform")button("Reports & responses",reportsMenu);
}
function invite(){
 show("Invite an admin","Invite a registered person to apply. This grants no access.",menu);
 const target=field("Their exact stage name","text",screen,30),job=selectRole();
 button("Send invitation",async()=>{
 const a=await app({action:"invite",target:target.value.trim(),role:job.value});
 show("Invitation saved",a.message,menu);button("Back to my team",menu);
 });
}
const practicePrompts=[
 "Someone uses a rude word. What would you check before taking action?",
 "A report involves your friend or someone you have a dispute with. What do you do?",
 "You monitor one room. Someone asks you to take action in another channel. What do you do?"
];
function applyForm(invitation){
 show("Apply to help","Share relevant experience and references voluntarily. Review is manual; applying gives you no access.",menu);
 const job=selectRole();if(invitation)job.value=invitation.role;
 const experience=field("Relevant experience","textarea",screen,2000);
 const links=field("Reference links — one HTTPS link per line, up to five (optional)","textarea",screen,2500);
 const conflicts=field("Relationships or conflicts that could affect your decisions. Write “None known” if none.","textarea",screen,1000);
 const practice=practicePrompts.map(prompt=>field(prompt,"textarea",screen,1000));
 paragraph("Review standard: identify the conduct, check the relevant rule and evidence, hear the response, record your reasons, and step aside for conflicts. These practice answers are reviewed by a person.");
 const rules=field("I will follow this review standard and the owner's operating rules.","checkbox");
 button("Submit for review",async()=>{
 const a=await app({action:"submit",role:job.value,experience:experience.value,links:links.value.split("\n").map(x=>x.trim()).filter(Boolean),conflicts:conflicts.value,practice:practice.map(x=>x.value),acceptRules:rules.checked});
 show("Application submitted","Your application is awaiting review. You have not been given admin access.",menu);paragraph(a.application.stageName+" — "+a.application.scope);button("View my applications",()=>inbox());
 });
}
async function inbox(inviteCursor,applicationCursor){
 const [inv,mine]=await Promise.all([app({action:"inbox",cursor:inviteCursor}),app({action:"mine",cursor:applicationCursor})]);
 show("Invitations & applications","Choose an invitation, or check the outcome of an application.",home);
 if(!inv.invitations.length)paragraph("No invitations on this page.");
 inv.invitations.forEach(v=>button(v.from+" invited you · "+v.label,async()=>{
 scope=v.scope;resource=v.resource;const a=await call("/api/admin",{...context(),action:"status"});role=a.result.role;applyForm(v);
 }));
 mine.applications.forEach(a=>{const card=document.createElement("section");screen.appendChild(card);paragraph(a.stageName+" · "+a.scope,card);paragraph("Status: "+a.status,card);if(a.reason)paragraph(a.reason,card);});
 if(!mine.applications.length)paragraph("No applications on this page.");
 if(inv.cursor)button("More invitations",()=>inbox(inv.cursor));
 if(mine.cursor)button("More applications",()=>inbox(undefined,mine.cursor));
}
async function applicants(cursor){
 const a=await app({action:"list",cursor});show("Review applicants","Choose a person to examine their application.",menu);
 a.applications.forEach(v=>button(v.stageName+" · "+v.role+" · "+v.status,()=>review(v.id)));
 if(!a.applications.length)paragraph("No applications here yet.");
 if(a.cursor)button("More applicants",()=>applicants(a.cursor));
}
async function review(id){
 const a=(await app({action:"get",id})).application;
 show(a.stageName,"Review for "+a.scope+" · "+a.role,()=>applicants());
 paragraph("Status: "+a.status);paragraph("Experience: "+a.experience);paragraph("Conflicts: "+a.conflicts);
 for(const link of a.links||[]){const e=document.createElement("a");e.href=link;e.textContent=link;e.target="_blank";e.rel="noopener noreferrer";screen.appendChild(e);screen.appendChild(document.createElement("br"));}
 (a.practice||[]).forEach((answer,i)=>{paragraph(practicePrompts[i]);paragraph(answer);});
 if(a.status!=="submitted"){paragraph(a.reason||"Review already completed.");return;}
 const checks={credentials:field("I checked the submitted credentials and references.","checkbox"),conflicts:field("I reviewed conflicts and can make an impartial decision.","checkbox"),practice:field("I reviewed all three practice answers.","checkbox"),rules:field("I explained the operating rules and responsibilities.","checkbox")};
 const reason=field("Decision and reason","textarea",screen,500);
 const decide=async decision=>{
 if(!reason.value.trim())throw Error("Write a reason for your decision.");
 if(!window.confirm((decision==="approve"?"Approve this limited appointment":"Decline this application")+" for "+a.stageName+" in "+a.scope+"?"))return;
 const result=await app({action:"decide",id,decision,reason:reason.value,checklist:Object.fromEntries(Object.entries(checks).map(([k,v])=>[k,v.checked]))});
 show(decision==="approve"?"Appointment approved":"Application declined",result.application.reason,()=>applicants());
 button("Back to applicants",()=>applicants());
 };
 button("Approve limited appointment",()=>decide("approve"));button("Decline application",()=>decide("decline"));
}
async function team(cursor){
 const a=await call("/api/admin",{...context(),action:"list",cursor});
 show("My appointed team","These designations apply only to "+(labels[scope]||"this area")+".",menu);
 a.result.grants.forEach(v=>{const card=document.createElement("section");screen.appendChild(card);paragraph(v.stageName+" — "+v.role+(v.active?"":" (access removed)"),card);
 if(v.active)button("Remove access",async()=>{
 show("Remove "+v.stageName+"'s access","This only removes their designation in this area.",()=>team());
 const reason=field("Reason","textarea",screen,500);
 button("Confirm removal",async()=>{if(!reason.value.trim())throw Error("Enter a reason.");
 await call("/api/admin",{...context(),action:"revoke",target:v.stageName,reason:reason.value});await team();});
 },card);});
 if(!a.result.grants.length)paragraph("No appointments here yet.");
 if(a.result.cursor)button("More team members",()=>team(a.result.cursor));
}
function reportsMenu(){
 show("Reports & responses","Private review, separate from live chat.",menu);
 button("Report an account",reportForm);button("Platform review inbox",()=>caseInbox());
 paragraph("A report does not automatically block or punish anyone. Participants can open a private case link supplied by a reviewer.");
}
function reportForm(){
 show("Report an account","Describe the conduct you want reviewed.",reportsMenu);
 const target=field("Their stage name","text",screen,30),category=field("Type of report","select");
 for(const type of ["impersonation","referral abuse","attempted block","camouflage","trolling","other"]){const o=document.createElement("option");o.textContent=type;category.appendChild(o);}
 const detail=field("What happened?","textarea",screen,1000);
 button("Submit private report",async()=>{const a=await call("/api/reports",{action:"submit",target:target.value.trim(),category:category.value,detail:detail.value});await openCase(a.report.id);});
}
async function caseInbox(cursor){
 const a=await call("/api/reports",{action:"list",cursor});show("Review inbox","Choose a report to read the details and responses.",reportsMenu);
 a.reports.forEach(v=>button(v.target+" · "+v.category+" · reported by "+v.by,()=>openCase(v.id)));
 if(!a.reports.length)paragraph("No reports on this page.");if(a.cursor)button("More reports",()=>caseInbox(a.cursor));
}
async function openCase(id,cursor){
 const a=await call("/api/reports",{action:"get",id,cursor});loadedCase=id;
 if(!cursor){show("Account report","Private case concerning "+a.report.target,reportsMenu);paragraph(a.report.by+" reported: "+a.report.category);paragraph(a.report.detail);
 const link=document.createElement("a");link.href="administration.html#case="+encodeURIComponent(id);link.textContent="Private case link — only participants and platform reviewers can open it";screen.appendChild(link);}
 a.notes.forEach(n=>{const card=document.createElement("section");screen.appendChild(card);paragraph(n.by+" · "+n.action+(n.decision?" · "+n.decision:""),card);paragraph(n.detail,card);});
 if(a.cursor){button("More responses",()=>openCase(id,a.cursor));return;}
 const detail=field("Your response or review explanation","textarea",screen,1000);
 button("Submit my response",async()=>{await call("/api/reports",{action:"respond",id,detail:detail.value});await openCase(id);});
 if(["owner","administrator"].includes(platformRole)){const decision=field("Review outcome","select");for(const value of ["open","resolved","dismissed"]){const o=document.createElement("option");o.textContent=value;decision.appendChild(o);}
 button("Record platform review",async()=>{await call("/api/reports",{action:"review",id,detail:detail.value,decision:decision.value});await openCase(id);});}
}
$("back").onclick=()=>task(backAction)();
task(async()=>{
 const a=await call("/api/admin",{scope:"platform",action:"status"});platformRole=a.result.role;
 const id=new URLSearchParams(window.location.hash.slice(1)).get("case");
 if(id){scope="platform";await openCase(id);}else home();
})();
})();