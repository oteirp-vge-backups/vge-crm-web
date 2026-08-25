// CRM VGE R10 · Fase 6 · dirección, estadísticas y operaciones de equipo
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

async function logExport(format,view,rowCount,details={}){const {error}=await supabaseRpc("log_export",{p_format:format,p_view:view,p_row_count:rowCount,p_details:details});if(error){console.error(error);throw new Error("No se ha podido registrar la exportación")}}
function download(name,text,type="application/json"){
 const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
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
