// CRM VGE R10 · Fase 5 · app.js
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

function statsPeriodLabel(days){return Number(days)===0?"Todo el histórico":`Últimos ${Number(days)} días`}
function statsMetric(value,percent=false){
 if(value===null||value===undefined||value==="")return "—";
 const n=Number(value);if(!Number.isFinite(n))return "—";
 const rendered=n.toLocaleString("es-ES",{maximumFractionDigits:1});return percent?`${rendered}%`:rendered;
}
function statsKpi(label,value,hint,tone="",percent=false){return `<div class="card stats-kpi ${esc(tone)}"><div class="label">${esc(label)}</div><div class="value">${esc(statsMetric(value,percent))}</div><div class="hint">${esc(hint)}</div></div>`}
function statsBarRows(items,labelKey="label",valueKey="total"){
 const rows=Array.isArray(items)?items:[],max=Math.max(1,...rows.map(x=>Number(x?.[valueKey]||0)));
 if(!rows.length)return '<div class="stats-empty">Todavía no hay datos en este alcance.</div>';
 return `<div class="stats-bars">${rows.map(x=>{const n=Number(x?.[valueKey]||0);return `<div class="stats-bar-row"><span title="${esc(x?.[labelKey]||"Sin indicar")}">${esc(x?.[labelKey]||"Sin indicar")}</span><div class="bar"><progress max="100" value="${Math.max(0,Math.min(100,n/max*100))}"></progress></div><b>${n.toLocaleString("es-ES")}</b></div>`}).join("")}</div>`;
}
function statsCommunityOptions(){
 const source=isAdmin?centers:centers.filter(c=>c.assignedTo===currentUser),values=[...new Set(source.map(c=>c.community).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
 if(statisticsFilters.community&&!values.includes(statisticsFilters.community))values.push(statisticsFilters.community);
 return `<option value="">Todas las comunidades</option>${values.map(v=>`<option value="${esc(v)}" ${statisticsFilters.community===v?"selected":""}>${esc(v)}</option>`).join("")}`;
}
function statsOperatorFilterOptions(){
 const rows=OPERATORS.slice();
 return `<option value="">Todo el equipo</option>${rows.map(o=>`<option value="${esc(o.code)}" ${statisticsFilters.operatorCode===o.code?"selected":""}>${esc(o.display_name)}</option>`).join("")}<option value="Sin asignar" ${statisticsFilters.operatorCode==="Sin asignar"?"selected":""}>Sin asignar</option>`;
}
function statisticsControlsHtml(){
 const period=Number(statisticsFilters.periodDays??30);
 return `<div class="stats-filters">
   <label>Periodo de actividad<select id="statsPeriod"><option value="7" ${period===7?"selected":""}>Últimos 7 días</option><option value="30" ${period===30?"selected":""}>Últimos 30 días</option><option value="90" ${period===90?"selected":""}>Últimos 90 días</option><option value="365" ${period===365?"selected":""}>Últimos 365 días</option><option value="0" ${period===0?"selected":""}>Todo el histórico</option></select></label>
   ${isAdmin?`<label>Responsable<select id="statsOperator">${statsOperatorFilterOptions()}</select></label>`:""}
   <label>Comunidad autónoma<select id="statsCommunity">${statsCommunityOptions()}</select></label>
   <button class="btn stats-refresh" id="statsRefreshBtn" type="button">Actualizar</button>
   <div class="stats-scope-note"><b>Foto actual:</b> cartera, estados, vencidos y oportunidades. <b>Periodo seleccionado:</b> contactos, puntualidad de seguimientos y nuevas altas.${isAdmin?" Puedes acotar la visión global por responsable y comunidad.":" El servidor limita esta pantalla exclusivamente a tu propia cartera y actividad."}</div>
  </div>`;
}
function statisticsIntroHtml(){return `<div class="stats-intro"><strong>${isAdmin?"Visión global de Administración.":"Tus resultados comerciales."}</strong> Esta sección usa cálculos del servidor y excluye notas, teléfonos, emails y datos personales. Los colegios se cuentan una sola vez en cartera; los viajes se miden de forma independiente por ciclo y estado. ${isAdmin?"La tabla de equipo permite comparar carga y actividad operativa.":"No se envían al navegador cifras, centros ni actividad de otros responsables."}</div>`}
function bindStatisticsControls(){
 const period=document.getElementById("statsPeriod"),operator=document.getElementById("statsOperator"),community=document.getElementById("statsCommunity"),refresh=document.getElementById("statsRefreshBtn");
 if(period)period.onchange=()=>{statisticsFilters.periodDays=Number(period.value);statisticsData=null;renderStatistics()};
 if(operator)operator.onchange=()=>{statisticsFilters.operatorCode=operator.value;statisticsData=null;renderStatistics()};
 if(community)community.onchange=()=>{statisticsFilters.community=community.value;statisticsData=null;renderStatistics()};
 if(refresh)refresh.onclick=()=>{statisticsData=null;renderStatistics()};
}
async function renderStatistics(){
 if(!isAdmin)statisticsFilters.operatorCode="";
 const requestId=++statisticsRequestId;
 setTitle("Estadísticas",isAdmin?"Visión global y rendimiento operativo":"Resultados de tu cartera y actividad");
 const content=document.getElementById("content");
 content.innerHTML=`${statisticsIntroHtml()}${statisticsControlsHtml()}<div class="card stats-empty">Calculando estadísticas seguras…</div>`;
 bindStatisticsControls();
 try{
   const {data,error}=await supabaseRpc("get_statistics_dashboard_v2",{
     p_period_days:Number(statisticsFilters.periodDays??30),
     p_operator_code:isAdmin?(statisticsFilters.operatorCode||null):null,
     p_community:statisticsFilters.community||null,
     p_campaign_code:currentCampaign?.code||null
   });
   if(error)throw error;
   if(requestId!==statisticsRequestId||currentView!=="stats")return;
   const payload=Array.isArray(data)&&data.length===1?data[0]:data;
   if(!payload||Number(payload.schema_version)!==2)throw new Error("STATS_PAYLOAD_INVALID");
   statisticsData=payload;paintStatistics();
 }catch(e){
   console.error(e);if(requestId!==statisticsRequestId||currentView!=="stats")return;
   content.innerHTML=`${statisticsIntroHtml()}${statisticsControlsHtml()}<div class="card stats-empty">${esc(friendlyError(e,"No se han podido calcular las estadísticas."))}</div>`;bindStatisticsControls();
 }
}
function paintStatistics(){
 if(currentView!=="stats"||!statisticsData)return;
 const s=statisticsData,k=s.kpis||{},tm=s.travel_metrics||{},period=statsPeriodLabel(s.scope?.period_days),operators=s.operators||[],zones=s.zones||[],opportunities=s.opportunities||[],recent=s.recent_activity||[],travelStatus=s.opportunities_by_status||[],travelCycles=s.opportunities_by_cycle||[],travelOperators=s.opportunities_by_operator||[];
 const onTimeHint=Number(k.due_followups_period||0)?`${statsMetric(k.on_time_followups)} de ${statsMetric(k.due_followups_period)} compromisos vencidos`:"Sin compromisos vencidos en el periodo";
 const teamHtml=isAdmin?`<div class="card stats-panel full"><h2>Rendimiento por responsable</h2><div class="panel-sub">La cartera refleja la asignación actual; los contactos contabilizan la actividad del responsable dentro de esa cartera y del periodo.</div>${operators.length?`<div class="stats-table-wrap"><table><thead><tr><th>Responsable</th><th>Cartera</th><th>Trabajados</th><th>% trabajada</th><th>Interesados</th><th>A cotización</th><th>Contactos</th><th>Vencidos</th></tr></thead><tbody>${operators.map(o=>`<tr><td><b>${esc(o.operator_name)}</b></td><td>${statsMetric(o.portfolio_total)}</td><td>${statsMetric(o.worked_centers)}</td><td>${statsMetric(Number(o.portfolio_total)?Number(o.worked_centers)*100/Number(o.portfolio_total):0,true)}</td><td>${statsMetric(o.interested_centers)}</td><td>${statsMetric(o.quoted_centers)}</td><td>${statsMetric(o.contacts_period)}</td><td class="${Number(o.overdue_followups)?"due":""}">${statsMetric(o.overdue_followups)}</td></tr>`).join("")}</tbody></table></div>`:'<div class="stats-empty">No hay responsables en este alcance.</div>'}</div>`:"";
 const opportunityHtml=opportunities.length?`<div class="stats-table-wrap"><table><thead><tr><th>Centro</th><th>Estado</th>${isAdmin?"<th>Responsable</th>":""}<th>Zona</th><th>Último contacto</th><th>Días sin contacto</th><th></th></tr></thead><tbody>${opportunities.map(o=>`<tr><td><b class="school">${esc(o.school)}</b><div class="muted">${esc(o.center_id)}</div></td><td>${statusBadge(o.status)}</td>${isAdmin?`<td>${esc(o.operator_name||o.assigned_to)}</td>`:""}<td>${esc(o.community||"Sin indicar")}</td><td>${o.last_contact_at?esc(fmtDateTime(o.last_contact_at)):"—"}</td><td>${statsMetric(o.days_without_contact)}</td><td><button class="icon-btn" type="button" data-stats-open="${esc(o.center_id)}">Abrir ficha</button></td></tr>`).join("")}</tbody></table></div>`:'<div class="stats-empty">No hay oportunidades sin un próximo contacto futuro.</div>';
 const recentHtml=recent.length?`<div class="stats-activity">${recent.map(a=>`<div class="stats-activity-item"><span><strong>${esc(a.school)}</strong><div>${isAdmin?`${esc(a.operator_name||a.operator_code)} · `:""}${esc(a.channel)} · ${esc(a.result)} · ${esc(fmtDateTime(a.contacted_at))}</div></span><button class="icon-btn" type="button" data-stats-open="${esc(a.center_id)}">Abrir</button></div>`).join("")}</div>`:'<div class="stats-empty">No hay contactos registrados en el periodo.</div>';
 const travelTeamHtml=isAdmin?`<div class="card stats-panel full"><h2>Viajes por responsable · campaña ${esc(s.campaign?.code||currentCampaign?.code||"")}</h2><div class="panel-sub">La responsabilidad se hereda del colegio; cada grupo o ciclo se contabiliza como un viaje independiente.</div>${travelOperators.length?`<div class="stats-table-wrap"><table><thead><tr><th>Responsable</th><th>Viajes</th><th>Interesados</th><th>A cotización</th><th>Vencidos</th></tr></thead><tbody>${travelOperators.map(o=>`<tr><td><b>${esc(operatorLabel(o.operator_code))}</b></td><td>${statsMetric(o.total)}</td><td>${statsMetric(o.interested)}</td><td>${statsMetric(o.quoted)}</td><td class="${Number(o.overdue)?"due":""}">${statsMetric(o.overdue)}</td></tr>`).join("")}</tbody></table></div>`:'<div class="stats-empty">Todavía no hay viajes en este alcance.</div>'}</div>`:"";
 document.getElementById("content").innerHTML=`
  ${statisticsIntroHtml()}${statisticsControlsHtml()}
  <div class="stats-kpis">
   ${statsKpi("Cartera",k.portfolio_total,"Centros activos del alcance")}
   ${statsKpi("Cartera trabajada",k.worked_centers,"Con contacto o estado actualizado")}
   ${statsKpi("% trabajada",k.worked_pct,"Trabajados / cartera","",true)}
   ${statsKpi("Interesados",k.interested_centers,"Estado actual")}
   ${statsKpi("A cotización",k.quoted_centers,"Presupuesto solicitado")}
   ${statsKpi("Conversión a presupuesto",k.quote_conversion_pct,"A cotización / trabajados","success",true)}
   ${statsKpi("Contactos",k.contacts_period,period)}
   ${statsKpi("Seguimientos vencidos",k.overdue_followups,"Foto actual · requieren atención",Number(k.overdue_followups)?"attention":"")}
   ${statsKpi("Seguimiento a tiempo",k.on_time_followups_pct,onTimeHint,"success",true)}
   ${statsKpi("Nuevos centros",k.new_centers_period,`${period} · altas manuales`)}
   ${statsKpi("Oportunidades sin atender",k.unattended_opportunities,"Interesados/cotización sin agenda futura",Number(k.unattended_opportunities)?"attention":"")}
   ${statsKpi("Para hoy",k.due_today,"Seguimientos programados hoy")}
  </div>
  <div class="section-head mt14"><div><h2>Viajes por ciclo · campaña ${esc(s.campaign?.code||currentCampaign?.code||"")}</h2><p>Un colegio puede generar varios viajes; cada uno avanza y se agenda por separado.</p></div></div>
  <div class="stats-kpis">
   ${statsKpi("Viajes",tm.opportunities_total,"Grupos activos del alcance")}
   ${statsKpi("Viajes trabajados",tm.opportunities_worked,"Con contacto o estado actualizado")}
   ${statsKpi("Viajes interesados",tm.opportunities_interested,"Estado actual")}
   ${statsKpi("Viajes a cotización",tm.opportunities_quoted,"Presupuestos solicitados")}
   ${statsKpi("Conversión por viaje",tm.opportunity_conversion_pct,"A cotización / viajes trabajados","success",true)}
   ${statsKpi("Seguimientos de viaje vencidos",tm.opportunity_followups_overdue,"Requieren atención",Number(tm.opportunity_followups_overdue)?"attention":"")}
   ${statsKpi("Viajes sin seguimiento futuro",tm.opportunities_without_future_followup,"Interesados/cotización sin próxima fecha",Number(tm.opportunities_without_future_followup)?"attention":"")}
   ${statsKpi("Nuevos viajes",tm.new_opportunities_period,period)}
  </div>
  <div class="stats-grid">
   ${teamHtml}
   ${travelTeamHtml}
   <div class="card stats-panel"><h2>Viajes por estado</h2><div class="panel-sub">Embudo real de grupos, independiente del número de colegios.</div>${statsBarRows(travelStatus,"status","count")}</div>
   <div class="card stats-panel"><h2>Viajes por ciclo</h2><div class="panel-sub">Distribución de solicitudes de la campaña activa.</div>${statsBarRows(travelCycles,"cycle","count")}</div>
   <div class="card stats-panel"><h2>Cartera por zona</h2><div class="panel-sub">Distribución actual del alcance y avance de trabajo.</div>${statsBarRows(zones,"community","portfolio_total")}${zones.length?`<div class="stats-table-wrap mt14"><table><thead><tr><th>Zona</th><th>Cartera</th><th>Trabajados</th><th>Interesados</th><th>A cotización</th><th>Vencidos</th></tr></thead><tbody>${zones.map(z=>`<tr><td>${esc(z.community)}</td><td>${statsMetric(z.portfolio_total)}</td><td>${statsMetric(z.worked_centers)}</td><td>${statsMetric(z.interested_centers)}</td><td>${statsMetric(z.quoted_centers)}</td><td class="${Number(z.overdue_followups)?"due":""}">${statsMetric(z.overdue_followups)}</td></tr>`).join("")}</tbody></table></div>`:""}</div>
   <div class="card stats-panel"><h2>Origen de la cartera</h2><div class="panel-sub">Origen declarado en las fichas activas; «Sin indicar» identifica datos heredados pendientes de clasificar.</div>${statsBarRows(s.lead_sources||[])}</div>
   <div class="card stats-panel"><h2>Canales de contacto</h2><div class="panel-sub">Actividad de ${esc(period.toLowerCase())}.</div>${statsBarRows(s.channels||[])}</div>
   <div class="card stats-panel"><h2>Actividad reciente</h2><div class="panel-sub">Últimos contactos del periodo, sin notas ni datos personales.</div>${recentHtml}</div>
   <div class="card stats-panel full"><h2>Oportunidades sin atender</h2><div class="panel-sub">Centros Interesados o A cotización que no tienen un próximo contacto futuro.</div>${opportunityHtml}</div>
  </div>
  <details class="card stats-definitions"><summary>Cómo se calculan estos indicadores</summary><ul><li><b>Cartera trabajada:</b> centro con al menos un contacto o con estado general distinto de Pendiente.</li><li><b>Viaje trabajado:</b> grupo con al menos un contacto asociado o con estado distinto de Pendiente.</li><li><b>Conversión por viaje:</b> viajes A cotización divididos entre viajes trabajados; un colegio puede aportar varios viajes.</li><li><b>Seguimiento a tiempo:</b> compromisos vencidos del periodo cuyo siguiente contacto quedó registrado antes o en la fecha y hora prevista. Los incumplidos o no atendidos reducen el porcentaje.</li><li><b>Nuevos centros:</b> sólo altas manuales creadas en el periodo; no cuenta la importación inicial.</li><li><b>Foto actual frente a periodo:</b> cartera, estados, agenda y oportunidades son actuales; contactos, altas y puntualidad usan el periodo elegido.</li></ul></details>
  <div class="stats-generated">Cálculo del servidor: ${esc(fmtDateTime(s.generated_at))} · ${esc(CRM_BUILD)}</div>`;
 bindStatisticsControls();
 document.querySelectorAll("[data-stats-open]").forEach(btn=>btn.onclick=()=>openCenter(btn.dataset.statsOpen));
}

function fmtRelativeSeconds(seconds){
 if(seconds===null||seconds===undefined||!Number.isFinite(Number(seconds)))return "—";
 const s=Math.max(0,Number(seconds));
 if(s<60)return "menos de 1 min";
 const m=Math.floor(s/60);if(m<60)return `${m} min`;
 const h=Math.floor(m/60),rm=m%60;if(h<24)return rm?`${h} h ${rm} min`:`${h} h`;
 const d=Math.floor(h/24),rh=h%24;return rh?`${d} d ${rh} h`:`${d} d`;
}
function fmtPresenceDate(v){return v?new Date(v).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—"}
async function touchPresence({interaction=false,login=false}={}){
 if(!sb||!currentUser)return;
 const now=Date.now();
 if(interaction&&!login&&now-lastPresenceInteractionSentAt<PRESENCE_INTERACTION_THROTTLE_MS)return;
 try{
   const {error}=await supabaseRpc("touch_operator_presence",{p_interaction:!!interaction,p_login:!!login});
   if(error)throw error;
   lastPresenceHeartbeatAt=now;if(interaction||login)lastPresenceInteractionSentAt=now;
 }catch(e){console.warn("No se ha podido actualizar la presencia del operador",e?.message||e)}
}
async function loadTeamPresence(){
 if(!isAdmin){teamPresence=[];return []}
 const {data,error}=await supabaseRpc("get_team_presence_v2");
 if(error)throw error;
 teamPresence=data||[];return teamPresence;
}
async function renderTeamPresence(){
 if(!isAdmin){currentView="dashboard";render();return}
 setTitle("Estado del equipo","Presencia e indicadores de actividad · visible sólo para administración");
 const content=document.getElementById("content");
 content.innerHTML='<div class="empty">Cargando estado del equipo…</div>';
 try{
   const rows=await loadTeamPresence();
   if(currentView!=="team")return;
   const online=rows.filter(r=>r.is_online).length,offline=rows.length-online;
   const today=rows.reduce((n,r)=>n+Number(r.contacts_today||0),0);
   content.innerHTML=`
    <div class="team-summary">
      ${kpi("Online",online,"operadores conectados")}
      ${kpi("Offline",offline,"sin presencia reciente")}
      ${kpi("Contactos hoy",today,"gestiones registradas")}
      ${kpi("Equipo activo",rows.length,"usuarios vinculados")}
    </div>
    <div class="card panel">
      <div class="team-refresh"><div><h2>Estado del equipo</h2><div class="muted">Online se basa en el latido de la sesión del CRM; la actividad real procede de contactos, cambios de ficha y exportaciones.</div></div><button class="btn" id="refreshTeamBtn">Actualizar</button></div>
      ${rows.length?`<div class="table-card"><table class="team-table"><thead><tr><th>Operador</th><th>Estado</th><th>Inactividad</th><th>Última interacción</th><th>Última actividad real</th><th>Último contacto</th><th>Contactos hoy</th></tr></thead><tbody>${rows.map(r=>`<tr>
        <td><div class="operator-main">${esc(r.display_name||r.operator_code)}</div><div class="operator-role">${esc(accessRoleLabel(r.role))}</div></td>
        <td><span class="team-status ${r.is_online?"online":"offline"}"><i class="team-dot"></i>${r.is_online?"Online":"Offline"}</span>${r.last_seen_at?`<div class="muted mt6">Visto ${fmtPresenceDate(r.last_seen_at)}</div>`:""}</td>
        <td>${r.is_online?esc(fmtRelativeSeconds(r.inactive_seconds)):"—"}</td>
        <td>${esc(fmtPresenceDate(r.last_interaction_at))}</td>
        <td>${esc(fmtPresenceDate(r.last_real_activity_at))}</td>
        <td>${esc(fmtPresenceDate(r.last_contact_at))}</td>
        <td><b>${Number(r.contacts_today||0).toLocaleString("es-ES")}</b></td>
      </tr>`).join("")}</tbody></table></div>`:'<div class="empty">Todavía no hay operadores vinculados.</div>'}
      <div class="team-note">“Online” significa que el CRM ha recibido presencia de esa sesión recientemente. “Inactividad” mide el tiempo desde la última interacción con el CRM; no rastrea el ratón ni otras aplicaciones. “Última actividad real” refleja acciones operativas registradas en la base.</div>
    </div>`;
   const refresh=document.getElementById("refreshTeamBtn");if(refresh)refresh.onclick=renderTeamPresence;
 }catch(e){console.error(e);if(currentView==="team")content.innerHTML='<div class="empty">No se ha podido cargar el estado del equipo.</div>'}
}

async function loadPermissionAdminData(){
 if(!isOwner){permissionUsers=[];permissionRoleAudit=[];return}
 const [usersResult,auditResult]=await Promise.all([
   supabaseRpc("owner_list_operators"),
   supabaseRpc("owner_list_role_audit",{p_limit:25})
 ]);
 if(usersResult.error)throw usersResult.error;
 if(auditResult.error)throw auditResult.error;
 permissionUsers=usersResult.data||[];permissionRoleAudit=auditResult.data||[];
}
function capturePermissionRoleDrafts(){
 if(currentView!=="permissions")return;
 const content=document.getElementById("content");if(!content)return;
 content.querySelectorAll("[data-permission-user]").forEach(card=>{
   const code=card.dataset.permissionUser,select=card.querySelector("[data-role-select]");
   const user=permissionUsers.find(u=>u.code===code);
   if(!code||!select||!user)return;
   const draft={
     baselineRole:user.access_role,
     selectedRole:select.value,
     reason:card.querySelector("[data-role-reason]")?.value||"",
     confirmCode:card.querySelector("[data-role-confirm]")?.value||""
   };
   const unchanged=draft.selectedRole===draft.baselineRole&&!draft.reason&&!draft.confirmCode;
   if(unchanged)permissionRoleDrafts.delete(code);else permissionRoleDrafts.set(code,draft);
 });
}
function permissionDraftFor(u){
 const draft=permissionRoleDrafts.get(u.code);if(!draft)return null;
 if(draft.baselineRole!==u.access_role||!["seller","manager"].includes(draft.selectedRole)){
   permissionRoleDrafts.delete(u.code);return null;
 }
 return draft;
}
function permissionUserHtml(u){
 const locked=u.access_role==="owner"||!u.active;
 const status=u.active?(u.linked?"Cuenta vinculada":"Pendiente de vincular"):"Usuario desactivado";
 const draft=locked?null:permissionDraftFor(u),selectedRole=draft?.selectedRole||u.access_role;
 const draftReason=draft?.reason||"",draftConfirm=draft?.confirmCode||"";
 const invitation=u.active&&u.access_role!=="owner"?(u.linked
   ?`<div class="permission-linked">✓ Acceso creado y vinculado a ${esc(u.email||"su cuenta de usuario")}</div>`
   :`<div class="permission-invite">
      <strong>Invitación de acceso al CRM</strong>
      <p>El correo lo enviará Supabase y la cuenta quedará vinculada automáticamente a este operador.</p>
      <div class="permission-invite-row"><label>Email corporativo<input type="email" data-invite-email maxlength="254" autocomplete="email" value="${esc(u.email||"")}" placeholder="nombre@viajesdegruposescolares.com"></label><button class="btn primary" type="button" data-invite-send="${esc(u.code)}">Enviar invitación</button></div>
      <div class="permission-invite-status" data-invite-status aria-live="polite"></div>
    </div>`):"";
 return `<div class="card permission-user" data-permission-user="${esc(u.code)}">
   <div class="permission-user-head">
    <div><div class="permission-user-name">${esc(u.display_name)}</div><div class="permission-user-meta">${esc(u.code)} · ${esc(u.email||"Sin email")}<br>${esc(status)} · ${Number(u.assigned_centers||0).toLocaleString("es-ES")} centros asignados</div></div>
    <span class="role-pill ${accessRoleClass(u.access_role)}">${esc(accessRoleLabel(u.access_role))}</span>
   </div>
   ${invitation}
   ${locked?`<div class="permission-lock">${u.access_role==="owner"?"El rol de propietario está protegido. No puede degradarse ni transferirse desde esta pantalla.":"Este usuario está desactivado y no puede recibir nuevos permisos."}</div>`:`<div class="permission-editor">
     <label>Nivel de acceso<select data-role-select><option value="seller" ${selectedRole==="seller"?"selected":""}>Comercial</option><option value="manager" ${selectedRole==="manager"?"selected":""}>Administración operativa</option></select></label>
     <label>Motivo obligatorio<input data-role-reason maxlength="500" value="${esc(draftReason)}" placeholder="Ej.: asume la supervisión operativa del equipo"></label>
     <label>Confirma escribiendo ${esc(u.code)}<input data-role-confirm autocomplete="off" value="${esc(draftConfirm)}" placeholder="${esc(u.code)}"></label>
     <button class="btn primary" type="button" data-role-save="${esc(u.code)}">Aplicar cambio</button>
   </div>`}
  </div>`;
}
async function renderPermissions(){
 if(!isOwner){permissionRoleDrafts.clear();currentView="dashboard";render();return}
 capturePermissionRoleDrafts();
 setTitle("Usuarios y permisos","Gestión reservada al propietario");
 const content=document.getElementById("content");
 content.innerHTML='<div class="empty">Cargando usuarios y permisos…</div>';
 try{
   await loadPermissionAdminData();
   if(currentView!=="permissions")return;
   content.innerHTML=`
    <div class="permission-intro"><strong>Separación de responsabilidades.</strong> La administración operativa puede ver y gestionar todo el trabajo comercial, pero no puede cambiar permisos, enviar invitaciones, obtener la copia completa ni asumir funciones reservadas al propietario. Las invitaciones y los cambios se validan nuevamente en el servidor y quedan vinculados al usuario que los autoriza.</div>
    <div class="permission-matrix">
     <div class="card permission-card owner"><h3>Propietario</h3><ul><li>Control completo del CRM</li><li>Usuarios y permisos</li><li>Copia completa y seguridad</li><li>Archivo, restauración y borrado permanente</li></ul></div>
     <div class="card permission-card manager"><h3>Administración operativa</h3><ul><li>Visión global y estadísticas</li><li>Asignar y repartir carteras</li><li>Archivar y restaurar centros</li><li>Exportación operativa, sin borrado permanente</li></ul></div>
     <div class="card permission-card seller"><h3>Comercial</h3><ul><li>Sólo su cartera y agenda</li><li>Altas manuales autoasignadas</li><li>Sus contactos e historial</li><li>Sin archivo, borrado ni gestión de usuarios</li></ul></div>
    </div>
    <div class="section-head"><div><h2>Usuarios del CRM</h2><p>${permissionUsers.length.toLocaleString("es-ES")} perfiles operativos · el rol de propietario permanece protegido</p></div></div>
    <div class="permission-users">${permissionUsers.length?permissionUsers.map(permissionUserHtml).join(""):'<div class="card permission-empty">No hay usuarios operativos.</div>'}</div>
    <div class="card panel permission-audit"><h2>Historial de cambios de rol</h2>
     ${permissionRoleAudit.length?`<div class="timeline">${permissionRoleAudit.map(a=>`<div class="event"><div class="event-head"><div><strong>${esc(a.operator_name||a.operator_code)}</strong> · ${esc(accessRoleLabel(a.old_role))} → ${esc(accessRoleLabel(a.new_role))}</div><span>${esc(fmtPresenceDate(a.changed_at))}</span></div><div class="event-note">${esc(a.reason)}</div><div class="muted mt6">Autorizado por ${esc(a.changed_by_name||a.changed_by_operator)}</div></div>`).join("")}</div>`:'<div class="permission-empty">Todavía no se ha realizado ningún cambio de rol.</div>'}
    </div>`;
   content.querySelectorAll("[data-role-save]").forEach(btn=>btn.onclick=()=>applyOperatorRoleChange(btn));
   content.querySelectorAll("[data-invite-send]").forEach(btn=>btn.onclick=()=>inviteOperatorAccess(btn));
 }catch(e){console.error(e);if(currentView==="permissions")content.innerHTML=`<div class="empty">${esc(friendlyError(e,"No se ha podido cargar la gestión de permisos."))}</div>`}
}
function invitationErrorMessage(code){
 return ({
  OWNER_REQUIRED:"Esta acción está reservada al propietario.",
  INVALID_SESSION:"La sesión ha caducado. Vuelve a iniciar sesión.",
  INVALID_INVITATION_DATA:"Revisa el operador y el email corporativo.",
  INVALID_VGE_EMAIL:"Utiliza una cuenta @viajesdegruposescolares.com.",
  OPERATOR_NOT_INVITABLE:"El operador no está activo o no admite invitaciones.",
  OPERATOR_ALREADY_LINKED:"Este operador ya tiene una cuenta vinculada.",
  EMAIL_ALREADY_ASSIGNED:"Ese email ya pertenece a otro operador.",
  EMAIL_ALREADY_REGISTERED:"Ese email ya existe en Supabase Auth. Utiliza la recuperación de contraseña o revisa su vinculación.",
  INVITE_DELIVERY_FAILED:"Supabase no ha podido enviar la invitación. Inténtalo de nuevo más tarde.",
  INVITE_SENT_LINK_PENDING:"El correo salió, pero la vinculación quedó pendiente. No reenvíes la invitación y contacta con administración.",
  AUTH_LOOKUP_FAILED:"No se ha podido comprobar el estado de los usuarios.",
  SERVER_CONFIGURATION_ERROR:"La función de invitaciones no está configurada correctamente."
 })[code]||"No se ha podido enviar la invitación.";
}
async function inviteOperatorAccess(btn){
 if(!isOwner){alert("Esta acción está reservada al propietario.");return}
 const card=btn.closest("[data-permission-user]");if(!card)return;
 const code=card.dataset.permissionUser;
 const current=permissionUsers.find(u=>u.code===code);
 const input=card.querySelector("[data-invite-email]");
 const status=card.querySelector("[data-invite-status]");
 const email=String(input?.value||"").trim().toLowerCase();
 if(!current){alert("No se ha encontrado el operador.");return}
 if(!/^[^\s@]+@viajesdegruposescolares\.com$/.test(email)){status.className="permission-invite-status error";status.textContent="Escribe un email corporativo válido.";input?.focus();return}
 if(!confirm(`Vas a enviar una invitación de acceso al CRM.\n\nOperador: ${current.display_name} (${code})\nEmail: ${email}\nRol inicial: ${accessRoleLabel(current.access_role)}\n\nLa cuenta quedará vinculada automáticamente. ¿Enviar ahora?`))return;
 btn.disabled=true;btn.textContent="Enviando…";if(input)input.disabled=true;status.className="permission-invite-status";status.textContent="Comprobando usuario y enviando invitación…";
 try{
   const {data,error}=await supabaseFunction("vge-admin-invite-operator",{body:{operator_code:code,email}});
   let codeError=data?.error||"";
   if(error){
     try{const detail=await error.context?.json();codeError=detail?.error||codeError}catch{}
     throw new Error(codeError||error.message||"INVITE_FAILED");
   }
   if(!data?.ok)throw new Error(codeError||"INVITE_FAILED");
   status.className="permission-invite-status success";status.textContent=`Invitación enviada a ${email}.`;
   toast(`Invitación enviada a ${current.display_name}`);
   await loadOperators();
   await renderPermissions();
 }catch(e){
   console.error(e);const codeError=String(e?.message||"INVITE_FAILED");
   status.className="permission-invite-status error";status.textContent=invitationErrorMessage(codeError);
   btn.disabled=false;btn.textContent="Enviar invitación";if(input)input.disabled=false;
 }
}
async function applyOperatorRoleChange(btn){
 if(!isOwner){alert("Esta acción está reservada al propietario.");return}
 const card=btn.closest("[data-permission-user]");if(!card)return;
 const code=card.dataset.permissionUser;
 const newRole=card.querySelector("[data-role-select]")?.value||"";
 const reason=card.querySelector("[data-role-reason]")?.value.trim()||"";
 const confirmCode=card.querySelector("[data-role-confirm]")?.value.trim()||"";
 const current=permissionUsers.find(u=>u.code===code);
 if(!current){alert("No se ha encontrado el usuario.");return}
 if(current.access_role===newRole){alert("El usuario ya tiene ese nivel de acceso.");return}
 if(reason.length<8){alert("Indica un motivo de al menos 8 caracteres.");return}
 if(confirmCode!==code){alert(`Para confirmar, escribe exactamente ${code}.`);return}
 const warning=newRole==="manager"?"tendrá acceso operativo a todas las carteras, asignaciones y estado del equipo":"perderá el acceso global y sólo podrá trabajar con su cartera";
 if(!confirm(`Vas a cambiar a ${current.display_name} a «${accessRoleLabel(newRole)}»: ${warning}.\n\nEl cambio quedará auditado. ¿Continuar?`))return;
 btn.disabled=true;btn.textContent="Aplicando…";
 try{
   const {error}=await supabaseRpc("owner_set_operator_access_role",{p_code:code,p_new_role:newRole,p_reason:reason,p_confirm_code:confirmCode});
   if(error)throw error;
   permissionRoleDrafts.delete(code);
   await loadOperators();
   toast(`Permisos actualizados para ${current.display_name}`);
   await renderPermissions();
 }catch(e){console.error(e);alert(friendlyError(e,"No se ha podido cambiar el nivel de acceso."));btn.disabled=false;btn.textContent="Aplicar cambio"}
}

function lifecycleActionLabel(action){return ({archive:"Archivado",restore:"Restaurado",permanent_delete:"Borrado permanente"})[action]||action}
function lifecycleActionClass(action){return action==="archive"?"lifecycle-action-archive":action==="restore"?"lifecycle-action-restore":"lifecycle-action-delete"}
function archivedFilteredRows(){
 const q=norm(archivedSearch);
 if(!q)return archivedCenters.slice();
 return archivedCenters.filter(c=>norm([c.center_id,c.school,c.city,c.province,c.community,c.assigned_to_name,c.status,c.archive_reason,c.archived_by_name].join(" ")).includes(q));
}
function paintArchivedCenters(){
 if(currentView!=="archived"||!permissions.can_archive_centers)return;
 const rows=archivedFilteredRows(),content=document.getElementById("content");
 content.innerHTML=`
  <div class="lifecycle-intro"><strong>Archivo reversible.</strong> Una ficha archivada desaparece de carteras, agenda, búsquedas operativas y accesos comerciales, pero conserva sus datos e historial para poder restaurarla. Sólo el propietario puede realizar el borrado permanente, siempre desde esta pantalla.</div>
  <div class="section-head"><div><h2>Centros archivados</h2><p>${rows.length.toLocaleString("es-ES")} de ${archivedCenters.length.toLocaleString("es-ES")} fichas archivadas</p></div></div>
  <div class="filters"><input class="search" id="archivedSearch" placeholder="Buscar por centro, ID, ubicación, responsable o motivo…" value="${esc(archivedSearch)}"></div>
  <div class="table-card">
   ${rows.length?`<table><thead><tr><th>Centro</th><th>Ubicación</th><th>Último responsable</th><th>Estado</th><th>Contactos</th><th>Archivado</th><th>Motivo</th><th></th></tr></thead><tbody>${rows.map(c=>`<tr>
    <td><div class="school">${esc(c.school)}</div><div class="muted">${esc(c.center_id)}</div></td>
    <td>${esc(c.city||"—")}<div class="muted">${esc(c.community||c.province||"")}</div></td>
    <td>${esc(c.assigned_to_name||c.assigned_to||"Sin asignar")}</td>
    <td>${statusBadge(c.status||"Pendiente")}${c.next_contact_at?`<div class="muted mt6">Agenda conservada: ${esc(fmtDateTime(c.next_contact_at))}</div>`:""}</td>
    <td><b>${Number(c.contact_events_count||c.contact_count||0).toLocaleString("es-ES")}</b></td>
    <td>${esc(fmtPresenceDate(c.archived_at))}<div class="muted">por ${esc(c.archived_by_name||c.archived_by_operator||"—")}</div></td>
    <td class="archived-reason">${esc(c.archive_reason||"—")}</td>
    <td><div class="lifecycle-actions"><button class="btn" type="button" data-restore-center="${esc(c.center_id)}">Restaurar</button>${isOwner?`<button class="btn danger" type="button" data-delete-center="${esc(c.center_id)}">Borrar definitivamente</button>`:""}</div></td>
   </tr>`).join("")}</tbody></table>`:'<div class="empty">No hay centros archivados con este criterio.</div>'}
  </div>
  <div class="card panel lifecycle-audit"><h2>Historial del ciclo de vida</h2>
   ${lifecycleAudit.length?`<div class="timeline">${lifecycleAudit.slice(0,100).map(a=>`<div class="event"><div class="event-head"><div><strong>${esc(a.center_school||a.center_id)}</strong> · ${esc(a.center_id)} <span class="event-tag ${lifecycleActionClass(a.action)}">${esc(lifecycleActionLabel(a.action))}</span></div><span>${esc(fmtPresenceDate(a.acted_at))}</span></div><div class="event-note">${esc(a.reason)}</div><div class="muted mt6">Autorizado por ${esc(a.acted_by_name||a.acted_by_operator)} · ${Number(a.contact_events_count||0).toLocaleString("es-ES")} contactos en ese momento</div></div>`).join("")}</div>`:'<div class="empty">Todavía no se ha archivado, restaurado ni eliminado ningún centro.</div>'}
  </div>`;
 const search=content.querySelector("#archivedSearch");if(search)search.addEventListener("input",()=>{archivedSearch=search.value;const pos=search.selectionStart??search.value.length;paintArchivedCenters();requestAnimationFrame(()=>{const n=document.getElementById("archivedSearch");if(n){n.focus();try{n.setSelectionRange(Math.min(pos,n.value.length),Math.min(pos,n.value.length))}catch{}}})});
 content.querySelectorAll("[data-restore-center]").forEach(btn=>btn.onclick=()=>restoreArchivedCenter(btn.dataset.restoreCenter,btn));
 content.querySelectorAll("[data-delete-center]").forEach(btn=>btn.onclick=()=>permanentlyDeleteArchivedCenter(btn.dataset.deleteCenter,btn));
}
async function renderArchivedCenters(){
 if(!permissions.can_archive_centers){currentView="dashboard";render();return}
 setTitle("Centros archivados","Gestión reversible y borrado permanente controlado");
 const content=document.getElementById("content");content.innerHTML='<div class="empty">Cargando centros archivados…</div>';
 try{
   await Promise.all([loadArchivedCenters(),loadLifecycleAudit(100)]);
   if(currentView==="archived")paintArchivedCenters();
 }catch(e){console.error(e);if(currentView==="archived")content.innerHTML=`<div class="empty">${esc(friendlyError(e,"No se ha podido cargar el archivo de centros."))}</div>`}
}
async function restoreArchivedCenter(id,btn){
 if(!permissions.can_restore_centers){alert("Esta acción está reservada a la administración operativa.");return}
 const center=archivedCenters.find(c=>c.center_id===id);if(!center){alert("La ficha archivada ya no está disponible.");return}
 const raw=prompt(`Motivo de la restauración de ${center.school} (${id}):`);if(raw===null)return;
 const reason=raw.trim();if(reason.length<8||reason.length>500){alert("Indica un motivo de entre 8 y 500 caracteres.");return}
 if(!confirm(`Se restaurará ${center.school} (${id}) y volverá a estar disponible para su responsable.\n\n¿Continuar?`))return;
 btn.disabled=true;btn.textContent="Restaurando…";
 try{
   const {error}=await supabaseRpc("restore_center",{p_center_id:id,p_reason:reason});if(error)throw error;
   await loadAll();await loadLifecycleAudit(100);accessFingerprint=await getFingerprint();updateNavCounts();paintArchivedCenters();toast(`Centro restaurado · ${id}`);
 }catch(e){console.error(e);alert(friendlyError(e,"No se ha podido restaurar el centro."));btn.disabled=false;btn.textContent="Restaurar"}
}
async function permanentlyDeleteArchivedCenter(id,btn){
 if(!isOwner||!permissions.can_delete_permanently){alert("El borrado permanente está reservado al propietario.");return}
 const center=archivedCenters.find(c=>c.center_id===id);if(!center){alert("La ficha archivada ya no está disponible.");return}
 const rawReason=prompt(`Motivo obligatorio del borrado permanente de ${center.school} (${id}):`);if(rawReason===null)return;
 const reason=rawReason.trim();if(reason.length<8||reason.length>500){alert("Indica un motivo de entre 8 y 500 caracteres.");return}
 const typed=prompt(`Esta acción eliminará la ficha, sus ${Number(center.contact_events_count||0).toLocaleString("es-ES")} contactos, agenda y auditorías con datos personales.\n\nPara confirmar, escribe exactamente: ${id}`);if(typed===null)return;
 if(typed.trim()!==id){alert(`La confirmación no coincide. Debes escribir exactamente ${id}.`);return}
 if(!confirm(`ÚLTIMA CONFIRMACIÓN\n\nSe borrará definitivamente ${center.school} (${id}). Esta acción no se puede deshacer desde el CRM.\n\n¿Confirmas el borrado permanente?`))return;
 btn.disabled=true;btn.textContent="Borrando…";
 try{
   const {error}=await supabaseRpc("owner_permanently_delete_center",{p_center_id:id,p_reason:reason,p_confirm_center_id:typed.trim()});if(error)throw error;
   await loadAll();await loadLifecycleAudit(100);accessFingerprint=await getFingerprint();updateNavCounts();paintArchivedCenters();toast(`Centro eliminado permanentemente · ${id}`);
 }catch(e){console.error(e);alert(friendlyError(e,"No se ha podido borrar el centro."));btn.disabled=false;btn.textContent="Borrar definitivamente"}
}

function baseForView(){
 if(currentView==="mine"||currentView==="status")return centers.filter(c=>c.assignedTo===currentUser);
 if(currentView==="followups")return agendaRows(false);
 if(currentView==="overdue")return overdueCandidates();
 if(currentView==="unassigned")return centers.filter(c=>c.assignedTo==="Sin asignar");
 return centers.slice();
}
function filtered(){
 let arr=baseForView(), t=localISO(), q=norm(filters.search);
 if(q)arr=arr.filter(c=>norm([c.school,c.city,c.province,c.community,c.id,c.contactName,c.schoolEmail,c.directEmail,c._agendaItem?.title,c._agendaItem?.opportunity_id].join(" ")).includes(q));
 const statusFilter=currentView==="status"?activeStatus:filters.status;
 if(statusFilter)arr=arr.filter(c=>portfolioStatus(c)===statusFilter);
 if(filters.community)arr=arr.filter(c=>c.community===filters.community);
 if(filters.seller)arr=arr.filter(c=>c.assignedTo===filters.seller);
 if(filters.quick==="pending")arr=arr.filter(c=>portfolioStatus(c)==="Pendiente");
 if(filters.quick==="today")arr=arr.filter(c=>nextParts(c).date===t);
 if(filters.quick==="overdue")arr=arr.filter(c=>isDueNow(c));
 if(filters.quick==="info")arr=arr.filter(c=>portfolioStatus(c)==="Interesado");
 if(filters.quick==="quote")arr=arr.filter(c=>portfolioStatus(c)==="Trasladado a cotización");
 if(filters.quick==="quality-phone")arr=arr.filter(c=>!String(c.mobile||c.schoolPhone||"").trim());
 if(filters.quick==="quality-email")arr=arr.filter(c=>!String(c.directEmail||c.schoolEmail||"").trim());
 if(filters.quick==="quality-contact")arr=arr.filter(c=>!String(c.contactName||"").trim());
 if(filters.quick==="quality-travel")arr=arr.filter(c=>Number(c.opportunityTotal||0)===0);
 if(filters.quick==="quality-followup")arr=arr.filter(c=>["Interesado","Trasladado a cotización"].includes(portfolioStatus(c))&&!hasFutureFollowup(c));
 arr.sort((a,b)=>{
  const ad=nextKey(a)||"9999-12-31T99:99",bd=nextKey(b)||"9999-12-31T99:99";
  if(ad!==bd)return ad.localeCompare(bd);
  return a.school.localeCompare(b.school,"es");
 });
 return arr;
}
function renderList(){
 const titles={mine:["Mi cartera",`Centros asignados a ${currentUserLabel()}`],followups:["Agenda / seguimientos",`Tareas generales y viajes programados · ${currentUserLabel()}`],overdue:["ACTUALIZAR AGENDA",`Seguimientos generales o de viaje cuya fecha/hora ya ha vencido · ${currentUserLabel()}`],all:["Todos los centros","Vista general del equipo · incluye asignados y sin asignar"],unassigned:["Centros sin asignar","Pendientes de reparto"],status:[activeStatus,`Mi cartera · estado ${activeStatus} · ${currentUserLabel()}`]};
 setTitle(...titles[currentView]);
 const base=baseForView();
 const communities=[...new Set(base.map(c=>c.community).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
 const showSeller=currentView==="all";
 const showStatusFilter=currentView!=="status";
 const data=filtered(), pageSize=50,totalPages=Math.max(1,Math.ceil(data.length/pageSize));currentPage=Math.min(currentPage,totalPages);
 const start=(currentPage-1)*pageSize, page=data.slice(start,start+pageSize);
 const assignmentNote=currentView==="unassigned"&&!isAdmin?'<div class="notice">La asignación de centros está reservada a usuarios con rol administrador. Puedes consultar la información, pero no modificar el responsable.</div>':"";
 const overdueNote=currentView==="overdue"&&data.length?`<div class="agenda-warning"><div><strong>⚠ ${data.length.toLocaleString("es-ES")} seguimiento${data.length===1?"":"s"} pendiente${data.length===1?"":"s"} de actualizar.</strong><div>Cada línea corresponde a una tarea general o a un viaje concreto cuya fecha/hora ya ha vencido. Al registrar el contacto y la siguiente fecha, desaparecerá de esta lista.</div></div><button class="btn" id="emailOverdueBtn">✉ Preparar aviso a info@viajesdegruposescolares.com</button></div>`:"";
 document.getElementById("content").innerHTML=`
 ${assignmentNote}${overdueNote}
 <div class="section-head"><div><h2>${esc(titles[currentView][0])}</h2><p>${data.length.toLocaleString("es-ES")} ${["followups","overdue"].includes(currentView)?"seguimientos":"centros"} encontrados</p></div></div>
 <div class="filters">
   <input class="search" id="searchFilter" placeholder="Buscar centro, ciudad, provincia, ID o contacto…" value="${esc(filters.search)}">
   ${showStatusFilter?`<select id="statusFilter"><option value="">Todos los estados</option>${options(STATUSES,filters.status)}</select>`:""}
   <select id="communityFilter"><option value="">Todas las zonas</option>${communities.map(x=>`<option ${x===filters.community?"selected":""}>${esc(x)}</option>`).join("")}</select>
   ${showSeller?`<select id="sellerFilter"><option value="">Todo el equipo</option>${operatorOptions(filters.seller,false)}</select>`:""}
 </div>
 ${!["status","overdue"].includes(currentView)?`<div class="chips">
  ${chip("all","Todos")}${chip("pending","Pendientes")}${chip("today","Hoy")}${chip("overdue","Vencidos ahora")}${chip("info","Interesados")}${chip("quote","A cotización")}${filters.quick.startsWith("quality-")?chip(filters.quick,({"quality-phone":"Sin teléfono","quality-email":"Sin email","quality-contact":"Sin persona","quality-travel":"Sin viaje","quality-followup":"Sin seguimiento"})[filters.quick]):""}
 </div>`:""}
 <div class="table-card">
  ${page.length?`<table><thead><tr><th>Estado</th><th>Próximo</th><th>Centro</th><th>Contacto</th><th>Ubicación</th>${showSeller?'<th>Responsable</th>':''}<th>Contacto rápido</th><th>Última actividad</th><th></th></tr></thead>
  <tbody>${page.map(c=>rowHtml(c,showSeller)).join("")}</tbody></table>
  <div class="pagination"><span>${start+1}–${Math.min(start+pageSize,data.length)} de ${data.length.toLocaleString("es-ES")}</span><span class="page-tools"><button data-page="-1" ${currentPage<=1?"disabled":""}>Anterior</button> <b>${currentPage}/${totalPages}</b> <button data-page="1" ${currentPage>=totalPages?"disabled":""}>Siguiente</button><span class="page-jump">Ir a <input id="pageJumpInput" type="number" min="1" max="${totalPages}" value="${currentPage}" aria-label="Número de página"><button class="btn" id="goPageBtn">Ir</button></span></span></div>`:'<div class="empty">No hay centros con estos filtros.</div>'}
 </div>`;
 bindFilters();
 const emailOverdueBtn=document.getElementById("emailOverdueBtn");if(emailOverdueBtn)emailOverdueBtn.onclick=openOverdueSummaryEmail;
}
function chip(v,label){return `<button class="chip ${filters.quick===v?"active":""}" data-quick="${v}">${label}</button>`}
function rowHtml(c,showSeller){
 const le=lastEvent(c), contact=c.contactName||"—", email=c.contactBlocked?"":(c.directEmail||c.schoolEmail), phone=c.contactBlocked?"":(c.mobile||c.schoolPhone),n=nextParts(c),task=c._agendaItem;
 return `<tr data-open="${esc(c.id)}">
  <td>${statusBadge(portfolioStatus(c))}${!task&&c.opportunityTotal?'<div class="muted mt6">Resumen de viajes</div>':""}</td>
  <td class="${dueType(c)} nowrap">${fmtDate(n.date)}${n.time?`<span class="next-time">${esc(n.time)}</span>`:""}</td>
  <td>${task?`<span class="task-kind ${task.task_type==="Centro"?"general":""}">${esc(task.task_type)}</span>`:""}<div class="school">${esc(c.school)}</div><div class="muted">${esc(task?.title||c.id)}${task?.opportunity_id?` · ${esc(task.opportunity_id)}`:""}</div>${!task&&c.opportunityTotal?`<div class="travel-summary"><span class="event-tag">${c.opportunityTotal} viaje${c.opportunityTotal===1?"":"s"}</span>${c.opportunityInterested?`<span class="event-tag">${c.opportunityInterested} interesado${c.opportunityInterested===1?"":"s"}</span>`:""}${c.opportunityQuoted?`<span class="event-tag">${c.opportunityQuoted} a cotización</span>`:""}</div>`:""}</td>
  <td>${esc(contact)}${c.role?`<div class="muted">${esc(c.role)}</div>`:""}</td>
  <td>${esc(c.city)}<div class="muted">${esc(c.community)}</div></td>
  ${showSeller?`<td>${esc(operatorLabel(c.assignedTo))}</td>`:""}
  <td class="nowrap">${phone?`<a class="icon-btn" href="tel:${esc(phone.replace(/\s/g,""))}">☎</a>`:""}${email?task?`<button class="icon-btn" type="button" data-email-task="${esc(task.task_key)}">✉</button>`:`<button class="icon-btn" type="button" data-email-center="${esc(c.id)}">✉</button>`:""}${currentView==="overdue"?`<button class="icon-btn" type="button" title="Preparar aviso a info@viajesdegruposescolares.com" data-overdue-email="${esc(task?.task_key||c.id)}">⚠✉</button>`:""}</td>
  <td>${le?`<b>${esc(le.result)}</b><div class="muted">${esc(le.author)} · ${fmtDate(le.date)}</div>`:'<span class="muted">Sin contactos</span>'}</td>
  <td><button class="icon-btn" data-open="${esc(c.id)}">Abrir ficha</button></td>
 </tr>`;
}
function bindFilters(){
 const search=document.getElementById("searchFilter");
 if(search){
  search.addEventListener("input",()=>{
   filters.search=search.value;currentPage=1;clearTimeout(searchTimer);
   const pos=search.selectionStart??search.value.length;
   searchTimer=setTimeout(()=>{renderList();requestAnimationFrame(()=>{const n=document.getElementById("searchFilter");if(n){n.focus();const p=Math.min(pos,n.value.length);try{n.setSelectionRange(p,p)}catch(e){}}})},400);
  });
 }
 const bindChange=(id,key)=>{const el=document.getElementById(id);if(el)el.addEventListener("change",()=>{filters[key]=el.value;currentPage=1;renderList()})};
 bindChange("statusFilter","status");bindChange("communityFilter","community");bindChange("sellerFilter","seller");
 document.querySelectorAll("[data-quick]").forEach(b=>b.onclick=()=>{filters.quick=b.dataset.quick;currentPage=1;renderList()});
 document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>{currentPage+=Number(b.dataset.page);renderList()});
 const jump=()=>{const inp=document.getElementById("pageJumpInput");if(!inp)return;const max=Number(inp.max)||1;const n=Math.max(1,Math.min(max,Number(inp.value)||1));currentPage=n;renderList()};
 const go=document.getElementById("goPageBtn");if(go)go.onclick=jump;
 const pi=document.getElementById("pageJumpInput");if(pi)pi.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();jump()}});
 document.querySelectorAll("tr[data-open]").forEach(el=>el.onclick=e=>{if(e.target.closest("a")||e.target.closest("button"))return;openCenter(el.dataset.open)});
 document.querySelectorAll("button[data-open]").forEach(el=>el.onclick=e=>{e.stopPropagation();openCenter(el.dataset.open)});
}


function bulkScopeValues(kind){
 const vals=centers.map(c=>kind==="province"?c.province:c.community).filter(Boolean);
 return [...new Set(vals)].sort((a,b)=>a.localeCompare(b,"es"));
}
function bulkTargets(kind,zone){return centers.filter(c=>(kind==="province"?c.province:c.community)===zone)}
function bulkPercentages(){return [...document.querySelectorAll(".bulk-op-pct")].map(el=>({user:el.dataset.code,pct:Number(el.value||0)}))}
function quotaFor(total,parts){
 const q=parts.map((x,i)=>({...x,raw:total*x.pct/100,idx:i}));let used=0;q.forEach(x=>{x.count=Math.floor(x.raw);used+=x.count});
 q.sort((a,b)=>(b.raw-b.count)-(a.raw-a.count)||a.idx-b.idx);for(let i=0;i<total-used;i++)q[i%q.length].count++;
 q.sort((a,b)=>a.idx-b.idx);return q;
}
function renderBulkAssignment(){
 setTitle("Asignación masiva","Distribución de centros por comunidad o provincia");
 const saved=loadBulkUiState();
 const initialKind=saved?.kind==="province"?"province":"community";
 const vals=bulkScopeValues(initialKind);
 const initialZone=(saved?.zone&&vals.includes(saved.zone))?saved.zone:(vals[0]||"");
 const defaults=defaultBulkPercentages();
 const initialPct={};
 OPERATORS.forEach(o=>{const v=Number(saved?.percentages?.[o.code]);initialPct[o.code]=Number.isFinite(v)?v:(defaults[o.code]||0)});
 const lastResult=loadBulkLastResult();
 document.getElementById("content").innerHTML=`
 <div class="bulk-card">
  <div class="section-head"><div><h2>Asignar una zona por porcentajes</h2><p>Selecciona comunidad o provincia y reparte el 100% entre los operadores activos. Puedes incorporar nuevos vendedores sin modificar el CRM.</p></div></div>
  <div class="bulk-grid">
   <div class="field"><label>Tipo de zona</label><select id="bulkKind"><option value="community" ${initialKind==="community"?"selected":""}>Comunidad autónoma</option><option value="province" ${initialKind==="province"?"selected":""}>Provincia</option></select></div>
   <div class="field"><label>Zona</label><select id="bulkZone">${vals.map(v=>`<option ${v===initialZone?"selected":""}>${esc(v)}</option>`).join("")}</select></div>
  </div>
  <div class="bulk-percentages">
   ${OPERATORS.map(o=>`<div class="field"><label>${esc(o.display_name)} (%)</label><input class="bulk-op-pct" data-code="${esc(o.code)}" type="number" min="0" max="100" step="1" value="${initialPct[o.code]||0}"></div>`).join("")}
  </div>
  <div class="bulk-preview" id="bulkPreview"></div>  ${lastResult?`<div class="bulk-success"><strong>Último reparto aplicado correctamente</strong>${esc(lastResult.scopeLabel)} · ${esc(lastResult.zone)} · ${Number(lastResult.total||0).toLocaleString("es-ES")} centros.<br>${(lastResult.quotas||[]).map(x=>`${esc(operatorLabel(x.user))}: ${Number(x.count||0).toLocaleString("es-ES")} (${Number(x.pct||0)}%)`).join(" · ")}</div>`:""}
  <div class="bulk-warning"><strong>Importante:</strong> al aplicar, se sustituirá la asignación actual de todos los centros de la zona seleccionada por el reparto indicado.</div>
  <div class="mt14"><button class="btn primary" id="applyBulkBtn">Aplicar reparto masivo</button></div>
 </div>`;
 const kindEl=document.getElementById("bulkKind"),zoneEl=document.getElementById("bulkZone");
 const refreshZones=()=>{
   const vals=bulkScopeValues(kindEl.value);
   zoneEl.innerHTML=vals.map(v=>`<option>${esc(v)}</option>`).join("");
   saveBulkStateFromDom();updateBulkPreview();
 };
 kindEl.onchange=refreshZones;
 zoneEl.onchange=()=>{saveBulkStateFromDom();updateBulkPreview()};
 document.querySelectorAll(".bulk-op-pct").forEach(el=>el.oninput=()=>{saveBulkStateFromDom();updateBulkPreview()});
 document.getElementById("applyBulkBtn").onclick=applyBulkAssignment;
 saveBulkStateFromDom();updateBulkPreview();
}
function updateBulkPreview(){
 const kind=document.getElementById("bulkKind")?.value||"community",zone=document.getElementById("bulkZone")?.value||"",target=bulkTargets(kind,zone),parts=bulkPercentages(),sum=parts.reduce((a,b)=>a+b.pct,0),box=document.getElementById("bulkPreview");if(!box)return;
 const quotas=sum===100?quotaFor(target.length,parts):parts.map(x=>({...x,count:0}));
 box.innerHTML=`<strong>Vista previa</strong><div class="muted">${target.length.toLocaleString("es-ES")} centros afectados · Porcentajes: <b>${sum}%</b>${sum!==100?' · Deben sumar exactamente 100%':''}</div><div class="bulk-preview-grid">${quotas.map(x=>`<div class="bulk-box"><span>${esc(operatorLabel(x.user))}</span><b>${x.count.toLocaleString("es-ES")}</b><small>${x.pct}%</small></div>`).join("")}<div class="bulk-box"><span>Total</span><b>${target.length.toLocaleString("es-ES")}</b><small>${esc(zone)}</small></div></div>`;
}
async function applyBulkAssignment(){
 if(!isAdmin){alert("Sólo el administrador puede hacer asignaciones masivas.");return}
 const kind=document.getElementById("bulkKind").value,zone=document.getElementById("bulkZone").value,parts=bulkPercentages(),sum=parts.reduce((a,b)=>a+b.pct,0);
 if(sum!==100){alert("Los porcentajes deben sumar exactamente 100%.");return}
 const target=bulkTargets(kind,zone);if(!target.length){alert("No hay centros en esa zona.");return}
 const quotas=quotaFor(target.length,parts);
 const scopeLabel=kind==="province"?"Provincia":"Comunidad autónoma";
 const detail=quotas.map(x=>`${operatorLabel(x.user)}: ${x.count.toLocaleString("es-ES")} (${x.pct}%)`).join("\n");
 const confirmText=`Vas a sustituir la asignación actual de ${target.length.toLocaleString("es-ES")} centros.\n\n${scopeLabel}: ${zone}\n${detail}\n\nEsta operación modificará los responsables actuales de toda la zona seleccionada.\n\n¿Confirmar reparto?`;
 if(!confirm(confirmText))return;
 saveBulkStateFromDom();
 const shares=Object.fromEntries(parts.map(x=>[x.user,x.pct]));
 const btn=document.getElementById("applyBulkBtn");if(btn){btn.disabled=true;btn.textContent="Aplicando reparto…"}
 const {data,error}=await supabaseRpc("bulk_assign_zone",{p_scope_type:kind,p_scope_value:zone,p_shares:shares});
 if(error){console.error(error);if(btn){btn.disabled=false;btn.textContent="Aplicar reparto masivo"}alert(friendlyError(error,"No se ha podido aplicar el reparto masivo."));return}
 saveBulkLastResult({scopeLabel,zone,total:target.length,quotas,appliedAt:new Date().toISOString()});
 await loadAll();updateNavCounts();
 renderBulkAssignment();
 toast(`Reparto aplicado correctamente · ${scopeLabel}: ${zone} · ${target.length.toLocaleString("es-ES")} centros`);
}
function exportRowsForCurrentView(){
 if(currentView==="archived")return [];
 let arr;
 if(currentView==="mine"||currentView==="dashboard")arr=centers.filter(c=>c.assignedTo===currentUser);
 else if(currentView==="status")arr=centers.filter(c=>c.assignedTo===currentUser&&(!activeStatus||portfolioStatus(c)===activeStatus));
 else if(currentView==="followups")arr=agendaRows(false);
 else if(currentView==="overdue")arr=overdueCandidates();
 else if(currentView==="unassigned")arr=centers.filter(c=>c.assignedTo==="Sin asignar");
 else if(currentView==="all"||currentView==="bulk")arr=isAdmin?centers.slice():centers.filter(c=>c.assignedTo===currentUser);
 else arr=centers.filter(c=>c.assignedTo===currentUser);
 arr=arr.slice();
 arr.sort((a,b)=>{
  const ad=nextKey(a)||"9999-12-31T99:99",bd=nextKey(b)||"9999-12-31T99:99";
  if(ad!==bd)return ad.localeCompare(bd);
  return a.school.localeCompare(b.school,"es");
 });
 return arr;
}
async function safeExportRowsForCurrentView(){
 const wanted=exportRowsForCurrentView();
 const wantedIds=new Set(wanted.map(c=>c.id));
 const rows=await fetchAllRows("crm_export_centers");
 const byId=new Map(rows.filter(r=>wantedIds.has(r.id)).map(r=>[r.id,r]));
 return wanted.map(c=>{const r=byId.get(c.id);if(!r)return {...c,mobile:"",directEmail:""};return {...c,mobile:r.contact_mobile||"",directEmail:r.contact_email||"",contactBlocked:!!r.contact_blocked,contactCount:Number(r.contact_count||0),lastResult:r.last_result||"",lastContactAt:r.last_contact_at||c.lastContactAt};});
}
function xmlEsc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function colName(n){let s="";while(n>0){n--;s=String.fromCharCode(65+(n%26))+s;n=Math.floor(n/26)}return s}
const CRC32_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(bytes){let c=0xFFFFFFFF;for(const b of bytes)c=CRC32_TABLE[(c^b)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function u16(n){return [n&255,(n>>>8)&255]}
function u32(n){return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
function concatBytes(parts){const len=parts.reduce((a,p)=>a+p.length,0),out=new Uint8Array(len);let off=0;for(const p of parts){out.set(p,off);off+=p.length}return out}
function makeZip(files){
 const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;
 for(const f of files){
   const name=enc.encode(f.name),data=typeof f.data==="string"?enc.encode(f.data):f.data,crc=crc32(data);
   const local=new Uint8Array([
     ...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),
     ...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0)
   ]);
   locals.push(local,name,data);
   const central=new Uint8Array([
     ...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),
     ...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),
     ...u16(0),...u16(0),...u32(0),...u32(offset)
   ]);
   centrals.push(central,name);
   offset+=local.length+name.length+data.length;
 }
 const centralBytes=concatBytes(centrals),localBytes=concatBytes(locals);
 const end=new Uint8Array([
   ...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),
   ...u32(centralBytes.length),...u32(localBytes.length),...u16(0)
 ]);
 return concatBytes([localBytes,centralBytes,end]);
}
function buildXlsx(headers,rows){
 const all=[headers,...rows];
 const widths=headers.map((_,i)=>Math.min(45,Math.max(10,...all.map(r=>String(r[i]??"").length+2))));
 const cols=widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("");
 const sheetRows=all.map((r,ri)=>{
   const cells=r.map((v,ci)=>{
     const ref=`${colName(ci+1)}${ri+1}`;
     const style=ri===0?' s="1"':"";
     return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
   }).join("");
   return `<row r="${ri+1}">${cells}</row>`;
 }).join("");
 const range=`A1:${colName(headers.length)}${all.length}`;
 const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
 <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
 <cols>${cols}</cols>
 <sheetData>${sheetRows}</sheetData>
 <autoFilter ref="${range}"/>
</worksheet>`;
 const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="CRM VGE" sheetId="1" r:id="rId1"/></sheets></workbook>`;
 const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
 const rootRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
 const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
 const types=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
 return makeZip([
   {name:"[Content_Types].xml",data:types},
   {name:"_rels/.rels",data:rootRels},
   {name:"xl/workbook.xml",data:workbook},
   {name:"xl/_rels/workbook.xml.rels",data:rels},
   {name:"xl/worksheets/sheet1.xml",data:sheet},
   {name:"xl/styles.xml",data:styles}
 ]);
}
function statisticsExportRows(){
 if(!statisticsData)return [];
 const s=statisticsData,k=s.kpis||{},tm=s.travel_metrics||{},rows=[],add=(section,item,value="",detail="",extra="")=>rows.push([section,item,value,detail,extra]);
 add("Alcance","Periodo",statsPeriodLabel(s.scope?.period_days));
 add("Alcance","Responsable",s.scope?.operator_code?operatorLabel(s.scope.operator_code):(isAdmin?"Todo el equipo":currentUserLabel()));
 add("Alcance","Comunidad",s.scope?.community||"Todas");
 add("Alcance","Campaña",s.campaign?.code||currentCampaign?.code||"");
 [
  ["Cartera",k.portfolio_total,"Centros activos"],["Cartera trabajada",k.worked_centers,"Con contacto o estado actualizado"],["% trabajada",k.worked_pct,"Porcentaje"],
  ["Interesados",k.interested_centers,"Estado actual"],["A cotización",k.quoted_centers,"Estado actual"],["Conversión a presupuesto",k.quote_conversion_pct,"Porcentaje"],
  ["Contactos",k.contacts_period,statsPeriodLabel(s.scope?.period_days)],["Seguimientos vencidos",k.overdue_followups,"Foto actual"],["Seguimiento a tiempo",k.on_time_followups_pct,"Porcentaje"],
  ["Nuevos centros",k.new_centers_period,"Altas manuales"],["Oportunidades sin atender",k.unattended_opportunities,"Sin agenda futura"],["Para hoy",k.due_today,"Agenda actual"]
 ].forEach(x=>add("KPI",x[0],x[1]??"",x[2]));
 [
  ["Viajes",tm.opportunities_total,"Grupos activos"],["Viajes trabajados",tm.opportunities_worked,"Con contacto o estado actualizado"],["Viajes pendientes",tm.opportunities_pending,"Estado actual"],
  ["Viajes interesados",tm.opportunities_interested,"Estado actual"],["Viajes a cotización",tm.opportunities_quoted,"Estado actual"],["Viajes no interesados",tm.opportunities_not_interested,"Estado actual"],
  ["Conversión por viaje",tm.opportunity_conversion_pct,"Porcentaje"],["Seguimientos de viaje vencidos",tm.opportunity_followups_overdue,"Foto actual"],["Viajes sin seguimiento futuro",tm.opportunities_without_future_followup,"Interesados/cotización"],["Nuevos viajes",tm.new_opportunities_period,statsPeriodLabel(s.scope?.period_days)]
 ].forEach(x=>add("KPI viaje",x[0],x[1]??"",x[2]));
 (s.operators||[]).forEach(o=>add("Equipo",o.operator_name,o.portfolio_total,`Trabajados: ${o.worked_centers} · Contactos: ${o.contacts_period}`,`Interesados: ${o.interested_centers} · A cotización: ${o.quoted_centers} · Vencidos: ${o.overdue_followups}`));
 (s.zones||[]).forEach(z=>add("Zona",z.community,z.portfolio_total,`Trabajados: ${z.worked_centers}`,`Interesados: ${z.interested_centers} · A cotización: ${z.quoted_centers} · Vencidos: ${z.overdue_followups}`));
 (s.lead_sources||[]).forEach(x=>add("Origen",x.label,x.total));
 (s.channels||[]).forEach(x=>add("Canal",x.label,x.total,statsPeriodLabel(s.scope?.period_days)));
 (s.opportunities_by_status||[]).forEach(x=>add("Viajes por estado",x.status,x.count));
 (s.opportunities_by_cycle||[]).forEach(x=>add("Viajes por ciclo",x.cycle,x.count));
 (s.opportunities_by_operator||[]).forEach(x=>add("Viajes por responsable",operatorLabel(x.operator_code),x.total,`Interesados: ${x.interested} · A cotización: ${x.quoted}`,`Vencidos: ${x.overdue}`));
 (s.opportunities||[]).forEach(o=>add("Oportunidad",o.school,o.status,`${o.center_id} · ${o.operator_name||o.assigned_to} · ${o.community||"Sin indicar"}`,`Días sin contacto: ${o.days_without_contact}`));
 (s.recent_activity||[]).forEach(a=>add("Actividad",a.school,a.result,`${a.center_id} · ${a.operator_name||a.operator_code} · ${a.channel}`,fmtDateTime(a.contacted_at)));
 return rows;
}
async function exportStatisticsExcel(){
 if(!statisticsData){alert("Espera a que termine el cálculo de estadísticas.");return}
 const rows=statisticsExportRows(),xlsx=buildXlsx(["Sección","Indicador / elemento","Valor","Detalle","Información adicional"],rows);
 try{
   await logExport("excel","statistics",rows.length,{period_days:statisticsData.scope?.period_days,operator_code:statisticsData.scope?.operator_code||null,community:statisticsData.scope?.community||null});
   download(`crm-vge-estadisticas-${localISO()}.xlsx`,xlsx,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");toast(`Excel de estadísticas generado · ${rows.length.toLocaleString("es-ES")} filas`);
 }catch(e){console.error(e);alert("No se ha podido registrar la exportación; no se ha generado el fichero.")}
}
async function exportStatisticsCSV(){
 if(!statisticsData){alert("Espera a que termine el cálculo de estadísticas.");return}
 const header=["Sección","Indicador / elemento","Valor","Detalle","Información adicional"],rows=statisticsExportRows();
 const q=v=>{let x=String(v??"");if(/^[=+\-@\t\r]/.test(x))x="'"+x;return `"${x.replace(/"/g,'""')}"`};
 const csv="\ufeff"+[header,...rows].map(r=>r.map(q).join(";")).join("\n");
 try{
   await logExport("csv","statistics",rows.length,{period_days:statisticsData.scope?.period_days,operator_code:statisticsData.scope?.operator_code||null,community:statisticsData.scope?.community||null});
   download(`crm-vge-estadisticas-${localISO()}.csv`,csv,"text/csv;charset=utf-8");toast("CSV de estadísticas exportado");
 }catch(e){console.error(e);alert("No se ha podido registrar la exportación; no se ha generado el fichero.")}
}
async function exportExcel(){
 if(currentView==="stats"){await exportStatisticsExcel();return}
 if(currentView==="archived"){alert("La vista de archivados no se incluye en exportaciones operativas. Restaura primero la ficha si necesitas exportarla.");return}
 const arr=await safeExportRowsForCurrentView();
 const rows=arr.map(c=>{const directMobile=c.contactBlocked?"":c.mobile,directEmail=c.contactBlocked?"":c.directEmail,n=nextParts(c);const lastActivity=c.lastResult?`${c.lastResult}${c.lastOperator?` · ${operatorLabel(c.lastOperator)}`:""}${c.lastContactAt?` · ${fmtDateTime(c.lastContactAt)}`:""}`:"";return [c.id,operatorLabel(c.assignedTo),portfolioStatus(c),c.status,c._agendaItem?.task_type||"",c._agendaItem?.title||"",c._agendaItem?.opportunity_id||"",n.date?fmtDate(n.date):"",n.time||"",c.school,c.city,c.province,c.community,c.leadSource||"",c.leadSourceDetail||"",c.createdByOperator?operatorLabel(c.createdByOperator):"",c.centerCreatedAt?fmtDateTime(c.centerCreatedAt):"",c.schoolPhone,c.schoolEmail,c.contactName,c.role,directMobile,directEmail,c.contactBlocked?"SI":"NO",Number(c.contactCount||0),Number(c.opportunityTotal||0),Number(c.opportunityPending||0),Number(c.opportunityInterested||0),Number(c.opportunityQuoted||0),Number(c.opportunityNotInterested||0),lastActivity]});
 const headers=["ID","Responsable","Estado de cartera","Estado general","Tipo de seguimiento","Detalle del seguimiento","ID viaje","Próximo contacto","Hora","Centro","Ciudad","Provincia","Comunidad","Origen del lead","Detalle origen","Creado por","Fecha de alta","Teléfono centro","Email centro","Persona de contacto","Cargo","Móvil / directo","Email directo","No contactar","Nº contactos","Nº viajes","Viajes pendientes","Viajes interesados","Viajes a cotización","Viajes no interesados","Última actividad"];
 const xlsx=buildXlsx(headers,rows);
 const label=currentView==="status"?activeStatus:currentView;
 try{
   await logExport("excel",String(label||"vista"),arr.length,{status:activeStatus||filters.status||null});
   download(`crm-vge-${String(label||"vista").replace(/[^a-z0-9áéíóúñ]+/gi,"-")}-r6-${localISO()}.xlsx`,xlsx,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
   toast(`Excel V15 R7 generado · ${arr.length.toLocaleString("es-ES")} centros · sin filtros visuales`);
 }catch(e){console.error(e);alert("No se ha podido registrar la exportación; no se ha generado el fichero.")}
}

function newCenterFormValues(){
 const value=id=>document.getElementById(id)?.value.trim()||"";
 return {
   school:value("nSchool"),city:value("nCity"),province:value("nProvince"),
   schoolPhone:value("nSchoolPhone"),schoolEmail:value("nSchoolEmail"),
   contactName:value("nContactName"),contactRole:value("nContactRole"),
   contactMobile:value("nContactMobile"),contactEmail:value("nContactEmail"),
   leadSource:value("nLeadSource"),leadSourceDetail:value("nLeadSourceDetail"),
   assignedTo:isAdmin?(value("nAssigned")||currentUser):currentUser
 };
}
function newCenterFormKey(v){return [v.school,v.city,v.province,v.schoolPhone,v.schoolEmail].map(norm).join("|")}
function newCenterStatus(message,type="info"){
 const box=document.getElementById("newCenterSaveStatus");if(!box)return;
 box.textContent=message;box.className=`save-feedback show ${type}`;
}
function newCenterAssignmentField(){
 if(isAdmin)return `<div class="field span2"><label>Responsable VGE <span class="required-mark">*</span></label><select id="nAssigned" required>${operatorOptions(currentUser,true)}</select><span class="field-help">Como administrador puedes asignarlo ahora o dejarlo sin asignar.</span></div>`;
 return `<div class="field span2"><label>Responsable VGE</label><input class="readonly" value="${esc(currentUserLabel())}" readonly><span class="field-help">El centro se incorporará automáticamente a tu cartera.</span></div>`;
}
function newCenterDialogHtml(){
 return `<div class="modal-head"><div><h2>＋ Nuevo centro</h2><p>Alta manual en el CRM · se comprobarán posibles duplicados antes de guardar</p></div><button class="close" id="closeNewCenter" type="button">✕</button></div>
 <div class="modal-body">
  <div class="new-center-intro"><strong>Utiliza esta opción cuando el centro no esté ya en la base.</strong> El identificador y la comunidad autónoma se generan automáticamente. ${isAdmin?"Puedes elegir el responsable de la nueva ficha.":"La ficha quedará asignada a tu cartera."}</div>
  <form id="newCenterForm">
   <div class="new-center-section" style="border-top:0;margin-top:0;padding-top:0"><h3>Centro educativo</h3>
    <div class="form-grid">
     <div class="field span2"><label>Nombre del centro <span class="required-mark">*</span></label><input id="nSchool" maxlength="180" autocomplete="organization" placeholder="Ej.: IES Padre Isla" required></div>
     <div class="field"><label>Localidad <span class="required-mark">*</span></label><input id="nCity" maxlength="120" autocomplete="address-level2" required></div>
     <div class="field"><label>Provincia <span class="required-mark">*</span></label><select id="nProvince" autocomplete="address-level1" required><option value="">Selecciona…</option>${PROVINCES.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join("")}</select></div>
     <div class="field span2"><label>Teléfono general</label><input id="nSchoolPhone" type="tel" maxlength="40" autocomplete="tel" placeholder="Ej.: 987 000 000"></div>
     <div class="field span2"><label>Email general</label><input id="nSchoolEmail" type="email" maxlength="180" autocomplete="email" placeholder="Ej.: centro@educa.jcyl.es"></div>
    </div>
   </div>
   <div class="new-center-section"><h3>Origen y asignación</h3>
    <div class="form-grid">
     <div class="field span2"><label>Origen del contacto <span class="required-mark">*</span></label><select id="nLeadSource" required><option value="">Selecciona…</option>${LEAD_SOURCES.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("")}</select><span class="field-help">Permitirá medir qué canales generan oportunidades reales.</span></div>
     <div class="field span2" id="nLeadDetailField" hidden><label>Detalle del origen <span class="required-mark">*</span></label><input id="nLeadSourceDetail" maxlength="220" placeholder="Explica brevemente cómo llegó el contacto"></div>
     ${newCenterAssignmentField()}
    </div>
   </div>
   <div class="new-center-section"><h3>Persona de contacto <span class="muted">(opcional)</span></h3>
    <div class="form-grid">
     <div class="field span2"><label>Nombre y apellidos</label><input id="nContactName" maxlength="160" autocomplete="name"></div>
     <div class="field span2"><label>Cargo</label><select id="nContactRole"><option value=""></option>${ROLES.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join("")}</select></div>
     <div class="field span2"><label>Móvil / teléfono directo</label><input id="nContactMobile" type="tel" maxlength="40"></div>
     <div class="field span2"><label>Email directo</label><input id="nContactEmail" type="email" maxlength="180"></div>
    </div>
   </div>
   <div class="duplicate-box" id="newCenterDuplicateBox">Completa nombre, localidad y provincia para comprobar si el centro ya existe.</div>
   <div class="new-center-actions">
    <button class="btn" type="button" id="checkNewCenterDuplicates">Comprobar duplicados</button>
    <div class="right"><button class="btn" type="button" id="cancelNewCenter">Cancelar</button><button class="btn primary" type="submit" id="createNewCenterBtn">Crear centro</button></div>
   </div>
   <div id="newCenterSaveStatus" class="save-feedback" role="status" aria-live="polite"></div>
  </form>
 </div>`;
}
function setNewCenterDuplicateBox(html,type=""){
 const box=document.getElementById("newCenterDuplicateBox");if(!box)return;
 box.className=`duplicate-box${type?` ${type}`:""}`;box.innerHTML=html;
 box.querySelectorAll("[data-open-duplicate]").forEach(btn=>btn.onclick=async()=>{
   const id=btn.dataset.openDuplicate;if(!id)return;
   document.getElementById("newCenterDialog")?.close();await openCenter(id);
 });
 box.querySelectorAll("[data-open-archived]").forEach(btn=>btn.onclick=()=>{
   document.getElementById("newCenterDialog")?.close();archivedSearch=btn.dataset.openArchived||"";currentView="archived";render();
 });
}
function duplicateMatchLabel(kind){return kind==="exact"?"Coincidencia exacta":kind==="strong"?"Coincidencia alta":"Posible coincidencia"}
function duplicateCandidateHtml(d){
 const score=Math.round(Number(d.match_score||0)*100);
 const assignment=isAdmin&&d.assigned_to?` · Responsable: ${esc(operatorLabel(d.assigned_to))}`:"";
 const activeVisible=!!(d.candidate_id&&centers.some(c=>c.id===d.candidate_id));
 const archivedMatch=!!(d.accessible&&d.candidate_id&&!activeVisible);
 const action=activeVisible?`<button class="btn" type="button" data-open-duplicate="${esc(d.candidate_id)}">Abrir ficha</button>`:archivedMatch?(isAdmin?`<button class="btn" type="button" data-open-archived="${esc(d.candidate_id)}">Ver en archivados</button>`:'<span class="muted">Centro archivado</span>'):`<span class="muted">Ficha fuera de tu cartera</span>`;
 return `<div class="duplicate-item"><div><strong>${esc(d.school||"Centro sin nombre")} <span class="duplicate-label">${duplicateMatchLabel(d.match_kind)}</span></strong><div class="duplicate-meta">${esc(d.city||"")} · ${esc(d.province||"")}${assignment}${score?` · Similitud ${score}%`:""}</div></div>${action}</div>`;
}
function renderNewCenterDuplicates(){
 const list=newCenterDuplicateCandidates||[];
 const exact=list.some(d=>d.match_kind==="exact");
 if(exact){
   setNewCenterDuplicateBox(`<strong>Este centro ya parece existir.</strong> No se puede crear una segunda ficha con el mismo nombre, localidad y provincia.<div class="duplicate-list">${list.map(duplicateCandidateHtml).join("")}</div>`,`blocked`);
   return;
 }
 if(list.length||newCenterForceConfirmation){
   const cards=list.length?`<div class="duplicate-list">${list.map(duplicateCandidateHtml).join("")}</div>`:`<div class="duplicate-list"><div class="duplicate-item"><div><strong>Coincidencia por datos de contacto</strong><div class="duplicate-meta">Existe una ficha con un teléfono o email coincidente. Por privacidad, revisa los datos antes de continuar.</div></div></div></div>`;
   setNewCenterDuplicateBox(`<strong>Revisa estas posibles coincidencias antes de crear una ficha nueva.</strong>${cards}<label class="duplicate-confirm"><input id="confirmPossibleDuplicate" type="checkbox"> He revisado las coincidencias y confirmo que se trata de un centro distinto.</label>`,`warning`);
   return;
 }
 setNewCenterDuplicateBox(`<strong>✓ No se han encontrado coincidencias relevantes.</strong> Puedes crear la ficha.`,`clear`);
}
function resetNewCenterDuplicateCheck(message="Completa nombre, localidad y provincia para comprobar si el centro ya existe."){
 newCenterDuplicateCandidates=[];newCenterDuplicateKey="";newCenterForceConfirmation=false;newCenterDuplicateRequest++;
 setNewCenterDuplicateBox(esc(message));
}
async function searchNewCenterDuplicates({showIncomplete=true}={}){
 const v=newCenterFormValues(),key=newCenterFormKey(v);
 if(v.school.length<3||v.city.length<2||!v.province){
   if(showIncomplete)resetNewCenterDuplicateCheck();
   return [];
 }
 const request=++newCenterDuplicateRequest;
 setNewCenterDuplicateBox("Comprobando posibles coincidencias…","checking");
 const {data,error}=await supabaseRpc("search_center_duplicates",{p_school:v.school,p_city:v.city,p_province:v.province});
 if(request!==newCenterDuplicateRequest)return newCenterDuplicateCandidates;
 if(error){
   console.error(error);newCenterDuplicateCandidates=[];newCenterDuplicateKey="";
   setNewCenterDuplicateBox(esc(friendlyError(error,"No se ha podido comprobar si el centro ya existe.")),"blocked");
   throw error;
 }
 newCenterDuplicateCandidates=data||[];newCenterDuplicateKey=key;newCenterForceConfirmation=false;
 renderNewCenterDuplicates();return newCenterDuplicateCandidates;
}
function scheduleNewCenterDuplicateSearch(){
 const v=newCenterFormValues(),key=newCenterFormKey(v);
 if(key===newCenterDuplicateKey)return;
 newCenterDuplicateCandidates=[];newCenterDuplicateKey="";newCenterForceConfirmation=false;newCenterDuplicateRequest++;
 clearTimeout(newCenterSearchTimer);
 if(v.school.length<3||v.city.length<2||!v.province){setNewCenterDuplicateBox("Completa nombre, localidad y provincia para comprobar si el centro ya existe.");return}
 setNewCenterDuplicateBox("Datos modificados. Comprobación pendiente…","checking");
 newCenterSearchTimer=setTimeout(()=>searchNewCenterDuplicates().catch(()=>{}),550);
}
function toggleNewCenterLeadDetail(){
 const source=document.getElementById("nLeadSource")?.value||"",field=document.getElementById("nLeadDetailField"),input=document.getElementById("nLeadSourceDetail");
 const show=source==="Otro";if(field)field.hidden=!show;if(input)input.required=show;
 if(!show&&input)input.value="";
}
async function createNewCenter(e){
 e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;
 const v=newCenterFormValues();
 if(v.leadSource==="Otro"&&!v.leadSourceDetail){newCenterStatus("Indica el detalle del origen del contacto.","error");document.getElementById("nLeadSourceDetail")?.focus();return}
 const key=newCenterFormKey(v);
 let matches=newCenterDuplicateCandidates;
 try{if(key!==newCenterDuplicateKey)matches=await searchNewCenterDuplicates()}catch{return}
 if(matches.some(d=>d.match_kind==="exact")){newCenterStatus("No se ha creado: ya existe una ficha para este centro.","error");return}
 const mustConfirm=matches.length>0||newCenterForceConfirmation;
 const confirmed=!!document.getElementById("confirmPossibleDuplicate")?.checked;
 if(mustConfirm&&!confirmed){newCenterStatus("Revisa las coincidencias y marca la confirmación antes de continuar.","error");return}
 const btn=document.getElementById("createNewCenterBtn");if(btn){btn.disabled=true;btn.textContent="Creando…"}newCenterStatus("Creando la ficha y asignando su identificador…","info");
 const payload={
   p_school:v.school,p_city:v.city,p_province:v.province,p_lead_source:v.leadSource,
   p_school_phone:v.schoolPhone||null,p_school_email:v.schoolEmail||null,
   p_contact_name:v.contactName||null,p_contact_role:v.contactRole||null,
   p_contact_mobile:v.contactMobile||null,p_contact_email:v.contactEmail||null,
   p_lead_source_detail:v.leadSourceDetail||null,p_assigned_to:v.assignedTo||null,
   p_confirm_possible_duplicate:confirmed
 };
 const {data,error}=await supabaseRpc("create_manual_center",payload);
 if(error){
   console.error(error);if(btn){btn.disabled=false;btn.textContent="Crear centro"}
   if(String(error.message||"").includes("POSSIBLE_DUPLICATE_CONFIRM_REQUIRED")){
     newCenterForceConfirmation=true;renderNewCenterDuplicates();newCenterStatus("El servidor ha detectado otra coincidencia. Confirma que se trata de un centro distinto.","error");return;
   }
   if(String(error.message||"").includes("CENTER_ALREADY_EXISTS")){
     try{await searchNewCenterDuplicates()}catch{}newCenterStatus("No se ha creado: el centro ya existe en el CRM.","error");return;
   }
   newCenterStatus(friendlyError(error,"No se ha podido crear el centro."),"error");return;
 }
 const created=Array.isArray(data)?data[0]:data,centerId=created?.center_id;
 if(!centerId){if(btn){btn.disabled=false;btn.textContent="Crear centro"}newCenterStatus("El servidor no ha devuelto el identificador de la nueva ficha.","error");return}
 try{
   await loadAll();accessFingerprint=await getFingerprint();
   currentView=isAdmin&&created.assigned_to!==currentUser?"all":"mine";activeStatus="";filters={search:"",status:"",community:"",seller:"",quick:"all"};
   render();document.getElementById("newCenterDialog")?.close();
   await openCenter(centerId);toast(`Centro creado · ${centerId}`);
 }catch(refreshError){
   console.error(refreshError);if(btn){btn.disabled=false;btn.textContent="Crear centro"}
   newCenterStatus(`El centro ${centerId} se ha creado, pero no se ha podido refrescar la pantalla. Recarga el CRM.`,"error");
 }
}
function openNewCenterDialog(){
 const dlg=document.getElementById("newCenterDialog");if(!dlg)return;
 clearTimeout(newCenterSearchTimer);newCenterDuplicateCandidates=[];newCenterDuplicateKey="";newCenterForceConfirmation=false;newCenterDuplicateRequest++;
 dlg.innerHTML=newCenterDialogHtml();dlg.showModal();
 dlg.querySelector("#closeNewCenter").onclick=()=>dlg.close();
 dlg.querySelector("#cancelNewCenter").onclick=()=>dlg.close();
 dlg.querySelector("#newCenterForm").onsubmit=createNewCenter;
 dlg.querySelector("#checkNewCenterDuplicates").onclick=()=>searchNewCenterDuplicates().catch(()=>{});
 dlg.querySelector("#nLeadSource").onchange=toggleNewCenterLeadDetail;
 ["nSchool","nCity","nProvince","nSchoolPhone","nSchoolEmail"].forEach(id=>{
   const el=dlg.querySelector(`#${id}`);if(el)el.addEventListener(id==="nProvince"?"change":"input",scheduleNewCenterDuplicateSearch);
 });
 dlg.onclose=()=>{clearTimeout(newCenterSearchTimer);newCenterDuplicateRequest++;dlg.innerHTML=""};
 setTimeout(()=>dlg.querySelector("#nSchool")?.focus(),0);
}

async function openCenter(id){
 const existing=document.getElementById("centerDialog");
 if(existing?.open&&currentCenterId!==id&&!requestCloseCenterDialog())return;
 currentCenterId=id;const c=centers.find(x=>x.id===id);if(!c)return;
 try{await Promise.all([loadHistory(c),loadWorkspace(c)])}catch(e){console.error(e);toast("No se ha podido cargar toda la ficha")}
 const dlg=document.getElementById("centerDialog");
 dlg.innerHTML=dialogHtml(c);dlg.showModal();
 bindCenterDialog(c);
}
function centerContactOptions(c,selected="",blankLabel="Sin vincular"){const contacts=(c.workspace?.contacts||[]).filter(x=>x.active);return `<option value="">${esc(blankLabel)}</option>`+contacts.map(x=>`<option value="${x.contact_id}" ${String(x.contact_id)===String(selected||"")?"selected":""} ${x.do_not_contact?"disabled":""}>${esc(x.full_name)}${x.role?` · ${esc(x.role)}`:""}${x.do_not_contact?" · NO CONTACTAR":""}</option>`).join("")}
function workspaceSummaryHtml(c){const active=(c.workspace?.opportunities||[]).filter(o=>o.active),contacts=(c.workspace?.contacts||[]).filter(x=>x.active);return `<div class="workspace-summary"><span class="workspace-pill"><strong>${active.length}</strong> viaje${active.length===1?"":"s"} · campaña ${esc(c.workspace?.campaign?.label||currentCampaign?.label||"")}</span><span class="workspace-pill"><strong>${contacts.length}</strong> persona${contacts.length===1?"":"s"} de contacto</span>${active.filter(o=>o.status==="Interesado").length?`<span class="workspace-pill"><strong>${active.filter(o=>o.status==="Interesado").length}</strong> interesado${active.filter(o=>o.status==="Interesado").length===1?"":"s"}</span>`:""}${active.filter(o=>o.status==="Trasladado a cotización").length?`<span class="workspace-pill"><strong>${active.filter(o=>o.status==="Trasladado a cotización").length}</strong> a cotización</span>`:""}</div>`}
function contactsHtml(c){const contacts=(c.workspace?.contacts||[]).filter(x=>x.active);return `<div class="entity-list">${contacts.length?contacts.map(x=>`<div class="entity-card contact-record" data-contact-id="${x.contact_id}" data-dirty-scope="contact:${x.contact_id}"><div class="entity-head"><div><h4>${esc(x.full_name)} ${x.is_primary?'<span class="event-tag">Principal</span>':""}${x.do_not_contact?'<span class="event-tag">NO CONTACTAR</span>':""}</h4><p>Versión ${Number(x.contact_version||1)}</p></div><div class="entity-actions">${!x.do_not_contact&&x.mobile?`<a class="icon-btn" href="tel:${esc(String(x.mobile).replace(/\s/g,""))}">☎</a>`:""}${!x.do_not_contact&&x.email?`<a class="icon-btn" href="mailto:${encodeURIComponent(x.email)}">✉</a>`:""}<button class="btn" type="button" data-save-contact="${x.contact_id}">Guardar persona</button></div></div><div class="entity-form"><div class="field"><label>Nombre y apellidos</label><input data-field="full_name" value="${esc(x.full_name)}"></div><div class="field"><label>Cargo</label><select data-field="role"><option value=""></option>${options(ROLES,x.role||"")}</select></div><div class="field"><label>Móvil / directo</label><input data-field="mobile" value="${esc(x.mobile||"")}"></div><div class="field"><label>Email directo</label><input data-field="email" type="email" value="${esc(x.email||"")}"></div><div class="field span2"><label><input type="radio" name="primaryContact" value="${x.contact_id}" ${x.is_primary?"checked":""}> Contacto principal del centro</label><span class="field-help">Se usa por defecto en la ficha y los accesos rápidos.</span></div><div class="field"><label><input data-field="do_not_contact" type="checkbox" ${x.do_not_contact?"checked":""}> No contactar con esta persona</label></div><div class="field"><label>Motivo</label><input data-field="do_not_contact_reason" value="${esc(x.do_not_contact_reason||"")}" placeholder="Obligatorio si se bloquea"></div></div></div>`).join(""):'<div class="empty">Todavía no hay personas de contacto.</div>'}</div><div class="entity-create" data-dirty-scope="new-contact"><h4>Añadir persona de contacto</h4><div class="entity-form"><div class="field"><label>Nombre y apellidos *</label><input id="newContactName"></div><div class="field"><label>Cargo</label><select id="newContactRole"><option value=""></option>${options(ROLES,"")}</select></div><div class="field"><label>Móvil / directo</label><input id="newContactMobile"></div><div class="field"><label>Email directo</label><input id="newContactEmail" type="email"></div><div class="field span2"><label><input id="newContactPrimary" type="checkbox" ${contacts.length?"":"checked"}> Convertir en contacto principal</label></div><div class="field"><label><input id="newContactBlocked" type="checkbox"> No contactar</label></div><div class="field"><label>Motivo</label><input id="newContactBlockedReason" placeholder="Obligatorio si se bloquea"></div><div class="field span4"><button class="btn primary" type="button" id="createContactBtn">Añadir persona</button></div></div></div>`}
function opportunityCardHtml(c,o){
 const next=splitISO(o.next_contact_at),archived=!o.active,sourceChoice=opportunitySourceChoice(c,o.lead_source),sourceDetail=opportunitySourceDetail(c,o),showSourceDetail=opportunitySourceNeedsDetail(sourceChoice)||!!sourceDetail;
 return `<div class="entity-card opportunity-record ${archived?"archived":""}" data-opportunity-id="${esc(o.opportunity_id)}" data-dirty-scope="opportunity:${esc(o.opportunity_id)}"><div class="entity-head"><div><h4>${esc(o.cycle)}${o.destination?` · ${esc(o.destination)}`:""} ${statusBadge(o.status)} ${archived?'<span class="event-tag">Archivado</span>':""}</h4><p>${esc(o.opportunity_id)} · ${Number(o.contact_count||0)} contacto${Number(o.contact_count||0)===1?"":"s"} · versión ${Number(o.opportunity_version||1)}</p></div><div class="entity-actions">${archived?`<button class="btn" type="button" data-restore-opportunity="${esc(o.opportunity_id)}">Restaurar viaje</button>`:`<button class="btn" type="button" data-save-opportunity="${esc(o.opportunity_id)}">Guardar viaje</button><button class="btn danger" type="button" data-archive-opportunity="${esc(o.opportunity_id)}">Archivar viaje</button>`}</div></div><div class="entity-form"><div class="field"><label>Ciclo *</label><select data-field="cycle" ${archived?"disabled":""}>${options(CYCLES,o.cycle)}</select></div><div class="field"><label>Estado del viaje</label><select data-field="status" ${archived?"disabled":""}>${options(STATUSES,o.status)}</select></div><div class="field"><label>Alumnos</label><input data-field="students_count" type="number" min="1" max="2000" value="${esc(o.students_count??"")}" ${archived?"disabled":""}></div><div class="field"><label>Profesores</label><input data-field="teachers_count" type="number" min="0" max="250" value="${esc(o.teachers_count??"")}" ${archived?"disabled":""}></div><div class="field span2"><label>Grupo / descripción</label><input data-field="group_description" value="${esc(o.group_description||"")}" placeholder="Ej.: dos clases de 4.º ESO" ${archived?"disabled":""}></div><div class="field span2"><label>Destino o idea de viaje</label><input data-field="destination" value="${esc(o.destination||"")}" placeholder="Ej.: Italia, París, por decidir…" ${archived?"disabled":""}></div><div class="field"><label>Salida prevista</label><input data-field="travel_start_on" type="date" value="${esc(o.travel_start_on||"")}" ${archived?"disabled":""}></div><div class="field"><label>Regreso previsto</label><input data-field="travel_end_on" type="date" value="${esc(o.travel_end_on||"")}" ${archived?"disabled":""}></div><div class="field span2"><label>Persona responsable del viaje</label><select data-field="contact_id" ${archived?"disabled":""}>${centerContactOptions(c,o.contact_id,"Sin persona vinculada")}</select></div><div class="field"><label>Próximo seguimiento</label><input data-field="next_date" type="date" value="${esc(next.date)}" ${archived?"disabled":""}></div><div class="field"><label>Hora</label><input data-field="next_time" type="time" value="${esc(next.time)}" ${archived?"disabled":""}></div><div class="field span2"><label>Cómo ha surgido este viaje</label><select data-field="lead_source_choice" data-opportunity-source ${archived?"disabled":""}>${opportunitySourceOptions(c,o.lead_source)}</select><span class="field-help">No cambia el origen de alta del centro; identifica este viaje concreto.</span></div><div class="field span2" data-source-detail-container ${showSourceDetail?"":"hidden"}><label>Detalle adicional (opcional)</label><input data-field="lead_source_detail" value="${esc(sourceDetail)}" placeholder="Ej.: campaña, persona que recomienda o contexto" ${archived?"disabled":""}></div>${archived&&o.archive_reason?`<div class="field span4"><span class="field-help"><b>Motivo del archivo:</b> ${esc(o.archive_reason)}</span></div>`:""}</div></div>`
}
function opportunityAuditLabel(action){return ({insert:"Creación",update:"Actualización",archive:"Archivo",restore:"Restauración"})[action]||action||"Cambio"}
function opportunityAuditValue(c,key,value){
 if(value===null||value===undefined||value==="")return "—";
 if(key==="contact_id")return (c.workspace?.contacts||[]).find(x=>String(x.contact_id)===String(value))?.full_name||`Contacto ${value}`;
 if(key==="next_contact_at")return fmtDateTime(value);
 if(key==="travel_start_on"||key==="travel_end_on")return fmtDate(value);
 if(typeof value==="boolean")return value?"Sí":"No";
 return String(value)
}
function opportunityAuditDetail(c,a){
 const before=a.before_data||{},after=a.after_data||{};
 if(a.action==="insert")return `Viaje creado · estado ${opportunityAuditValue(c,"status",after.status)}`;
 if(a.action==="archive")return `Viaje archivado${after.archive_reason?` · ${after.archive_reason}`:""}`;
 if(a.action==="restore")return "Viaje restaurado";
 const fields=[["status","Estado"],["cycle","Ciclo"],["group_description","Grupo"],["destination","Destino"],["students_count","Alumnos"],["teachers_count","Profesores"],["travel_start_on","Salida"],["travel_end_on","Regreso"],["contact_id","Persona responsable"],["next_contact_at","Próximo seguimiento"],["lead_source","Origen"],["lead_source_detail","Detalle del origen"],["active","Activo"]];
 const changes=fields.filter(([key])=>JSON.stringify(before[key]??null)!==JSON.stringify(after[key]??null)).map(([key,label])=>`${label}: ${opportunityAuditValue(c,key,before[key])} → ${opportunityAuditValue(c,key,after[key])}`);
 return changes.join(" · ")||"Guardado sin cambios funcionales"
}
function opportunityHistoryHtml(c,o){
 const rows=(c.workspace?.opportunity_audit||[]).filter(a=>a.opportunity_id===o.opportunity_id).sort((a,b)=>String(b.acted_at||"").localeCompare(String(a.acted_at||"")));
 return `<details class="opportunity-history"><summary>Historial del viaje (${rows.length}) · más reciente primero</summary>${rows.length?`<div class="opportunity-history-list">${rows.map(a=>`<div class="opportunity-history-item"><strong>${esc(opportunityAuditLabel(a.action))}</strong> · ${esc(opportunityAuditDetail(c,a))}<div class="opportunity-history-meta">Realizado por ${esc(a.acted_by_name||operatorLabel(a.acted_by_operator)||a.acted_by_operator||"Usuario")} · ${esc(fmtDateTime(a.acted_at))}</div></div>`).join("")}</div>`:'<div class="opportunity-history-empty">Todavía no hay movimientos auditados para este viaje.</div>'}</details>`
}
function opportunitiesHtml(c){
 const opportunities=c.workspace?.opportunities||[];
 return `<div class="entity-list">${opportunities.length?opportunities.map(o=>`<div class="opportunity-with-history">${opportunityCardHtml(c,o)}${opportunityHistoryHtml(c,o)}</div>`).join(""):'<div class="empty">Todavía no hay viajes creados para esta campaña.</div>'}</div><div class="entity-create" data-dirty-scope="new-opportunity"><h4>Añadir viaje / grupo</h4><div class="entity-form"><div class="field"><label>Ciclo *</label><select id="newOppCycle"><option value="">Selecciona…</option>${options(CYCLES,"")}</select></div><div class="field"><label>Estado</label><select id="newOppStatus">${options(STATUSES,"Pendiente")}</select></div><div class="field"><label>Alumnos</label><input id="newOppStudents" type="number" min="1" max="2000"></div><div class="field"><label>Profesores</label><input id="newOppTeachers" type="number" min="0" max="250"></div><div class="field span2"><label>Grupo / descripción</label><input id="newOppGroup" placeholder="Ej.: dos clases de 3.º ESO"></div><div class="field span2"><label>Destino o idea de viaje</label><input id="newOppDestination" placeholder="Ej.: Roma, multiaventura, por decidir…"></div><div class="field"><label>Salida prevista</label><input id="newOppStart" type="date"></div><div class="field"><label>Regreso previsto</label><input id="newOppEnd" type="date"></div><div class="field span2"><label>Persona responsable del viaje</label><select id="newOppContact">${centerContactOptions(c,"","Sin persona vinculada")}</select></div><div class="field"><label>Próximo seguimiento</label><input id="newOppNext" type="date"></div><div class="field"><label>Hora</label><input id="newOppNextTime" type="time"></div><div class="field span2"><label>Cómo ha surgido este viaje</label><select id="newOppSourceChoice" data-opportunity-source>${opportunitySourceOptions(c,"")}</select><span class="field-help">Por defecto utiliza el mismo origen con el que entró el centro.</span></div><div class="field span2" data-source-detail-container hidden><label>Detalle adicional (opcional)</label><input id="newOppSourceDetail" placeholder="Ej.: campaña, persona que recomienda o contexto"></div><div class="field span4"><button class="btn primary" type="button" id="createOpportunityBtn">Crear viaje</button></div></div></div>`
}
function dialogHtml(c){
 const canAssign=isAdmin,canEditLocation=isAdmin;
 const events=(c.history||[]).slice().sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
 const phone=c.contactBlocked?"":(c.mobile||c.schoolPhone),email=c.contactBlocked?"":(c.directEmail||c.schoolEmail);
 const creatorLabel=c.createdByOperator?(isAdmin||c.createdByOperator===currentUser?operatorLabel(c.createdByOperator):"otro usuario del equipo"):"";
 const manualOrigin=c.catalogSource==="manual"?`<div class="manual-origin"><strong>Alta manual.</strong> Origen: ${esc(c.leadSource||"No indicado")}${c.leadSourceDetail?` · ${esc(c.leadSourceDetail)}`:""}${creatorLabel?` · Creado por ${esc(creatorLabel)}`:""}${c.centerCreatedAt?` · ${fmtDateTime(c.centerCreatedAt)}`:""}</div>`:"";
 return `<div class="modal-head"><div><h2>${esc(c.school)}</h2><p>${esc(c.id)} · ${esc(c.city)} · ${esc(c.province)} · ${esc(c.community)} · Asignado a ${esc(operatorLabel(c.assignedTo))}</p></div><button class="close">✕</button></div>
 <div class="modal-body">
  <div id="dialogActionStatus" class="save-feedback dialog-action-status" role="status" aria-live="polite"></div>
  <div id="unsavedIndicator" class="unsaved-indicator" role="status">● Hay cambios sin guardar en esta ficha.</div>
  ${workspaceSummaryHtml(c)}<div class="quick">${phone?`<a class="btn" href="tel:${esc(phone.replace(/\s/g,""))}">☎ Llamar</a>`:""}${email?`<button class="btn" type="button" data-email-center="${esc(c.id)}">✉ Enviar email</button>`:""}</div>${c.contactBlocked?`<div class="notice"><strong>NO CONTACTAR.</strong> ${esc(c.contactBlockReason||"Este contacto ha solicitado no recibir nuevas comunicaciones.")}</div>`:""}${nextKey(c)?`<div class="agenda-summary"><b>Próximo seguimiento de la ficha:</b> ${fmtNext(c)}. Cada viaje puede tener además su propia fecha y hora.</div>`:""}${manualOrigin}
  <div class="form-grid" data-dirty-scope="profile">
   <div class="field"><label>Estado general</label><select id="fStatus">${options(STATUSES,c.status)}</select><span class="field-help">Mantiene la compatibilidad de la ficha; cada viaje tiene su propio estado.</span></div>
   <div class="field"><label>Responsable VGE</label><select id="fAssigned" ${canAssign?"":"disabled"}>${operatorOptions(c.assignedTo,true)}</select></div>
   <div class="field"><label>Centro</label><input class="readonly" value="${esc(c.school)}" readonly></div>
   <div class="field"><label>Localidad *</label><input id="fCity" value="${esc(c.city)}" ${canEditLocation?"":'class="readonly" readonly'}></div>
   <div class="field"><label>Provincia *</label><select id="fProvince" ${canEditLocation?"":"disabled"}>${provinceOptions(c.province)}</select></div>
   <div class="field"><label>Comunidad autónoma</label><input id="fCommunity" class="readonly" value="${esc(communityForProvince(c.province)||c.community)}" readonly><span class="field-help">Se calcula automáticamente a partir de la provincia.</span></div>
   <div class="field"><label>Persona de contacto</label><input id="fContactName" value="${esc(c.contactName)}"></div>
   <div class="field"><label>Cargo</label><select id="fRole"><option value=""></option>${options(ROLES,c.role)}</select></div>
   <div class="field"><label>Móvil / directo</label><input id="fMobile" value="${esc(c.mobile)}"></div>
   <div class="field"><label>Email directo</label><input id="fDirectEmail" type="email" value="${esc(c.directEmail)}"></div>
   <div class="field span2"><label>Teléfono general</label><input class="readonly" value="${esc(c.schoolPhone)}" readonly></div>
   <div class="field span2"><label>Email general</label><input class="readonly" value="${esc(c.schoolEmail)}" readonly></div>
   <div class="field span2 privacy-field"><label><input id="fContactBlocked" type="checkbox" ${c.contactBlocked?"checked":""}> No volver a contactar</label><small>Bloquea llamadas/emails rápidos y elimina la agenda futura.</small></div>
   <div class="field span2"><label>Motivo del bloqueo</label><input id="fBlockReason" value="${esc(c.contactBlockReason||"")}" placeholder="Ej.: solicita no recibir más comunicaciones"></div>
  </div>
  <div class="mt10"><button class="btn primary" id="saveProfile">Guardar ficha</button><div id="profileSaveStatus" class="save-feedback" role="status" aria-live="polite"></div></div>
  ${permissions.can_archive_centers?`<div class="lifecycle-danger"><h3>Archivar esta ficha</h3><p>El centro desaparecerá de carteras, agenda y accesos comerciales. No se borrará ningún dato: podrás restaurarlo desde «Archivados».</p><div class="archive-form" data-dirty-scope="archive-center"><label>Motivo obligatorio<input id="fArchiveReason" maxlength="500" placeholder="Ej.: ficha duplicada pendiente de revisión"></label><button class="btn danger" type="button" id="archiveCenterBtn">Archivar centro</button></div></div>`:""}
  <div class="modal-section"><h3>Personas de contacto</h3><p class="section-note">Un mismo colegio puede tener responsables distintos para Primaria, ESO o Bachillerato. Marca una persona principal para los accesos rápidos.</p>${contactsHtml(c)}</div>
  <div class="modal-section"><h3>Viajes / grupos · ${esc(c.workspace?.campaign?.label||currentCampaign?.label||"")}</h3><p class="section-note">Cada viaje conserva su ciclo, volumen, destino, estado y seguimiento independiente. El colegio continúa contando una sola vez en la cartera.</p>${opportunitiesHtml(c)}</div>
  <div class="modal-section"><h3>Registrar contacto</h3>
   <form id="contactForm" class="form-grid" data-dirty-scope="contact-event">
    <div class="field"><label>Fecha del contacto</label><input type="date" id="cDate" value="${localISO()}" required></div>
    <div class="field"><label>Persona contactada</label><select id="cContactId">${centerContactOptions(c,"","Sin persona concreta")}</select></div>
    <div class="field"><label>Canal</label><select id="cChannel" required><option value=""></option>${CHANNELS.map(x=>`<option>${x}</option>`).join("")}</select></div>
    <div class="field"><label>Resultado</label><select id="cResult" required><option value=""></option>${RESULTS.map(x=>`<option>${x}</option>`).join("")}</select></div>
    <div class="field"><label>Próximo contacto</label><input type="date" id="cNext"></div>
    <div class="field"><label>Hora próximo contacto</label><input type="time" id="cNextTime"></div>
    <div class="opportunity-selector"><label>¿A qué viaje(s) corresponde?</label><div class="field-help">Puedes marcar varios si la misma conversación afecta a varios grupos. El resultado y la próxima fecha se aplicarán a todos los seleccionados. Si son distintos, registra cada resultado por separado.</div><div class="opportunity-checks">${(c.workspace?.opportunities||[]).filter(o=>o.active).map(o=>`<label class="opportunity-check"><input type="checkbox" name="cOpportunity" value="${esc(o.opportunity_id)}"><span><b>${esc(o.cycle)}${o.destination?` · ${esc(o.destination)}`:""}</b><small>${esc(o.opportunity_id)} · ${esc(o.status)}</small></span></label>`).join("")||'<span class="muted">No hay viajes activos. El contacto se registrará como seguimiento general del centro.</span>'}</div></div>
    <div class="field span4"><label>Qué se ha hablado / acordado</label><textarea id="cNote" placeholder="Ej.: Hablamos con Javier, jefe de estudios. Organizan viaje de 4º ESO para unos 55 alumnos y quiere recibir propuestas de Italia…" required></textarea></div>
    <div class="field span4"><button class="btn primary" type="submit">Registrar contacto</button></div>
   </form>
  </div>
  <div class="modal-section"><h3>Historial de contactos (${events.length})</h3><div class="history-note"><span>Ordenado del más reciente al más antiguo. Cada registro muestra cuándo se contactó, quién lo registró y a qué viaje se vinculó.</span><b>Historial acumulativo</b></div><div class="timeline">
   ${events.length?events.map((e,index)=>`<div class="event"><div class="event-head"><span><span class="history-sequence">${events.length-index}</span><strong>${esc(e.author)}</strong> · Contacto ${esc(fmtDateTime(e.contactedAt)||fmtDate(e.date))} <span class="event-tag">${esc(e.channel)}</span><span class="event-tag">${esc(e.result)}</span></span><span>Registrado ${fmtDateTime(e.createdAt)}</span></div>${e.contactName?`<div class="muted mt6">Persona: ${esc(e.contactName)}${e.contactRole?` · ${esc(e.contactRole)}`:""}</div>`:""}${e.opportunities?.length?`<div class="event-links">${e.opportunities.map(o=>`<span class="event-tag">${esc(o.cycle)}${o.destination?` · ${esc(o.destination)}`:""} · ${esc(o.opportunity_id)}</span>`).join("")}</div>`:'<div class="muted mt6">Seguimiento general del centro</div>'}<div class="event-note">${esc(e.note)}${e.nextContact?`<div class="muted mt6">Próximo contacto: ${fmtDate(e.nextContact)}${e.nextContactTime?` · ${esc(e.nextContactTime)}`:""}</div>`:""}</div></div>`).join(""):'<div class="empty">Aún no hay contactos registrados con este centro.</div>'}
  </div></div>
 </div>`;
}
async function archiveCurrentCenter(){
 if(!permissions.can_archive_centers){alert("Esta acción está reservada a la administración operativa.");return}
 const c=centers.find(x=>x.id===currentCenterId);if(!c){alert("La ficha ya no está disponible.");return}
 const input=document.getElementById("fArchiveReason"),reason=input?.value.trim()||"";
 if(reason.length<8||reason.length>500){alert("Indica un motivo de entre 8 y 500 caracteres.");input?.focus();return}
 if(!confirm(`Se archivará ${c.school} (${c.id}).\n\nDesaparecerá de carteras y agenda, pero conservará todos sus datos e historial. ¿Continuar?`))return;
 const btn=document.getElementById("archiveCenterBtn");if(btn){btn.disabled=true;btn.textContent="Archivando…"}
 try{
   const {error}=await supabaseRpc("archive_center",{p_center_id:c.id,p_reason:reason});if(error)throw error;
   const dlg=document.getElementById("centerDialog");clearCenterScopeDirty();if(dlg?.open)dlg.close();currentCenterId=null;
   await loadAll();await loadLifecycleAudit(100);accessFingerprint=await getFingerprint();currentView="archived";activeStatus="";filters={search:"",status:"",community:"",seller:"",quick:"all"};render();toast(`Centro archivado · ${c.id}`);
 }catch(e){console.error(e);alert(friendlyError(e,"No se ha podido archivar el centro."));if(btn){btn.disabled=false;btn.textContent="Archivar centro"}}
}
async function saveProfile(){
 const c=centers.find(x=>x.id===currentCenterId);if(!c)return;
 if(profileSaveInFlight){showDialogActionStatus("La ficha se está guardando. Espera un momento…","info");return}
 const btn=document.getElementById("saveProfile"),statusBox=document.getElementById("profileSaveStatus");
 const showSaveStatus=(msg,type="info")=>{if(!statusBox)return;statusBox.textContent=msg;statusBox.className=`save-feedback show ${type}`};
 if(isAdmin){
   const city=document.getElementById("fCity")?.value.trim()||"",province=document.getElementById("fProvince")?.value||"";
   if(!city){alert("Indica la localidad del centro.");document.getElementById("fCity")?.focus();return}
   if(!PROVINCES.includes(province)){alert("Selecciona una provincia válida.");document.getElementById("fProvince")?.focus();return}
   c.city=city;c.province=province;c.community=communityForProvince(province);
 }
 c.status=document.getElementById("fStatus").value;
 if(isClosedStatus(c)){c.nextContact="";c.nextContactTime="";}
 if(isAdmin)c.assignedTo=document.getElementById("fAssigned").value;
 c.contactName=document.getElementById("fContactName").value.trim();c.role=document.getElementById("fRole").value;
 c.mobile=document.getElementById("fMobile").value.trim();c.directEmail=document.getElementById("fDirectEmail").value.trim();
 c.contactBlocked=!!document.getElementById("fContactBlocked")?.checked;
 c.contactBlockReason=document.getElementById("fBlockReason")?.value.trim()||"";
 profileSaveInFlight=true;if(btn){btn.disabled=true;btn.textContent="Guardando…"}showSaveStatus("Guardando cambios…","info");
 try{
   await saveCenter(c);
   await refreshOpenCenter("Ficha guardada correctamente",null,"profile");
 }catch(e){
   console.error(e);
   const msg=friendlyError(e,"No se ha podido guardar la ficha.");
   if(btn){btn.disabled=false;btn.textContent="Guardar ficha"}
   showSaveStatus(`✕ ${msg}`,"error");
   await refreshAccessSnapshot(true)
 }finally{profileSaveInFlight=false}
}
async function addContact(){
 const c=centers.find(x=>x.id===currentCenterId);if(!c)return;
 if(contactEventInFlight){showDialogActionStatus("El contacto se está registrando. Espera un momento…","info");return}
 const btn=document.getElementById("contactForm")?.querySelector('button[type="submit"]');
 const date=document.getElementById("cDate").value,channel=document.getElementById("cChannel").value,result=document.getElementById("cResult").value,note=document.getElementById("cNote").value.trim(),next=document.getElementById("cNext").value,nextInput=document.getElementById("cNextTime").value,nextTime=next?(nextInput||"09:00"):"";
 if(result==="Volver a contactar"&&!next){alert("Indica la fecha del próximo contacto para no perder este seguimiento.");document.getElementById("cNext")?.focus();return}
 const contactTime=date===localISO()?localTime():"12:00";
 const contactedAt=localDateTimeToISO(date,contactTime), nextAt=next?localDateTimeToISO(next,nextTime):null;
 const opportunityIds=[...document.querySelectorAll('input[name="cOpportunity"]:checked')].map(x=>x.value),versions={};
 (c.workspace?.opportunities||[]).forEach(o=>{if(opportunityIds.includes(o.opportunity_id))versions[o.opportunity_id]=Number(o.opportunity_version||1)});
 const contactId=Number(document.getElementById("cContactId")?.value||0)||null;
 contactEventInFlight=true;if(btn){btn.disabled=true;btn.textContent="Registrando…"}showDialogActionStatus("Registrando contacto…","info");
 try{
  const {error}=await supabaseRpc("register_contact_multi_v1",{p_center_id:c.id,p_contacted_at:contactedAt,p_channel:channel,p_result:result,p_notes:note,p_next_contact_at:nextAt,p_expected_state_version:Number(c.stateVersion||1),p_contact_id:contactId,p_opportunity_ids:opportunityIds,p_expected_opportunity_versions:versions});
  if(error)throw error;
  c.status=RESULT_STATUS[result]||c.status;
  if(isClosedStatus(c)){c.nextContact="";c.nextContactTime=""}else if(next){c.nextContact=next;c.nextContactTime=nextTime}else{c.nextContact="";c.nextContactTime=""}
  c.lastContactAt=contactedAt;c.lastResult=result;c.lastOperator=currentUser;c.contactCount=(c.contactCount||0)+1;
  await refreshOpenCenter(`Contacto registrado correctamente${opportunityIds.length?` · vinculado a ${opportunityIds.length} viaje${opportunityIds.length===1?"":"s"}`:" · seguimiento general"}`,null,"contact-event");
 }catch(error){
  console.error(error);const msg=friendlyError(error,"No se ha podido registrar el contacto.");if(btn){btn.disabled=false;btn.textContent="Registrar contacto"}showDialogActionStatus(`✕ ${msg}`,"error");alert(msg)
 }finally{contactEventInFlight=false}
}
function cardValue(card,name){const el=card?.querySelector(`[data-field="${name}"]`);return el?.type==="checkbox"?!!el.checked:(el?.value?.trim()||"")}
function nullableNumber(v){return v===""?null:Number(v)}
function bindTravelDatePair(startInput,endInput){
 if(!startInput||!endInput)return;
 const sync=(seedEmptyEnd=false)=>{
  const start=startInput.value||"";
  if(!start){endInput.removeAttribute("min");return}
  endInput.min=start;
  if(endInput.value&&endInput.value<start)endInput.value=start;
  if(seedEmptyEnd&&!endInput.value)endInput.value=start;
 };
 startInput.addEventListener("change",()=>sync(false));
 endInput.addEventListener("pointerdown",()=>sync(true));
 endInput.addEventListener("focus",()=>sync(true));
 sync(false);
}
function showDialogActionStatus(message,type="success"){
 const dlg=document.getElementById("centerDialog"),box=dlg?.querySelector("#dialogActionStatus");if(!dlg?.open||!box)return false;
 box.textContent=message;box.className=`save-feedback dialog-action-status show ${type}`;return true;
}
function showOpportunitySaveStatus(opportunityId,message,type="info"){
 const card=[...document.querySelectorAll(".opportunity-record")].find(item=>item.dataset.opportunityId===opportunityId);if(!card)return;
 let box=card.querySelector(".opportunity-save-status");
 if(!box){box=document.createElement("div");box.setAttribute("role","status");box.setAttribute("aria-live","polite");const form=card.querySelector(".entity-form");if(form)card.insertBefore(box,form);else card.appendChild(box)}
 box.textContent=message;box.className=`save-feedback opportunity-save-status show ${type}`;
}
async function refreshOpenCenter(message,feedback=null,savedScope=""){
 const id=currentCenterId,dlg=document.getElementById("centerDialog"),previousScroll=dlg?.querySelector(".modal-body")?.scrollTop||0;
 const drafts=captureDirtyDrafts(savedScope?[savedScope]:[]);
 const fresh=await refreshCenterSnapshot(id);if(!fresh){dlg?.close();return}
 await Promise.all([loadHistory(fresh),loadWorkspace(fresh)]);updateNavCounts();checkReminders();openCenterRefresh(fresh);
 restoreDirtyDrafts(drafts);
 if(feedback?.opportunityId)showOpportunitySaveStatus(feedback.opportunityId,feedback.message,feedback.type||"success");
 if(message)showDialogActionStatus(`✓ ${message} · ${localTime()}`,feedback?.type||"success");
 const refreshedBody=dlg?.querySelector(".modal-body");if(refreshedBody)refreshedBody.scrollTop=previousScroll;
}
async function saveContactRecord(contactId){
 const c=centers.find(x=>x.id===currentCenterId),contact=(c?.workspace?.contacts||[]).find(x=>Number(x.contact_id)===Number(contactId)),card=document.querySelector(`.contact-record[data-contact-id="${contactId}"]`);if(!c||!contact||!card)return;
 if(contactSaveInFlight.has(contactId)){showDialogActionStatus("La persona se está guardando. Espera un momento…","info");return}
 const patch={full_name:cardValue(card,"full_name"),role:cardValue(card,"role")||null,mobile:cardValue(card,"mobile")||null,email:cardValue(card,"email")||null,is_primary:String(document.querySelector('input[name="primaryContact"]:checked')?.value||"")===String(contactId),do_not_contact:cardValue(card,"do_not_contact"),do_not_contact_reason:cardValue(card,"do_not_contact_reason")||null};
 if(!confirmContactIsDistinct(c,patch,contactId))return;
 const btn=card.querySelector("[data-save-contact]");contactSaveInFlight.add(contactId);if(btn){btn.disabled=true;btn.textContent="Guardando…"}
 try{const {error}=await supabaseRpc("update_center_contact_v1",{p_contact_id:Number(contactId),p_patch:patch,p_expected_version:Number(contact.contact_version||1)});if(error)throw error;await refreshOpenCenter("Persona de contacto guardada correctamente",null,`contact:${contactId}`)}
 catch(e){console.error(e);alert(friendlyError(e,"No se ha podido guardar la persona de contacto."));if(btn?.isConnected){btn.disabled=false;btn.textContent="Guardar persona"}}
 finally{
  contactSaveInFlight.delete(contactId);
  const currentCard=document.querySelector(`.contact-record[data-contact-id="${contactId}"]`),currentBtn=currentCard?.querySelector("[data-save-contact]");
  if(currentBtn){currentBtn.disabled=false;currentBtn.textContent="Guardar persona"}
 }
}
async function archiveContactRecord(contactId){
 const c=centers.find(x=>x.id===currentCenterId),contact=(c?.workspace?.contacts||[]).find(x=>Number(x.contact_id)===Number(contactId));if(!c||!contact||!contact.active)return;
 const lockKey=`contact-archive:${contactId}`;if(lifecycleInFlight.has(lockKey))return;
 const linkedActiveTrip=(c.workspace?.opportunities||[]).find(x=>x.active&&Number(x.contact_id)===Number(contactId));
 if(linkedActiveTrip){alert(`No se puede eliminar esta persona porque está vinculada al viaje activo ${linkedActiveTrip.opportunity_id}. Cambia primero la persona responsable del viaje o déjalo sin persona vinculada.`);return}
 if(!confirm(`Se retirará a «${contact.full_name}» de las personas activas de este centro. El historial se conservará y no se modificará ningún viaje ni contacto comercial. ¿Continuar?`))return;
 const card=document.querySelector(`.contact-record[data-contact-id="${contactId}"]`),btn=card?.querySelector("[data-archive-contact]");lifecycleInFlight.add(lockKey);if(btn){btn.disabled=true;btn.textContent="Eliminando…"}
 try{const {error}=await supabaseRpc("archive_center_contact_v1",{p_contact_id:Number(contactId),p_expected_version:Number(contact.contact_version||1)});if(error)throw error;await refreshOpenCenter("Persona eliminada de los contactos activos",null,`contact:${contactId}`)}
 catch(e){console.error(e);const message=String(e?.message||"").includes("CONTACT_LINKED_TO_ACTIVE_TRIP")?"No se puede eliminar esta persona porque está vinculada a un viaje activo. Cambia primero la persona responsable del viaje.":friendlyError(e,"No se ha podido eliminar la persona de contacto.");alert(message);if(btn?.isConnected){btn.disabled=false;btn.textContent="Eliminar persona"}}
 finally{lifecycleInFlight.delete(lockKey)}
}
async function createCenterContact(){
 const c=centers.find(x=>x.id===currentCenterId),btn=document.getElementById("createContactBtn");if(!c)return;
 if(createContactInFlight){showDialogActionStatus("La persona se está registrando. Espera un momento…","info");return}
 const payload={full_name:document.getElementById("newContactName")?.value.trim()||"",role:document.getElementById("newContactRole")?.value||null,mobile:document.getElementById("newContactMobile")?.value.trim()||null,email:document.getElementById("newContactEmail")?.value.trim()||null,is_primary:!!document.getElementById("newContactPrimary")?.checked,do_not_contact:!!document.getElementById("newContactBlocked")?.checked,do_not_contact_reason:document.getElementById("newContactBlockedReason")?.value.trim()||null};
 createContactInFlight=true;if(btn){btn.disabled=true;btn.textContent="Comprobando persona…"}showDialogActionStatus("Comprobando que la persona no esté ya registrada…","info");
 try{
  try{await loadWorkspace(c)}catch(refreshError){console.warn("No se pudo refrescar la comprobación previa",refreshError?.message||"")}
  if(!confirmContactIsDistinct(c,payload)){showDialogActionStatus("No se ha añadido: coincide con una persona existente.","error");return}
  if(btn?.isConnected)btn.textContent="Registrando persona…";showDialogActionStatus("Registrando la persona de contacto. Espera un momento…","info");
  const {error}=await supabaseRpc("create_center_contact_v1",{p_center_id:c.id,p_full_name:payload.full_name,p_role:payload.role,p_mobile:payload.mobile,p_email:payload.email,p_is_primary:payload.is_primary,p_do_not_contact:payload.do_not_contact,p_do_not_contact_reason:payload.do_not_contact_reason});if(error)throw error;
  await refreshOpenCenter("Persona añadida correctamente",null,"new-contact")
 }
 catch(e){console.error(e);const message=friendlyError(e,"No se ha podido añadir la persona de contacto.");showDialogActionStatus(`✕ ${message}`,"error");alert(message)}
 finally{
  createContactInFlight=false;
  const currentBtn=document.getElementById("createContactBtn");
  if(currentBtn){currentBtn.disabled=false;currentBtn.textContent="Añadir persona"}
 }
}
function opportunityPatch(c,card){const status=cardValue(card,"status"),date=cardValue(card,"next_date"),time=cardValue(card,"next_time")||"09:00",sourceChoice=cardValue(card,"lead_source_choice"),sourceDetail=cardValue(card,"lead_source_detail");return {cycle:cardValue(card,"cycle"),group_description:cardValue(card,"group_description")||null,students_count:nullableNumber(cardValue(card,"students_count")),teachers_count:nullableNumber(cardValue(card,"teachers_count")),destination:cardValue(card,"destination")||null,travel_start_on:cardValue(card,"travel_start_on")||null,travel_end_on:cardValue(card,"travel_end_on")||null,contact_id:nullableNumber(cardValue(card,"contact_id")),status,next_contact_at:date?localDateTimeToISO(date,time):null,lead_source:resolvedOpportunitySource(c,sourceChoice),lead_source_detail:resolvedOpportunitySourceDetail(c,sourceChoice,sourceDetail)}}
async function saveOpportunity(opportunityId){
 const c=centers.find(x=>x.id===currentCenterId),o=(c?.workspace?.opportunities||[]).find(x=>x.opportunity_id===opportunityId),card=[...document.querySelectorAll(".opportunity-record")].find(item=>item.dataset.opportunityId===opportunityId);if(!c||!o||!card)return;
 if(opportunitySaveInFlight.has(opportunityId)){showOpportunitySaveStatus(opportunityId,"El viaje se está guardando. Espera un momento…","info");return}
 const btn=card.querySelector("[data-save-opportunity]");opportunitySaveInFlight.add(opportunityId);if(btn){btn.disabled=true;btn.textContent="Guardando…"}showOpportunitySaveStatus(opportunityId,"Guardando cambios…","info");
 try{
  const {error}=await supabaseRpc("update_travel_opportunity_v1",{p_opportunity_id:opportunityId,p_patch:opportunityPatch(c,card),p_expected_version:Number(o.opportunity_version||1)});if(error)throw error;
  await refreshOpenCenter(null,{opportunityId,message:`✓ Viaje guardado correctamente · ${localTime()}`,type:"success"},`opportunity:${opportunityId}`)
 }catch(e){
  console.error(e);const msg=friendlyError(e,"No se ha podido guardar el viaje.");if(btn){btn.disabled=false;btn.textContent="Guardar viaje"}showOpportunitySaveStatus(opportunityId,`✕ ${msg}`,"error");alert(msg)
 }finally{
  opportunitySaveInFlight.delete(opportunityId);
  const currentCard=[...document.querySelectorAll(".opportunity-record")].find(item=>item.dataset.opportunityId===opportunityId),currentBtn=currentCard?.querySelector("[data-save-opportunity]");
  if(currentBtn){currentBtn.disabled=false;currentBtn.textContent="Guardar viaje"}
 }
}
async function createOpportunity(){
 const c=centers.find(x=>x.id===currentCenterId),btn=document.getElementById("createOpportunityBtn");if(!c)return;
 if(createOpportunityInFlight){showDialogActionStatus("El viaje se está registrando. Espera un momento…","info");return}
 createOpportunityInFlight=true;if(btn){btn.disabled=true;btn.textContent="Registrando viaje…"}showDialogActionStatus("Registrando el viaje. Espera un momento…","info");
 const date=document.getElementById("newOppNext")?.value||"",time=document.getElementById("newOppNextTime")?.value||"09:00",sourceChoice=document.getElementById("newOppSourceChoice")?.value||CENTER_SOURCE_OPTION,sourceDetail=document.getElementById("newOppSourceDetail")?.value||"";
 try{const {error}=await supabaseRpc("create_travel_opportunity_v1",{p_center_id:c.id,p_campaign_code:currentCampaign?.code||null,p_cycle:document.getElementById("newOppCycle")?.value||null,p_group_description:document.getElementById("newOppGroup")?.value.trim()||null,p_students_count:nullableNumber(document.getElementById("newOppStudents")?.value||""),p_teachers_count:nullableNumber(document.getElementById("newOppTeachers")?.value||""),p_destination:document.getElementById("newOppDestination")?.value.trim()||null,p_travel_start_on:document.getElementById("newOppStart")?.value||null,p_travel_end_on:document.getElementById("newOppEnd")?.value||null,p_contact_id:nullableNumber(document.getElementById("newOppContact")?.value||""),p_status:document.getElementById("newOppStatus")?.value||"Pendiente",p_next_contact_at:date?localDateTimeToISO(date,time):null,p_lead_source:resolvedOpportunitySource(c,sourceChoice),p_lead_source_detail:resolvedOpportunitySourceDetail(c,sourceChoice,sourceDetail)});if(error)throw error;await refreshOpenCenter("Viaje creado correctamente",null,"new-opportunity")}
 catch(e){console.error(e);alert(friendlyError(e,"No se ha podido crear el viaje."))}
 finally{
  createOpportunityInFlight=false;
  const currentBtn=document.getElementById("createOpportunityBtn");
  if(currentBtn){currentBtn.disabled=false;currentBtn.textContent="Crear viaje"}
 }
}
async function changeOpportunityLifecycle(opportunityId,restore=false){
 const c=centers.find(x=>x.id===currentCenterId),o=(c?.workspace?.opportunities||[]).find(x=>x.opportunity_id===opportunityId);if(!o)return;
 const lockKey=`opportunity-lifecycle:${opportunityId}`;if(lifecycleInFlight.has(lockKey))return;
 const action=restore?"restaurar":"archivar",scope=`opportunity:${opportunityId}`;
 if(centerDialogDirtyScopes.has(scope)&&!confirm(`Este viaje tiene cambios sin guardar. Si continúas, esos cambios se descartarán antes de ${action}.\n\n¿Continuar?`))return;
 const reason=prompt(`Motivo obligatorio para ${action} ${o.cycle} (${opportunityId}):`);if(reason===null)return;if(reason.trim().length<8){alert("Indica un motivo de al menos 8 caracteres.");return}if(!confirm(`Se va a ${action} este viaje. La ficha del colegio y sus demás viajes no se modificarán. ¿Continuar?`))return;
 const card=[...document.querySelectorAll(".opportunity-record")].find(item=>item.dataset.opportunityId===opportunityId),btn=card?.querySelector(restore?"[data-restore-opportunity]":"[data-archive-opportunity]");lifecycleInFlight.add(lockKey);if(btn){btn.disabled=true;btn.textContent=restore?"Restaurando…":"Archivando…"}
 try{const {error}=await supabaseRpc(restore?"restore_travel_opportunity_v1":"archive_travel_opportunity_v1",{p_opportunity_id:opportunityId,p_reason:reason.trim(),p_expected_version:Number(o.opportunity_version||1)});if(error)throw error;await refreshOpenCenter(restore?"Viaje restaurado correctamente":"Viaje archivado correctamente",null,scope)}
 catch(e){console.error(e);alert(friendlyError(e,`No se ha podido ${action} el viaje.`));if(btn?.isConnected){btn.disabled=false;btn.textContent=restore?"Restaurar viaje":"Archivar viaje"}}
 finally{
  lifecycleInFlight.delete(lockKey);
  const currentCard=[...document.querySelectorAll(".opportunity-record")].find(item=>item.dataset.opportunityId===opportunityId),currentBtn=currentCard?.querySelector("[data-restore-opportunity], [data-archive-opportunity]");
  if(currentBtn){currentBtn.disabled=false;currentBtn.textContent=currentBtn.dataset.restoreOpportunity?"Restaurar viaje":"Archivar viaje"}
 }
}
function bindCenterDialog(c){
 const dlg=document.getElementById("centerDialog");
 bindCenterDirtyTracking(dlg);
 dlg.querySelector(".close").onclick=requestCloseCenterDialog;
 dlg.querySelector("#saveProfile").onclick=saveProfile;
 dlg.querySelector("#contactForm").onsubmit=e=>{e.preventDefault();addContact()};
 const province=dlg.querySelector("#fProvince");if(province)province.onchange=()=>{const community=dlg.querySelector("#fCommunity");if(community)community.value=communityForProvince(province.value)};
 const archiveBtn=dlg.querySelector("#archiveCenterBtn");if(archiveBtn)archiveBtn.onclick=archiveCurrentCenter;
 const createContact=dlg.querySelector("#createContactBtn");if(createContact){createContact.onclick=createCenterContact;if(createContactInFlight){createContact.disabled=true;createContact.textContent="Registrando persona…"}}
 const createOpp=dlg.querySelector("#createOpportunityBtn");if(createOpp){createOpp.onclick=createOpportunity;if(createOpportunityInFlight){createOpp.disabled=true;createOpp.textContent="Registrando viaje…"}}
 bindTravelDatePair(dlg.querySelector("#newOppStart"),dlg.querySelector("#newOppEnd"));
 dlg.querySelectorAll(".opportunity-record").forEach(card=>bindTravelDatePair(card.querySelector('[data-field="travel_start_on"]'),card.querySelector('[data-field="travel_end_on"]')));
 dlg.querySelectorAll("[data-opportunity-source]").forEach(select=>{toggleOpportunitySourceDetail(select,false);select.onchange=()=>toggleOpportunitySourceDetail(select,true)});
 dlg.querySelectorAll("[data-save-contact]").forEach(b=>{const id=Number(b.dataset.saveContact);b.onclick=()=>saveContactRecord(id);if(contactSaveInFlight.has(id)){b.disabled=true;b.textContent="Guardando…"}});
 dlg.querySelectorAll(".contact-record").forEach(card=>{const actions=card.querySelector(".entity-actions"),contactId=Number(card.dataset.contactId);if(!actions||actions.querySelector("[data-archive-contact]"))return;const button=document.createElement("button");button.className="btn danger";button.type="button";button.dataset.archiveContact=String(contactId);button.textContent="Eliminar persona";button.onclick=()=>archiveContactRecord(contactId);actions.appendChild(button)});
 dlg.querySelectorAll("[data-save-opportunity]").forEach(b=>{const id=b.dataset.saveOpportunity;b.onclick=()=>saveOpportunity(id);if(opportunitySaveInFlight.has(id)){b.disabled=true;b.textContent="Guardando…"}});
 dlg.querySelectorAll("[data-archive-opportunity]").forEach(b=>{const id=b.dataset.archiveOpportunity;b.onclick=()=>changeOpportunityLifecycle(id,false);if(lifecycleInFlight.has(`opportunity-lifecycle:${id}`)){b.disabled=true;b.textContent="Archivando…"}});
 dlg.querySelectorAll("[data-restore-opportunity]").forEach(b=>{const id=b.dataset.restoreOpportunity;b.onclick=()=>changeOpportunityLifecycle(id,true);if(lifecycleInFlight.has(`opportunity-lifecycle:${id}`)){b.disabled=true;b.textContent="Restaurando…"}});
}
function openCenterRefresh(c){const dlg=document.getElementById("centerDialog");dlg.innerHTML=dialogHtml(c);bindCenterDialog(c);if(currentView==="dashboard")renderDashboard();else if(currentView==="stats"){statisticsData=null;renderStatistics()}else if(currentView==="archived")paintArchivedCenters();else renderList()}

function reminderCandidates(){return overdueCandidates()}
function updateReminderStrip(){
 const strip=document.getElementById("reminderStrip");if(!strip)return;
 const due=reminderCandidates();
 const navBtn=document.querySelector('[data-view="overdue"]');
 const navCount=document.getElementById("navOverdueCount");
 const snoozed=isReminderSnoozed();
 if(navBtn)navBtn.classList.toggle("snoozed",snoozed&&due.length>0);
 if(navCount)navCount.textContent=snoozed?"":due.length.toLocaleString("es-ES");
 if(snoozed){strip.hidden=true;return;}
 if(!due.length){strip.hidden=true;return;}
 strip.hidden=false;document.getElementById("reminderText").textContent=`⚠ ${due.length} seguimiento${due.length===1?"":"s"} necesita${due.length===1?"":"n"} ACTUALIZAR AGENDA. `;
 const first=due[0];document.getElementById("reminderDetail").textContent=`Primero: ${first.school} · ${first._agendaItem?.title||"Seguimiento general"} · ${fmtNext(first)}`;
}
function reminderId(c){return `${currentUser}|${c._agendaItem?.task_key||c.id}|${nextKey(c)}`}
function notifiedSet(){try{return new Set(JSON.parse(sessionStorage.getItem("vgeNotifiedReminders")||"[]"))}catch{return new Set()}}
function saveNotified(set){sessionStorage.setItem("vgeNotifiedReminders",JSON.stringify([...set].slice(-2000)))}
function checkReminders(){
 updateReminderStrip();
 if(isReminderSnoozed())return;
 const due=reminderCandidates();if(!due.length)return;
 if(!(window.Notification&&Notification.permission==="granted"))return;
 const done=notifiedSet();
 due.slice(0,5).forEach(c=>{const id=reminderId(c);if(done.has(id))return;
   try{const n=new Notification("VGE · Seguimiento pendiente",{body:`${c.school} · ${c._agendaItem?.title||"Seguimiento general"} · ${fmtNext(c)}${c.contactName?` · ${c.contactName}`:""}`,tag:`vge-${c._agendaItem?.task_key||c.id}`});n.onclick=()=>{window.focus();openCenter(c.id)}}catch(e){}
   done.add(id);
 });saveNotified(done);
}
async function enableAlerts(){
 if(!window.Notification){alert("Este navegador no admite notificaciones del sistema. Los avisos dentro del CRM seguirán funcionando.");return;}
 try{const p=await Notification.requestPermission();updateAlertButton();if(p==="granted"){toast("Avisos del navegador activados");checkReminders()}else alert("No se han concedido permisos. Seguirás viendo avisos dentro del CRM cuando esté abierto.")}catch(e){alert("El navegador no permite activar notificaciones desde este archivo. Los avisos internos seguirán funcionando.")}
}
function updateAlertButton(){const b=document.getElementById("enableAlertsBtn");if(!b)return;const ok=window.Notification&&Notification.permission==="granted";b.classList.toggle("enabled",!!ok);b.textContent=ok?"🔔 Avisos activos":"🔔 Avisos"}
async function logExport(format,view,rowCount,details={}){const {error}=await supabaseRpc("log_export",{p_format:format,p_view:view,p_row_count:rowCount,p_details:details});if(error){console.error(error);throw new Error("No se ha podido registrar la exportación")}}
function download(name,text,type="application/json"){
 const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
async function exportJSON(){
 if(!isOwner){alert("La copia JSON completa está reservada al propietario.");return}
 try{
   toast("Preparando copia completa…");
   const {data,error}=await supabaseRpc("owner_export_full_backup_v3");if(error)throw error;
   const backup=Array.isArray(data)&&data.length===1&&data[0]?.schema_version?data[0]:data;
   if(!backup||!Array.isArray(backup.centers)||!Array.isArray(backup.contact_events))throw new Error("BACKUP_PAYLOAD_INVALID");
   const activeCount=backup.centers.filter(c=>c.active).length,archivedCount=backup.centers.length-activeCount;
   await logExport("json","owner-full-v15",backup.centers.length,{events:backup.contact_events.length,travel_opportunities:(backup.travel_opportunities||[]).length,center_contacts:(backup.center_contacts||[]).length,active_centers:activeCount,archived_centers:archivedCount,schema_version:backup.schema_version});
   download(`crm-vge-copia-completa-v15-${localISO()}.json`,JSON.stringify(backup,null,2));
   toast("Copia completa generada");
 }catch(e){console.error(e);alert(friendlyError(e,"No se ha podido realizar la copia completa."))}
}
async function exportCSV(){
 if(currentView==="stats"){await exportStatisticsCSV();return}
 if(currentView==="archived"){alert("La vista de archivados no se incluye en exportaciones operativas. Restaura primero la ficha si necesitas exportarla.");return}
 const arr=await safeExportRowsForCurrentView();
 const cols=["id","assignedToLabel","portfolioStatusLabel","status","taskType","taskTitle","taskOpportunityId","nextContactLabel","nextContactTimeLabel","school","city","province","community","leadSource","leadSourceDetail","createdByOperatorLabel","centerCreatedAtLabel","schoolPhone","schoolEmail","contactName","role","mobile","directEmail","contactBlockedLabel","opportunityTotal","opportunityPending","opportunityInterested","opportunityQuoted","opportunityNotInterested"];
 const header=["ID","Responsable","Estado de cartera","Estado general","Tipo de seguimiento","Detalle del seguimiento","ID viaje","Próximo contacto","Hora","Centro","Ciudad","Provincia","Comunidad","Origen del lead","Detalle origen","Creado por","Fecha de alta","Teléfono centro","Email centro","Contacto","Cargo","Móvil","Email directo","No contactar","Nº viajes","Viajes pendientes","Viajes interesados","Viajes a cotización","Viajes no interesados"];
 const q=v=>{let x=String(v??"");if(/^[=+\-@\t\r]/.test(x))x="'"+x;return `"${x.replace(/"/g,'""')}"`};
 const safeArr=arr.map(c=>{const n=nextParts(c);return {...(c.contactBlocked?{...c,mobile:"",directEmail:""}:c),assignedToLabel:operatorLabel(c.assignedTo),portfolioStatusLabel:portfolioStatus(c),createdByOperatorLabel:c.createdByOperator?operatorLabel(c.createdByOperator):"",centerCreatedAtLabel:c.centerCreatedAt?fmtDateTime(c.centerCreatedAt):"",contactBlockedLabel:c.contactBlocked?"SI":"NO",taskType:c._agendaItem?.task_type||"",taskTitle:c._agendaItem?.title||"",taskOpportunityId:c._agendaItem?.opportunity_id||"",nextContactLabel:n.date?fmtDate(n.date):"",nextContactTimeLabel:n.time||""}});
 const csv="\ufeff"+[header.map(q).join(";"),...safeArr.map(c=>cols.map(k=>q(c[k])).join(";"))].join("\n");
 try{await logExport("csv",currentView,safeArr.length,{status:activeStatus||filters.status||null});download(`crm-vge-${currentView}-${localISO()}.csv`,csv,"text/csv;charset=utf-8");toast("CSV exportado")}catch(e){alert("No se ha podido registrar la exportación; no se ha generado el fichero.")}
}
async function importJSON(){alert("La versión online no sustituye la base desde el navegador. Usa el procedimiento de migración administrada.")}
async function resetData(){alert("Restablecimiento deshabilitado en producción para proteger el histórico.")}

function configureNavForRole(){
 ["all","unassigned","bulk","team"].forEach(view=>{
   const btn=document.querySelector(`[data-view="${view}"]`);
   if(btn)btn.style.display=isAdmin?"flex":"none";
 });
 const archivedBtn=document.querySelector('[data-view="archived"]');if(archivedBtn)archivedBtn.style.display=permissions.can_archive_centers?"flex":"none";
 const permissionsBtn=document.querySelector('[data-view="permissions"]');if(permissionsBtn)permissionsBtn.style.display=isOwner?"flex":"none";
 if(!isAdmin&&["all","unassigned","bulk","team"].includes(currentView))currentView="dashboard";
 if(!permissions.can_archive_centers&&currentView==="archived")currentView="dashboard";
 if(!isOwner&&currentView==="permissions")currentView="dashboard";
 document.getElementById("sessionUser").textContent=currentOperator?.display_name||currentUser;
 document.getElementById("sessionRole").textContent=accessRoleLabel(accessRole);
 const backup=document.getElementById("backupBtn");if(backup)backup.style.display=isOwner?"":"none";
 const jsonBtn=document.getElementById("exportBtn");if(jsonBtn)jsonBtn.style.display=isOwner?"":"none";
}

document.addEventListener("click",e=>{
 const taskEmailBtn=e.target.closest("[data-email-task]");
 if(taskEmailBtn){e.preventDefault();e.stopPropagation();openEmailForTask(taskEmailBtn.dataset.emailTask);return;}
 const emailBtn=e.target.closest("[data-email-center]");
 if(emailBtn){e.preventDefault();e.stopPropagation();openEmailForCenter(emailBtn.dataset.emailCenter);return;}
 const overdueBtn=e.target.closest("[data-overdue-email]");
 if(overdueBtn){e.preventDefault();e.stopPropagation();openOverdueCenterEmail(overdueBtn.dataset.overdueEmail);return;}
});
