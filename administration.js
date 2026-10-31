/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: administration.js
Movements: New root file.
Purpose: Display scoped role assignments and private case workflows.
Does NOT: grant authority locally or trust browser-provided role flags.
*/
(function() {
"use strict";
const el=id=>document.getElementById(id);
let busy=false,grantCursor=null,caseCursor=null,noteCursor=null;
const selected=()=>({scope:el("scope").value,resource:el("resource").value.trim()});
async function call(path,body){
 let session="";try{session=localStorage.getItem("ccr-session")||""}catch(_){}
 if(!session)throw Error("Sign in to manage roles or submit a report.");
 const answer=await window.CCAuthority.ask(path,Object.assign({session},body));
 if(!answer||!answer.success)throw Error(answer&&answer.error||"Could not reach the authority.");
 return answer;
}
function run(fn){return async()=>{if(busy)return;busy=true;el("status").textContent="Working…";try{await fn();el("status").textContent="Done.";}catch(e){el("status").textContent=e.message;}finally{busy=false;}}}
async function scopeStatus(){
 el("assignments").hidden=true;el("grantResults").textContent="";
 const a=await call("/api/admin",Object.assign(selected(),{action:"status"}));
 el("role").textContent=a.result.scope+" — your designation: "+a.result.role;
 el("assignments").hidden=a.result.role!=="owner";
}
el("loadScope").onclick=run(scopeStatus);
for(const action of ["grant","revoke"])el(action).onclick=run(async()=>{
 const target=el("target").value.trim(),reason=el("reason").value.trim();
 if(!target||!reason)throw Error("Enter the stage name and a reason.");
 if(!window.confirm((action==="grant"?"Assign":"Revoke")+" this designation for "+target+" in "+el("scope").selectedOptions[0].textContent+"?"))return;
 const a=await call("/api/admin",Object.assign(selected(),{action,target,reason,role:el("assignmentRole").value}));
 el("grantResults").textContent=JSON.stringify(a.result,null,2);
});
async function grants(more){
 const a=await call("/api/admin",Object.assign(selected(),{action:"list",cursor:more?grantCursor:undefined}));
 el("grantResults").textContent=(more?el("grantResults").textContent+"\n":"")+JSON.stringify(a.result.grants,null,2);
 grantCursor=a.result.cursor;el("moreGrants").hidden=!grantCursor;
}
el("listGrants").onclick=run(()=>grants(false));el("moreGrants").onclick=run(()=>grants(true));
el("submitReport").onclick=run(async()=>{
 const a=await call("/api/reports",{action:"submit",target:el("reportTarget").value.trim(),category:el("category").value,detail:el("reportDetail").value.trim()});
 el("submitted").textContent="Report recorded. Save your case ID: "+a.report.id;
 el("caseId").value=a.report.id;el("reportDetail").value="";
});
async function cases(more){
 const a=await call("/api/reports",{action:"list",cursor:more?caseCursor:undefined});
 el("caseList").textContent=(more?el("caseList").textContent+"\n":"")+JSON.stringify(a.reports,null,2);
 caseCursor=a.cursor;el("moreCases").hidden=!caseCursor;
}
el("listCases").onclick=run(()=>cases(false));el("moreCases").onclick=run(()=>cases(true));
async function openCase(more){
 const a=await call("/api/reports",{action:"get",id:el("caseId").value.trim(),cursor:more?noteCursor:undefined});
 el("caseView").textContent=(more?el("caseView").textContent+"\n":JSON.stringify(a.report,null,2)+"\n")+JSON.stringify(a.notes,null,2);
 noteCursor=a.cursor;el("moreNotes").hidden=!noteCursor;
}
el("openCase").onclick=run(()=>openCase(false));el("moreNotes").onclick=run(()=>openCase(true));
for(const action of ["respond","review"])el(action==="review"?"reviewCase":"respond").onclick=run(async()=>{
 await call("/api/reports",{action,id:el("caseId").value.trim(),detail:el("caseDetail").value.trim(),decision:el("decision").value});
 el("caseDetail").value="";await openCase(false);
});
el("scope").onchange=()=>{el("assignments").hidden=true;el("role").textContent="Check your authority for this scope.";grantCursor=null;el("moreGrants").hidden=true;};
run(scopeStatus)();
})();
