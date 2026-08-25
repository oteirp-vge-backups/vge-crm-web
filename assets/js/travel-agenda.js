// CRM VGE R10 · Fase 6 · viajes, oportunidades y agenda
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
function showOpportunitySaveStatus(opportunityId,message,type="info"){
 const card=[...document.querySelectorAll(".opportunity-record")].find(item=>item.dataset.opportunityId===opportunityId);if(!card)return;
 let box=card.querySelector(".opportunity-save-status");
 if(!box){box=document.createElement("div");box.setAttribute("role","status");box.setAttribute("aria-live","polite");const form=card.querySelector(".entity-form");if(form)card.insertBefore(box,form);else card.appendChild(box)}
 box.textContent=message;box.className=`save-feedback opportunity-save-status show ${type}`;
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
