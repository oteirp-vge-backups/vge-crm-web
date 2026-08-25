// CRM VGE R10 · Fase 6 · contactos y actividad comercial
function centerContactOptions(c,selected="",blankLabel="Sin vincular"){const contacts=(c.workspace?.contacts||[]).filter(x=>x.active);return `<option value="">${esc(blankLabel)}</option>`+contacts.map(x=>`<option value="${x.contact_id}" ${String(x.contact_id)===String(selected||"")?"selected":""} ${x.do_not_contact?"disabled":""}>${esc(x.full_name)}${x.role?` · ${esc(x.role)}`:""}${x.do_not_contact?" · NO CONTACTAR":""}</option>`).join("")}
function contactsHtml(c){const contacts=(c.workspace?.contacts||[]).filter(x=>x.active);return `<div class="entity-list">${contacts.length?contacts.map(x=>`<div class="entity-card contact-record" data-contact-id="${x.contact_id}" data-dirty-scope="contact:${x.contact_id}"><div class="entity-head"><div><h4>${esc(x.full_name)} ${x.is_primary?'<span class="event-tag">Principal</span>':""}${x.do_not_contact?'<span class="event-tag">NO CONTACTAR</span>':""}</h4><p>Versión ${Number(x.contact_version||1)}</p></div><div class="entity-actions">${!x.do_not_contact&&x.mobile?`<a class="icon-btn" href="tel:${esc(String(x.mobile).replace(/\s/g,""))}">☎</a>`:""}${!x.do_not_contact&&x.email?`<a class="icon-btn" href="mailto:${encodeURIComponent(x.email)}">✉</a>`:""}<button class="btn" type="button" data-save-contact="${x.contact_id}">Guardar persona</button></div></div><div class="entity-form"><div class="field"><label>Nombre y apellidos</label><input data-field="full_name" value="${esc(x.full_name)}"></div><div class="field"><label>Cargo</label><select data-field="role"><option value=""></option>${options(ROLES,x.role||"")}</select></div><div class="field"><label>Móvil / directo</label><input data-field="mobile" value="${esc(x.mobile||"")}"></div><div class="field"><label>Email directo</label><input data-field="email" type="email" value="${esc(x.email||"")}"></div><div class="field span2"><label><input type="radio" name="primaryContact" value="${x.contact_id}" ${x.is_primary?"checked":""}> Contacto principal del centro</label><span class="field-help">Se usa por defecto en la ficha y los accesos rápidos.</span></div><div class="field"><label><input data-field="do_not_contact" type="checkbox" ${x.do_not_contact?"checked":""}> No contactar con esta persona</label></div><div class="field"><label>Motivo</label><input data-field="do_not_contact_reason" value="${esc(x.do_not_contact_reason||"")}" placeholder="Obligatorio si se bloquea"></div></div></div>`).join(""):'<div class="empty">Todavía no hay personas de contacto.</div>'}</div><div class="entity-create" data-dirty-scope="new-contact"><h4>Añadir persona de contacto</h4><div class="entity-form"><div class="field"><label>Nombre y apellidos *</label><input id="newContactName"></div><div class="field"><label>Cargo</label><select id="newContactRole"><option value=""></option>${options(ROLES,"")}</select></div><div class="field"><label>Móvil / directo</label><input id="newContactMobile"></div><div class="field"><label>Email directo</label><input id="newContactEmail" type="email"></div><div class="field span2"><label><input id="newContactPrimary" type="checkbox" ${contacts.length?"":"checked"}> Convertir en contacto principal</label></div><div class="field"><label><input id="newContactBlocked" type="checkbox"> No contactar</label></div><div class="field"><label>Motivo</label><input id="newContactBlockedReason" placeholder="Obligatorio si se bloquea"></div><div class="field span4"><button class="btn primary" type="button" id="createContactBtn">Añadir persona</button></div></div></div>`}
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
