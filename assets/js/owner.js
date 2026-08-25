// CRM VGE R10 · Fase 6 · controles exclusivos del propietario
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

