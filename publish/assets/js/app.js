// CRM VGE R10 · Fase 6 · app.js · composición y renderizado común
async function replaceAll(){throw new Error("La base online no admite sustitución masiva desde el navegador")};

function updateNavCounts(){
 const mine=centers.filter(c=>c.assignedTo===currentUser).length;
 const scheduled=agendaRows(false).length;
 const overdue=overdueCandidates().length;
 const una=centers.filter(c=>c.assignedTo==="Sin asignar").length;
 document.getElementById("navMineCount").textContent=mine.toLocaleString("es-ES");
 document.getElementById("navDueCount").textContent=scheduled.toLocaleString("es-ES");
 document.getElementById("navOverdueCount").textContent=overdue.toLocaleString("es-ES");
 document.getElementById("navUnassignedCount").textContent=una.toLocaleString("es-ES");
 const archivedCount=document.getElementById("navArchivedCount");if(archivedCount)archivedCount.textContent=archivedCenters.length.toLocaleString("es-ES");
 document.querySelectorAll("[data-status-count]").forEach(el=>{const st=el.dataset.statusCount;el.textContent=centers.filter(c=>c.assignedTo===currentUser&&portfolioStatus(c)===st).length.toLocaleString("es-ES")});
 updateReminderStrip();
}
function render(){
 updateNavCounts();
 document.querySelectorAll("#nav button").forEach(b=>{
   const active=b.dataset.statusNav?(currentView==="status"&&b.dataset.statusNav===activeStatus):(b.dataset.view===currentView);
   b.classList.toggle("active",active);
 });
 currentPage=1;
 const excelBtn=document.getElementById("excelBtn");if(excelBtn)excelBtn.style.display=["team","permissions","archived"].includes(currentView)?"none":"";
 if(currentView==="dashboard")renderDashboard(); else if(currentView==="stats")renderStatistics(); else if(currentView==="bulk")renderBulkAssignment(); else if(currentView==="team")renderTeamPresence(); else if(currentView==="permissions")renderPermissions(); else if(currentView==="archived")renderArchivedCenters(); else renderList();
}
function setTitle(title,sub=""){document.getElementById("pageTitle").textContent=title;document.getElementById("pageSubtitle").textContent=sub}

function qualityScopeCenters(){return isAdmin?centers.slice():centers.filter(c=>c.assignedTo===currentUser)}
function hasFutureFollowup(c){return !!(c.nextTaskAt||c.opportunityNextContactAt||(nextKey(c)&&nextKey(c)>nowKey()))}
function qualityIssueCount(rows,key){return rows.filter(c=>{
 if(key==="quality-phone")return !String(c.mobile||c.schoolPhone||"").trim();
 if(key==="quality-email")return !String(c.directEmail||c.schoolEmail||"").trim();
 if(key==="quality-contact")return !String(c.contactName||"").trim();
 if(key==="quality-travel")return Number(c.opportunityTotal||0)===0;
 if(key==="quality-followup")return ["Interesado","Trasladado a cotización"].includes(portfolioStatus(c))&&!hasFutureFollowup(c);
 return false
 }).length}
function qualityPanelHtml(){
 const rows=qualityScopeCenters(),items=[
  ["quality-phone","Sin teléfono","No hay teléfono general ni directo"],
  ["quality-email","Sin email","No hay email general ni directo"],
  ["quality-contact","Sin persona","Falta un interlocutor identificado"],
  ["quality-travel","Sin viaje","No hay grupo creado en la campaña"],
  ["quality-followup","Sin seguimiento","Interesados o cotización sin fecha futura"]
 ];
 return `<div class="card quality-panel"><div class="quality-head"><div><h2>Calidad de datos</h2><p>Revisión automática en el navegador. No modifica ninguna ficha: pulsa un bloque para ver los centros que conviene completar.</p></div><span class="quality-scope">${isAdmin?"TODO EL CRM":"MI CARTERA"} · ${rows.length.toLocaleString("es-ES")} centros</span></div><div class="quality-grid">${items.map(([key,label,hint])=>{const count=qualityIssueCount(rows,key);return `<button class="quality-item ${count?"attention":"clear"}" type="button" data-quality-filter="${key}"><strong>${count.toLocaleString("es-ES")}</strong><span>${esc(label)}</span><small>${esc(count?hint:"Sin incidencias detectadas")}</small></button>`}).join("")}</div></div>`
}
function bindQualityPanel(){document.querySelectorAll("[data-quality-filter]").forEach(button=>button.onclick=()=>{currentView=isAdmin?"all":"mine";activeStatus="";filters={search:"",status:"",community:"",seller:"",quick:button.dataset.qualityFilter};render()})}

function renderDashboard(){
 setTitle("Panel de trabajo",`${currentUserLabel()} · seguimiento de prospección escolar`);
 const mine=centers.filter(c=>c.assignedTo===currentUser), t=localISO();
 const pending=mine.filter(c=>portfolioStatus(c)==="Pendiente").length;
 const worked=mine.length-pending;
 const myAgenda=agendaRows(false),today=myAgenda.filter(c=>nextParts(c).date===t).length;
 const overdue=overdueCandidates().length;
 const interested=mine.filter(c=>portfolioStatus(c)==="Interesado").length;
 const quote=mine.filter(c=>portfolioStatus(c)==="Trasladado a cotización").length;
 const byCommunity={};mine.forEach(c=>byCommunity[c.community]=(byCommunity[c.community]||0)+1);
 const maxComm=Math.max(1,...Object.values(byCommunity));
 const activities=mine.flatMap(c=>(c.history||[]).map(h=>({...h,school:c.school,id:c.id}))).sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||"")).slice(0,8);
 const sellers=USERS.map(u=>({u,n:centers.filter(c=>c.assignedTo===u).length}));const maxSeller=Math.max(...sellers.map(x=>x.n),1);
 document.getElementById("content").innerHTML=`
 <div class="kpis">
  ${kpi("Mi cartera",mine.length,"centros asignados")}
  ${kpi("Pendientes",pending,"sin trabajar")}
  ${kpi("Trabajados",worked,"estado actualizado")}
  ${kpi("Para hoy",today,"seguimientos")}
  ${kpi("Vencidos",overdue,"requieren atención")}
  ${kpi("A cotización",quote,"trasladados")}
 </div>
 ${qualityPanelHtml()}
 <div class="grid2">
  <div class="card panel"><h2>Mi cartera por zona</h2>
   ${Object.entries(byCommunity).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="bar-row"><span>${esc(k)}</span><div class="bar"><progress max="100" value="${Math.max(0,Math.min(100,v/maxComm*100))}"></progress></div><b>${v}</b></div>`).join("")||'<div class="empty">Sin centros asignados</div>'}
   <h3>${isAdmin?"Reparto global del equipo":"Mi cartera"}</h3>
   ${sellers.map(x=>`<div class="bar-row"><span>${esc(operatorLabel(x.u))}</span><div class="bar"><progress max="100" value="${Math.max(0,Math.min(100,x.n/maxSeller*100))}"></progress></div><b>${x.n}</b></div>`).join("")}
  </div>
  <div class="card panel"><h2>Actividad reciente</h2><div class="timeline-mini">
   ${activities.length?activities.map(a=>`<div class="activity"><strong>${esc(a.school)}</strong><div>${esc(a.author)} · ${fmtDateTime(a.createdAt)} · ${esc(a.channel)} · ${esc(a.result)}</div></div>`).join(""):'<div class="empty">Todavía no hay contactos registrados.</div>'}
  </div><h3>Interesados</h3><div class="bar-row"><span>Centros interesados</span><div class="bar"><progress max="100" value="${Math.max(0,Math.min(100,mine.length?interested/mine.length*100:0))}"></progress></div><b>${interested}</b></div></div>
 </div>`;
 bindQualityPanel();
}
function kpi(label,value,hint){return `<div class="card kpi"><div class="label">${esc(label)}</div><div class="value">${Number(value).toLocaleString("es-ES")}</div><div class="hint">${esc(hint)}</div></div>`}

document.addEventListener("click",e=>{
 const taskEmailBtn=e.target.closest("[data-email-task]");
 if(taskEmailBtn){e.preventDefault();e.stopPropagation();openEmailForTask(taskEmailBtn.dataset.emailTask);return;}
 const emailBtn=e.target.closest("[data-email-center]");
 if(emailBtn){e.preventDefault();e.stopPropagation();openEmailForCenter(emailBtn.dataset.emailCenter);return;}
 const overdueBtn=e.target.closest("[data-overdue-email]");
 if(overdueBtn){e.preventDefault();e.stopPropagation();openOverdueCenterEmail(overdueBtn.dataset.overdueEmail);return;}
});
