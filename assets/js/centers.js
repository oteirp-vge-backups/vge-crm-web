// CRM VGE R10 · Fase 6 · centros y ficha de centro
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
 }catch(e){if(currentView==="archived")content.innerHTML=`<div class="empty">${esc(friendlyError(e,"No se ha podido cargar el archivo de centros."))}</div>`}
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
 }catch(e){alert(friendlyError(e,"No se ha podido restaurar el centro."));btn.disabled=false;btn.textContent="Restaurar"}
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
   newCenterDuplicateCandidates=[];newCenterDuplicateKey="";
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
   if(btn){btn.disabled=false;btn.textContent="Crear centro"}
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
   if(btn){btn.disabled=false;btn.textContent="Crear centro"}
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
 try{await Promise.all([loadHistory(c),loadWorkspace(c)])}catch(e){toast(friendlyError(e,"No se ha podido cargar toda la ficha"))}
 const dlg=document.getElementById("centerDialog");
 dlg.innerHTML=dialogHtml(c);dlg.showModal();
 bindCenterDialog(c);
}
function workspaceSummaryHtml(c){const active=(c.workspace?.opportunities||[]).filter(o=>o.active),contacts=(c.workspace?.contacts||[]).filter(x=>x.active);return `<div class="workspace-summary"><span class="workspace-pill"><strong>${active.length}</strong> viaje${active.length===1?"":"s"} · campaña ${esc(c.workspace?.campaign?.label||currentCampaign?.label||"")}</span><span class="workspace-pill"><strong>${contacts.length}</strong> persona${contacts.length===1?"":"s"} de contacto</span>${active.filter(o=>o.status==="Interesado").length?`<span class="workspace-pill"><strong>${active.filter(o=>o.status==="Interesado").length}</strong> interesado${active.filter(o=>o.status==="Interesado").length===1?"":"s"}</span>`:""}${active.filter(o=>o.status==="Trasladado a cotización").length?`<span class="workspace-pill"><strong>${active.filter(o=>o.status==="Trasladado a cotización").length}</strong> a cotización</span>`:""}</div>`}
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
 }catch(e){alert(friendlyError(e,"No se ha podido archivar el centro."));if(btn){btn.disabled=false;btn.textContent="Archivar centro"}}
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
   const msg=friendlyError(e,"No se ha podido guardar la ficha.");
   if(btn){btn.disabled=false;btn.textContent="Guardar ficha"}
   showSaveStatus(`✕ ${msg}`,"error");
   await refreshAccessSnapshot(true)
 }finally{profileSaveInFlight=false}
}
function cardValue(card,name){const el=card?.querySelector(`[data-field="${name}"]`);return el?.type==="checkbox"?!!el.checked:(el?.value?.trim()||"")}
function showDialogActionStatus(message,type="success"){
 const dlg=document.getElementById("centerDialog"),box=dlg?.querySelector("#dialogActionStatus");if(!dlg?.open||!box)return false;
 box.textContent=message;box.className=`save-feedback dialog-action-status show ${type}`;return true;
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
