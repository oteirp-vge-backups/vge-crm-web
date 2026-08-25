// CRM VGE R10 · Fase 5 · core.js
const INITIAL_CENTERS = []; // La base ya no viaja dentro del HTML.
const CRM_BUILD = "2026-08-24-production-v15-owner-invitations-r9-8";
let OPERATORS = [];
let USERS = [];
const STATUSES = ["Pendiente","Interesado","Trasladado a cotización","No interesado"];
const CHANNELS = ["Llamada","Email","WhatsApp","Reunión","Otro"];
const RESULTS = ["No localizado","Información enviada","Pide presupuesto","No interesado","Volver a contactar"];
const ROLES = ["Responsable actividades","Jefe/a de estudios","Director/a","Profesor/a organizador/a","Coordinador/a","Secretaría","AMPA","Otro"];
const CYCLES = ["6.º Primaria","1.º ESO","2.º ESO","3.º ESO","4.º ESO","Bachillerato","FP","Varios ciclos","Otro"];
const PROVINCES = ["Álava","Albacete","Alicante","Almería","Asturias","Ávila","Badajoz","Barcelona","Bizkaia","Burgos","Cáceres","Cádiz","Cantabria","Castellón","Ceuta","Ciudad Real","Córdoba","A Coruña","Cuenca","Girona","Granada","Guadalajara","Gipuzkoa","Huelva","Huesca","Islas Baleares","Jaén","La Rioja","Las Palmas","León","Lleida","Lugo","Madrid","Málaga","Melilla","Murcia","Navarra","Ourense","Palencia","Pontevedra","Salamanca","Santa Cruz de Tenerife","Segovia","Sevilla","Soria","Tarragona","Teruel","Toledo","Valencia","Valladolid","Zamora","Zaragoza"];
const LEAD_SOURCES = ["Llamada entrante","Email recibido","Formulario web","Google Ads","Recomendación","Profesor conocido","WhatsApp","Prospección comercial","Otro"];
const PROVINCE_COMMUNITIES = Object.freeze({
  "Álava":"País Vasco","Albacete":"Castilla-La Mancha","Alicante":"Comunidad Valenciana","Almería":"Andalucía","Asturias":"Asturias","Ávila":"Castilla y León","Badajoz":"Extremadura","Barcelona":"Cataluña","Bizkaia":"País Vasco","Burgos":"Castilla y León","Cáceres":"Extremadura","Cádiz":"Andalucía","Cantabria":"Cantabria","Castellón":"Comunidad Valenciana","Ceuta":"Ceuta","Ciudad Real":"Castilla-La Mancha","Córdoba":"Andalucía","A Coruña":"Galicia","Cuenca":"Castilla-La Mancha","Girona":"Cataluña","Granada":"Andalucía","Guadalajara":"Castilla-La Mancha","Gipuzkoa":"País Vasco","Huelva":"Andalucía","Huesca":"Aragón","Islas Baleares":"Islas Baleares","Jaén":"Andalucía","La Rioja":"La Rioja","Las Palmas":"Canarias","León":"Castilla y León","Lleida":"Cataluña","Lugo":"Galicia","Madrid":"Madrid","Málaga":"Andalucía","Melilla":"Melilla","Murcia":"Región de Murcia","Navarra":"Navarra","Ourense":"Galicia","Palencia":"Castilla y León","Pontevedra":"Galicia","Salamanca":"Castilla y León","Santa Cruz de Tenerife":"Canarias","Segovia":"Castilla y León","Sevilla":"Andalucía","Soria":"Castilla y León","Tarragona":"Cataluña","Teruel":"Aragón","Toledo":"Castilla-La Mancha","Valencia":"Comunidad Valenciana","Valladolid":"Castilla y León","Zamora":"Castilla y León","Zaragoza":"Aragón"
});
const CENTER_SOURCE_OPTION = "__center__";
const OPPORTUNITY_DETAIL_SOURCES = new Set(["Formulario web","Google Ads","Recomendación","Profesor conocido","Prospección comercial","Otro"]);
function communityForProvince(province){return PROVINCE_COMMUNITIES[province]||""}
function provinceOptions(selected){const value=String(selected||"").trim(),legacy=value&&!PROVINCES.includes(value)?`<option value="${esc(value)}" selected>${esc(value)}</option>`:"";return `<option value="">Selecciona…</option>${legacy}`+PROVINCES.map(item=>`<option value="${esc(item)}" ${item===value?"selected":""}>${esc(item)}</option>`).join("")}
function opportunitySourceChoice(c,source){const value=String(source||"").trim();if(!value||value===String(c?.leadSource||"").trim())return CENTER_SOURCE_OPTION;return LEAD_SOURCES.includes(value)?value:"Otro"}
function opportunitySourceDetail(c,o){const detail=String(o?.lead_source_detail||"").trim(),source=String(o?.lead_source||"").trim();if(source&&source!==String(c?.leadSource||"").trim()&&!LEAD_SOURCES.includes(source))return [detail,`Origen anterior: ${source}`].filter(Boolean).join(" · ");return detail}
function opportunitySourceOptions(c,source){const selected=opportunitySourceChoice(c,source),centerSource=String(c?.leadSource||"").trim();return `<option value="${CENTER_SOURCE_OPTION}" ${selected===CENTER_SOURCE_OPTION?"selected":""}>Usar origen del centro${centerSource?` (actual: ${esc(centerSource)})`:" (sin origen informado)"}</option>`+LEAD_SOURCES.map(item=>`<option value="${esc(item)}" ${selected===item?"selected":""}>${esc(item)}</option>`).join("")}
function resolvedOpportunitySource(c,choice){return choice===CENTER_SOURCE_OPTION?(String(c?.leadSource||"").trim()||null):(String(choice||"").trim()||null)}
function resolvedOpportunitySourceDetail(c,choice,detail){const value=String(detail||"").trim();if(value)return value;return choice===CENTER_SOURCE_OPTION?(String(c?.leadSourceDetail||"").trim()||null):null}
function opportunitySourceNeedsDetail(choice){return OPPORTUNITY_DETAIL_SOURCES.has(choice)}
function toggleOpportunitySourceDetail(select,clearWhenHidden=false){if(!select)return;const scope=select.closest(".opportunity-record")||select.closest(".entity-create"),wrap=scope?.querySelector("[data-source-detail-container]"),input=wrap?.querySelector('[data-field="lead_source_detail"],#newOppSourceDetail');if(!wrap||!input)return;const useful=opportunitySourceNeedsDetail(select.value);if(clearWhenHidden&&!useful)input.value="";wrap.hidden=!(useful||String(input.value||"").trim())}
function operatorLabel(code){const o=OPERATORS.find(x=>x.code===code);return o?.display_name||code||"Sin asignar"}
function accessRoleLabel(role){return ({owner:"Propietario",manager:"Administración operativa",seller:"Comercial",system:"Sistema",admin:"Administrador"})[role]||role||"Sin rol"}
function accessRoleClass(role){return role==="owner"?"role-owner":role==="manager"?"role-manager":"role-seller"}
function operatorOptions(selected,includeUnassigned=true){const opts=OPERATORS.map(o=>`<option value="${esc(o.code)}" ${o.code===selected?"selected":""}>${esc(o.display_name)}</option>`);if(includeUnassigned)opts.push(`<option value="Sin asignar" ${selected==="Sin asignar"?"selected":""}>Sin asignar</option>`);return opts.join("")}
function defaultBulkPercentages(){const n=USERS.length;if(!n)return {};const base=Math.floor(100/n),rem=100-base*n,out={};USERS.forEach((u,i)=>out[u]=base+(i<rem?1:0));return out}
const STATUS_CLASS = {"Pendiente":"st-pending","Interesado":"st-info","Trasladado a cotización":"st-quote","No interesado":"st-no"};
const RESULT_STATUS = {"Información enviada":"Interesado","Pide presupuesto":"Trasladado a cotización","No interesado":"No interesado"};

const ALERT_EMAIL="info@viajesdegruposescolares.com";
const VGE_CONFIG=window.VGE_CONFIG||{};
let sb=null, centers=[], archivedCenters=[], lifecycleAudit=[], archivedSearch="", currentUser="", currentOperator=null, accessRole="seller", permissions={}, isAdmin=false, isOwner=false, currentView="dashboard", currentPage=1, activeStatus="", reminderMutedUntil=0, teamPresence=[], permissionUsers=[], permissionRoleAudit=[], currentCampaign=null, agendaItems=[];
let statisticsData=null, statisticsRequestId=0, statisticsFilters={periodDays:30,operatorCode:"",community:""};
const permissionRoleDrafts=new Map();
let lastPresenceHeartbeatAt=0, lastPresenceInteractionSentAt=0;
const PRESENCE_HEARTBEAT_MS=60000, PRESENCE_INTERACTION_THROTTLE_MS=45000, ACCESS_REFRESH_MS=60000;
const REMINDER_SNOOZE_PREFIX="vgeReminderMutedUntil:";
function reminderSnoozeKey(){return `${REMINDER_SNOOZE_PREFIX}${currentUser||"anonymous"}`}
function getReminderMutedUntil(){
 try{
   const value=Number(localStorage.getItem(reminderSnoozeKey())||0);
   if(value>0&&value<=Date.now()){localStorage.removeItem(reminderSnoozeKey());return 0;}
   return Number.isFinite(value)?value:0;
 }catch{return reminderMutedUntil||0}
}
function setReminderMutedUntil(value){
 reminderMutedUntil=Number(value||0);
 try{
   if(reminderMutedUntil>0)localStorage.setItem(reminderSnoozeKey(),String(reminderMutedUntil));
   else localStorage.removeItem(reminderSnoozeKey());
 }catch{}
}
function isReminderSnoozed(){return Date.now()<getReminderMutedUntil()}
let filters={search:"",status:"",community:"",seller:"",quick:"all"};
let currentCenterId=null, searchTimer=null, accessFingerprint="", lastActivityAt=Date.now();
let createContactInFlight=false, createOpportunityInFlight=false;
let profileSaveInFlight=false, contactEventInFlight=false;
const contactSaveInFlight=new Set(), opportunitySaveInFlight=new Set(), lifecycleInFlight=new Set();
let centerDialogDirtyScopes=new Set(), centerDialogHydrating=false, centerDialogScopeBaselines=new Map();
let newCenterDuplicateCandidates=[], newCenterDuplicateKey="", newCenterDuplicateRequest=0, newCenterForceConfirmation=false, newCenterSearchTimer=null;
const BULK_STATE_KEY="vgeBulkUiStateV1";
const BULK_LAST_RESULT_KEY="vgeBulkLastResultV1";
function loadBulkUiState(){try{return JSON.parse(sessionStorage.getItem(BULK_STATE_KEY)||"null")}catch{return null}}
function saveBulkUiState(state){sessionStorage.setItem(BULK_STATE_KEY,JSON.stringify(state))}
function saveBulkStateFromDom(){
 const kind=document.getElementById("bulkKind")?.value||"community";
 const zone=document.getElementById("bulkZone")?.value||"";
 const percentages=Object.fromEntries(bulkPercentages().map(x=>[x.user,x.pct]));
 saveBulkUiState({kind,zone,percentages});
}
function loadBulkLastResult(){try{return JSON.parse(sessionStorage.getItem(BULK_LAST_RESULT_KEY)||"null")}catch{return null}}
function saveBulkLastResult(result){sessionStorage.setItem(BULK_LAST_RESULT_KEY,JSON.stringify(result))}
const CLIENT_INACTIVITY_MS=4*60*60*1000;

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function norm(s){return String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
function normalizeStatusValue(s){const v=String(s??"").trim();return STATUSES.includes(v)?v:"Pendiente"}
function portfolioStatus(c){if(c?._agendaItem||!Number(c?.opportunityTotal||0))return normalizeStatusValue(c?.status);if(Number(c.opportunityQuoted||0)>0)return "Trasladado a cotización";if(Number(c.opportunityInterested||0)>0)return "Interesado";if(Number(c.opportunityNotInterested||0)>=Number(c.opportunityTotal||0))return "No interesado";return "Pendiente"}
function currentUserLabel(){return currentOperator?.display_name||operatorLabel(currentUser)||currentUser}
function friendlyError(error,fallback="No se ha podido completar la operación."){const m=String(`${error?.code||""} ${error?.message||""}`);const map={AUTH_REQUIRED:"Debes volver a iniciar sesión.",ACCESS_DENIED:"No tienes acceso a este centro o la ficha está archivada.",OPERATOR_NOT_LINKED:"Tu usuario no está vinculado a un operador CRM activo.",INVALID_STATUS:"Estado no válido.",INVALID_CHANNEL:"Canal no válido.",INVALID_RESULT:"Resultado no válido.",NOTES_REQUIRED:"La nota no puede estar vacía.",CONTACT_BLOCKED:"Este contacto está bloqueado para nuevas acciones.",CONCURRENT_UPDATE:"La ficha ha cambiado desde que la abriste. Recárgala antes de guardar.",ASSIGNMENT_CHANGED:"La asignación de este centro ha cambiado. Ya no puedes modificar esta ficha.",ADMIN_REQUIRED:"Esta acción está reservada a la administración operativa.",OWNER_REQUIRED:"Esta acción está reservada al propietario.",OWNER_ROLE_PROTECTED:"El rol de propietario está protegido y no puede modificarse desde esta pantalla.",OPERATOR_CONFIRMATION_MISMATCH:"La confirmación no coincide con el código del usuario.",ROLE_CHANGE_REASON_REQUIRED:"Indica un motivo de entre 8 y 500 caracteres.",OPERATOR_ACCOUNT_NOT_LINKED:"El usuario debe tener una cuenta vinculada antes de recibir acceso de administración.",ROLE_UNCHANGED:"El usuario ya tiene ese nivel de acceso.",OPERATOR_INACTIVE:"El usuario está desactivado.",INVALID_ACCESS_ROLE:"Nivel de acceso no válido.",INVALID_OPERATOR:"Operador inexistente o inactivo.",INVALID_STATS_PERIOD:"El periodo estadístico seleccionado no es válido.",STATS_SCOPE_DENIED:"No puedes consultar estadísticas de otro usuario.",PERCENTAGES_MUST_SUM_100:"Los porcentajes deben sumar exactamente 100%.",NO_CENTERS_IN_SCOPE:"No hay centros en la zona indicada.",SCHOOL_REQUIRED:"Indica el nombre completo del centro.",CITY_REQUIRED:"Indica la localidad del centro.",INVALID_PROVINCE:"Selecciona una provincia válida.",INVALID_LEAD_SOURCE:"Selecciona un origen válido.",LEAD_SOURCE_DETAIL_REQUIRED:"Explica brevemente el origen cuando eliges «Otro».",INVALID_SCHOOL_EMAIL:"El email general del centro no es válido.",INVALID_CONTACT_EMAIL:"El email directo del contacto no es válido.",INVALID_SCHOOL_PHONE:"El teléfono general del centro no es válido.",INVALID_CONTACT_PHONE:"El teléfono directo del contacto no es válido.",CENTER_REQUIRED:"Indica el centro sobre el que quieres actuar.",CENTER_NOT_FOUND:"El centro ya no existe o ha sido eliminado.",CENTER_STATE_NOT_FOUND:"La ficha no tiene un estado operativo válido.",CENTER_ARCHIVED:"La ficha está archivada y no puede modificarse.",CENTER_ALREADY_ARCHIVED:"El centro ya está archivado.",CENTER_NOT_ARCHIVED:"El centro no está archivado.",CENTER_MUST_BE_ARCHIVED:"Antes del borrado permanente debes archivar el centro.",CENTER_CONFIRMATION_MISMATCH:"La confirmación no coincide exactamente con el ID del centro.",CENTER_LIFECYCLE_REASON_REQUIRED:"Indica un motivo de entre 8 y 500 caracteres.",CENTER_ALREADY_EXISTS:"Este centro ya existe en el CRM; no se ha creado un duplicado.",POSSIBLE_DUPLICATE_CONFIRM_REQUIRED:"Hay una posible coincidencia. Revísala y confirma expresamente antes de crear una ficha nueva."};Object.assign(map,{center_contacts_active_email_unique_idx:"Ya existe una persona activa con ese mismo email en este centro. No se ha creado ningún duplicado.",center_contacts_active_phone_unique_idx:"Ya existe una persona activa con ese mismo teléfono en este centro. No se ha creado ningún duplicado.","23505":"Ya existe una persona activa con esos datos en este centro. No se ha creado ningún duplicado.",DEFAULT_CAMPAIGN_NOT_FOUND:"No hay una campaña activa predeterminada.",CAMPAIGN_NOT_FOUND:"No se ha encontrado la campaña seleccionada.",CENTER_CAMPAIGN_NOT_FOUND:"Este centro todavía no está incorporado a la campaña activa.",CONTACT_NAME_REQUIRED:"Indica el nombre de la persona de contacto.",CONTACT_BLOCK_REASON_REQUIRED:"Indica por qué no se debe contactar con esta persona.",PRIMARY_CONTACT_MUST_BE_REPLACED:"Para quitar el contacto principal, marca antes otra persona como principal.",CONTACT_NOT_FOUND:"La persona de contacto ya no existe.",INVALID_CENTER_CONTACT:"La persona seleccionada no pertenece a este centro.",INVALID_CYCLE:"Selecciona un ciclo educativo válido.",INVALID_STUDENTS_COUNT:"El número de alumnos debe estar entre 1 y 2.000.",INVALID_TEACHERS_COUNT:"El número de profesores debe estar entre 0 y 250.",INVALID_TRAVEL_DATES:"La fecha de regreso no puede ser anterior a la salida.",OPPORTUNITY_NOT_FOUND:"El viaje ya no existe o está archivado.",OPPORTUNITY_ALREADY_ARCHIVED:"El viaje ya estaba archivado.",OPPORTUNITY_NOT_ARCHIVED:"El viaje no está archivado.",OPPORTUNITY_LIFECYCLE_REASON_REQUIRED:"Indica un motivo de entre 8 y 500 caracteres.",CONCURRENT_OPPORTUNITY_UPDATE:"Uno de los viajes ha cambiado desde que abriste la ficha. Recárgala antes de guardar."});for(const [k,v] of Object.entries(map)){if(m.includes(k))return v}return fallback}
function localISO(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`}
function localTime(d=new Date()){return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`}
function fmtDate(s){if(!s)return "—";const v=String(s);if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const [y,m,d]=v.split("-");return `${d}/${m}/${y}`}const dt=new Date(v);return Number.isNaN(dt.getTime())?v:dt.toLocaleDateString("es-ES")}
function fmtDateTime(s){if(!s)return "";const d=new Date(s);return Number.isNaN(d.getTime())?String(s):d.toLocaleString("es-ES",{dateStyle:"short",timeStyle:"short"})}
function nextParts(c){if(c?._agendaItem?.due_at||c?.nextTaskAt)return splitISO(c?._agendaItem?.due_at||c.nextTaskAt);return {date:c?.nextContact||"",time:c?.nextContactTime||""}}
function nextKey(c){const n=nextParts(c);if(!n.date)return "";return `${n.date}T${n.time||"09:00"}`}
function nowKey(d=new Date()){return `${localISO(d)}T${localTime(d)}`}
function isClosedStatus(c){return ["Trasladado a cotización","No interesado"].includes(c.status)}
function isDueNow(c){return !!(nextKey(c)&&!isClosedStatus(c)&&nextKey(c)<=nowKey())}
function dueType(c){const n=nextParts(c);if(!n.date)return "";const today=localISO();if(n.date<today)return "due";if(n.date>today)return "future";return nextKey(c)<=nowKey()?"due":"today"}
function fmtNext(c){const n=nextParts(c);if(!n.date)return "—";return `${fmtDate(n.date)}${n.time?` · ${n.time}`:""}`}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function updateUnsavedIndicator(){const box=document.getElementById("unsavedIndicator"),dirty=centerDialogDirtyScopes.size>0;if(box)box.classList.toggle("show",dirty)}
function dirtyScopeWrap(scope){return [...document.querySelectorAll("[data-dirty-scope]")].find(x=>x.dataset.dirtyScope===scope)||null}
function dirtyScopeSnapshot(wrap){
 if(!wrap)return "";
 return JSON.stringify([...wrap.querySelectorAll("input,select,textarea")].map((el,index)=>({index,id:el.id||"",field:el.dataset?.field||"",name:el.name||"",type:el.type||el.tagName.toLowerCase(),value:["checkbox","radio"].includes(el.type)?!!el.checked:String(el.value??"")})))
}
function rebuildCenterScopeBaselines(dlg=document.getElementById("centerDialog")){
 centerDialogScopeBaselines.clear();
 dlg?.querySelectorAll("[data-dirty-scope]").forEach(wrap=>centerDialogScopeBaselines.set(wrap.dataset.dirtyScope,dirtyScopeSnapshot(wrap)));
}
function markCenterScopeDirty(scope){
 if(centerDialogHydrating||!scope)return;
 const wrap=dirtyScopeWrap(scope),baseline=centerDialogScopeBaselines.get(scope),changed=!!wrap&&baseline!==undefined&&dirtyScopeSnapshot(wrap)!==baseline;
 if(changed)centerDialogDirtyScopes.add(scope);else centerDialogDirtyScopes.delete(scope);updateUnsavedIndicator();
}
function clearCenterScopeDirty(scope){
 if(scope){centerDialogDirtyScopes.delete(scope);const wrap=dirtyScopeWrap(scope);if(wrap)centerDialogScopeBaselines.set(scope,dirtyScopeSnapshot(wrap))}
 else{centerDialogDirtyScopes.clear();centerDialogScopeBaselines.clear()}
 updateUnsavedIndicator()
}
function centerOperationBusy(){return profileSaveInFlight||contactEventInFlight||createContactInFlight||createOpportunityInFlight||contactSaveInFlight.size>0||opportunitySaveInFlight.size>0||lifecycleInFlight.size>0}
function requestCloseCenterDialog(){
 const dlg=document.getElementById("centerDialog");if(!dlg?.open)return true;
 if(centerOperationBusy()){alert("Hay una operación en curso. Espera a que termine antes de cerrar la ficha.");return false}
 if(centerDialogDirtyScopes.size&&!confirm("Hay cambios sin guardar en esta ficha. Si cierras ahora se perderán.\n\n¿Cerrar la ficha sin guardar?"))return false;
 clearCenterScopeDirty();dlg.close();return true
}
function dirtyControlDescriptor(scope,el,index){return {scope,id:el.id||"",field:el.dataset?.field||"",name:el.name||"",attributeValue:el.getAttribute("value")||"",index,type:el.type||el.tagName.toLowerCase(),value:el.value,checked:!!el.checked}}
function captureDirtyDrafts(exceptScopes=[]){
 const except=new Set(exceptScopes.filter(Boolean)),drafts=[];
 centerDialogDirtyScopes.forEach(scope=>{
  if(except.has(scope))return;const wrap=[...document.querySelectorAll("[data-dirty-scope]")].find(x=>x.dataset.dirtyScope===scope);if(!wrap)return;
  [...wrap.querySelectorAll("input,select,textarea")].forEach((el,index)=>drafts.push(dirtyControlDescriptor(scope,el,index)))
 });return drafts
}
function restoreDirtyDrafts(drafts=[]){
 if(!drafts.length)return;centerDialogHydrating=true;
 const restored=new Set();
 drafts.forEach(d=>{
  const wrap=[...document.querySelectorAll("[data-dirty-scope]")].find(x=>x.dataset.dirtyScope===d.scope);if(!wrap)return;
  const controls=[...wrap.querySelectorAll("input,select,textarea")];let el=d.id?document.getElementById(d.id):null;
  if(!el&&d.field)el=controls.find(x=>x.dataset?.field===d.field);
  if(!el&&d.name)el=controls.find(x=>x.name===d.name&&(!d.attributeValue||x.getAttribute("value")===d.attributeValue));
  if(!el)el=controls[d.index];if(!el)return;
  if(["checkbox","radio"].includes(d.type))el.checked=d.checked;else el.value=d.value;restored.add(d.scope)
 });
 centerDialogHydrating=false;restored.forEach(markCenterScopeDirty);updateUnsavedIndicator()
}
function bindCenterDirtyTracking(dlg){
 clearCenterScopeDirty();rebuildCenterScopeBaselines(dlg);
 const mark=e=>{const scope=e.target.closest?.("[data-dirty-scope]")?.dataset.dirtyScope;markCenterScopeDirty(scope)};
 dlg.oninput=mark;dlg.onchange=mark;
 dlg.oncancel=e=>{e.preventDefault();requestCloseCenterDialog()};
}
function duplicateContactCheck(c,payload,excludeId=null){
 const email=String(payload.email||"").trim().toLowerCase(),phone=String(payload.mobile||"").replace(/\D/g,""),name=norm(payload.full_name).replace(/\s+/g," ").trim();
 const matches=(c.workspace?.contacts||[]).filter(x=>x.active&&Number(x.contact_id)!==Number(excludeId)).map(x=>({contact:x,email:email&&String(x.email||"").trim().toLowerCase()===email,phone:phone&&String(x.mobile||"").replace(/\D/g,"")===phone,name:name&&norm(x.full_name).replace(/\s+/g," ").trim()===name})).filter(x=>x.email||x.phone||x.name);
 const hard=matches.find(x=>x.email||x.phone);return {matches,hard}
}
function confirmContactIsDistinct(c,payload,excludeId=null){
 const {matches,hard}=duplicateContactCheck(c,payload,excludeId);if(!matches.length)return true;
 const names=[...new Set(matches.map(x=>x.contact.full_name))].join(", ");
 if(hard){alert(`Ya existe una persona de contacto con el mismo ${hard.email&&hard.phone?"email y teléfono":hard.email?"email":"teléfono"}: ${names}.\n\nNo se ha guardado para evitar un duplicado.`);return false}
 return confirm(`Ya existe una persona con el mismo nombre: ${names}.\n\n¿Confirmas que se trata de otra persona distinta?`)
}
function options(arr,val){return arr.map(x=>`<option ${x===val?"selected":""}>${esc(x)}</option>`).join("")}
function statusBadge(s){return `<span class="badge ${STATUS_CLASS[s]||"st-pending"}">${esc(s)}</span>`}
function lastEvent(c){
 const h=(c.history||[]).slice().sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""))[0];
 if(h)return h;
 if(c.lastContactAt){const d=new Date(c.lastContactAt);return {result:c.lastResult||"",author:c.lastOperator||"",createdAt:c.lastContactAt,date:localISO(d)}}
 return null;
}
function preferredEmail(c){if(c.contactBlocked)return "";return String(c.directEmail||c.schoolEmail||"").trim()}
function mailto(to,subject,body=""){return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
function openEmailForCenter(id){
 const c=centers.find(x=>x.id===id);if(!c)return;
 if(c.contactBlocked){alert("Este contacto está bloqueado para nuevas comunicaciones.");return;}
 const to=preferredEmail(c);
 if(!to){alert("Este centro no tiene email directo ni email general registrado.");return;}
 const subject=`Viajes escolares · ${c.school}`;
 // Para los correos externos a centros no enviamos body en el mailto.
 // Outlook clásico inserta así la firma predeterminada del usuario.
 window.location.href=`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}`;
 toast(`Correo abierto para ${to}. Outlook añadirá tu firma predeterminada.`);
}
function openEmailForTask(taskKey){const c=agendaRows(false).find(x=>x._agendaItem?.task_key===taskKey);if(!c){alert("El seguimiento ya no está disponible.");return}const to=String(c.directEmail||c.schoolEmail||"").trim();if(!to){alert("Este seguimiento no tiene email disponible.");return}window.location.href=`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(`Viajes escolares · ${c.school} · ${c._agendaItem?.title||"Seguimiento"}`)}`;toast(`Correo abierto para ${to}. Outlook añadirá tu firma predeterminada.`)}
function agendaRows(overdueOnly=false){const byCenter=new Map(centers.map(c=>[c.id,c]));return agendaItems.filter(i=>i.assigned_to===currentUser&&(!overdueOnly||new Date(i.due_at).getTime()<=Date.now())).map(i=>{const base=byCenter.get(i.center_id);if(!base)return null;const n=splitISO(i.due_at);return {...base,_agendaItem:i,status:normalizeStatusValue(i.status),contactName:i.contact_name||base.contactName,role:i.contact_role||base.role,mobile:i.contact_mobile||"",directEmail:i.contact_email||"",nextContact:n.date,nextContactTime:n.time,nextTaskAt:i.due_at}}).filter(Boolean).sort((a,b)=>nextKey(a).localeCompare(nextKey(b)))}
function overdueCandidates(){return agendaRows(true)}
function overdueMailBody(list){
 const lines=list.map((c,i)=>`${i+1}. ${c.school} · ${c._agendaItem?.title||"Seguimiento general"} · ${fmtNext(c)}`);
 return `AVISO CRM VGE – SEGUIMIENTOS PENDIENTES\n\nResponsable: ${currentUserLabel()}\nGenerado: ${new Date().toLocaleString("es-ES")}\n\nHan quedado pendientes de actualizar las siguientes tareas cuya fecha/hora prevista ya ha vencido:\n\n${lines.join("\n")}\n\nPor minimización de datos, el correo no incluye nombre, móvil ni email directo. Revisar la ficha en ACTUALIZAR AGENDA del CRM.`;
}
function openOverdueSummaryEmail(){
 const list=overdueCandidates();if(!list.length){toast("No hay contactos vencidos para avisar");return;}
 window.location.href=mailto(ALERT_EMAIL,`CRM VGE · ${list.length} contacto${list.length===1?"":"s"} pendiente${list.length===1?"":"s"} · ${currentUserLabel()}`,overdueMailBody(list));
}
function openOverdueCenterEmail(taskKey){
 const c=overdueCandidates().find(x=>(x._agendaItem?.task_key||x.id)===taskKey)||centers.find(x=>x.id===taskKey);if(!c)return;
 window.location.href=mailto(ALERT_EMAIL,`CRM VGE · Contacto pendiente · ${c.school}`,overdueMailBody([c]));
}

function localDateTimeToISO(date, time="12:00"){
 if(!date)return null;
 const safeTime=time||"12:00";
 return new Date(`${date}T${safeTime}:00`).toISOString();
}
function splitISO(iso){
 if(!iso)return {date:"",time:""};
 const d=new Date(iso);return {date:localISO(d),time:localTime(d)};
}
