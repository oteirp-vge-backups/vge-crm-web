// CRM VGE R10 · Fase 5 · auth-permissions.js
async function loadOperators(){
 const {data,error}=await supabaseRpc("get_visible_operators");
 if(error)throw error;
 OPERATORS=data||[];
 USERS=OPERATORS.map(o=>o.code);
 if(!USERS.length)throw new Error("No hay un operador CRM activo vinculado a esta cuenta.");
}
async function loadPermissionsForSession(){
 const {data,error}=await supabaseRpc("get_my_permissions_v2");
 if(error)throw error;
 const row=Array.isArray(data)?data[0]:data;
 if(!row)throw new Error("Tu cuenta no tiene un nivel de acceso CRM válido.");
 permissions=row;accessRole=row.access_role||"seller";
 isAdmin=!!row.can_view_global;isOwner=!!row.can_manage_roles;
 if(currentOperator)currentOperator={...currentOperator,access_role:accessRole};
 return row;
}
async function loadOperatorForSession(session){
 const {data,error}=await supabaseRpc("get_my_operator");
 if(error)throw error;
 const profile=Array.isArray(data)?data[0]:data;
 if(!profile)throw new Error("Tu usuario está autenticado, pero todavía no está vinculado a un operador del CRM.");
 currentOperator=profile;currentUser=profile.code;
 await loadPermissionsForSession();
 reminderMutedUntil=getReminderMutedUntil();lastActivityAt=Date.now();
}

async function startAuthenticatedApp(session){
 await loadOperatorForSession(session);
 document.getElementById("loginScreen").hidden=true;document.getElementById("app").hidden=false;
 configureNavForRole();
 await loadOperators();
 await loadAll();accessFingerprint=await getFingerprint();await touchPresence({interaction:true,login:true});updateAlertButton();render();checkReminders();
}

async function getFingerprint(){
 const {data,error}=await supabaseRpc("get_access_fingerprint_v2");if(error)throw error;
 const row=Array.isArray(data)?data[0]:data;return row?`${row.row_count}|${row.max_updated_at||""}|${row.id_hash||""}`:"0||";
}
async function refreshAccessSnapshot(forceRender=true){
 if(!sb||document.getElementById("app").hidden)return;
 const openId=currentCenterId;
 try{
   const {data:profileData,error:profileError}=await supabaseRpc("get_my_operator");
   if(profileError)throw profileError;
   const profile=Array.isArray(profileData)?profileData[0]:profileData;
   if(!profile){await signOut(true);return}
   const oldAdmin=isAdmin,oldOwner=isOwner,oldAccessRole=accessRole;
   currentOperator=profile;currentUser=profile.code;await loadPermissionsForSession();
   const fp=await getFingerprint();
   const roleChanged=oldAdmin!==isAdmin||oldOwner!==isOwner||oldAccessRole!==accessRole;
   const accessChanged=fp!==accessFingerprint;
   if(accessChanged||roleChanged){await loadAll();accessFingerprint=fp;await loadOperators();}
   if(roleChanged)configureNavForRole();
   if(openId&&!centers.some(c=>c.id===openId)){
     const dlg=document.getElementById("centerDialog");clearCenterScopeDirty();if(dlg?.open)dlg.close();if(dlg)dlg.innerHTML="";
     currentCenterId=null;toast("La asignación de una ficha ha cambiado. Se ha actualizado tu acceso.");
   }
   if(forceRender||accessChanged||roleChanged)render();else updateNavCounts();
 }catch(e){console.error("No se ha podido sincronizar el acceso",e);}
}
window.addEventListener("focus",()=>refreshAccessSnapshot(false));
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshAccessSnapshot(false)});
setInterval(()=>refreshAccessSnapshot(false),ACCESS_REFRESH_MS);

function clearSensitiveUi(){
 centers=[];archivedCenters=[];lifecycleAudit=[];archivedSearch="";OPERATORS=[];USERS=[];permissionUsers=[];permissionRoleAudit=[];permissionRoleDrafts.clear();statisticsData=null;statisticsRequestId++;statisticsFilters={periodDays:30,operatorCode:"",community:""};currentCampaign=null;agendaItems=[];currentCenterId=null;currentOperator=null;currentUser="";accessRole="seller";permissions={};isAdmin=false;isOwner=false;accessFingerprint="";
 newCenterDuplicateCandidates=[];newCenterDuplicateKey="";newCenterForceConfirmation=false;newCenterDuplicateRequest++;clearTimeout(newCenterSearchTimer);
 centerDialogDirtyScopes.clear();profileSaveInFlight=false;contactEventInFlight=false;createContactInFlight=false;createOpportunityInFlight=false;contactSaveInFlight.clear();opportunitySaveInFlight.clear();lifecycleInFlight.clear();
 sessionStorage.removeItem("vgeNotifiedReminders");
 sessionStorage.removeItem(BULK_STATE_KEY);
 sessionStorage.removeItem(BULK_LAST_RESULT_KEY);
 const dlg=document.getElementById("centerDialog");if(dlg?.open)dlg.close();if(dlg)dlg.innerHTML="";
 const newDlg=document.getElementById("newCenterDialog");if(newDlg?.open)newDlg.close();if(newDlg)newDlg.innerHTML="";
 const content=document.getElementById("content");if(content)content.innerHTML="";
 const app=document.getElementById("app");if(app)app.hidden=true;
 const login=document.getElementById("loginScreen");if(login)login.hidden=false;
}
async function signOut(force=false){if(!force&&document.getElementById("centerDialog")?.open&&centerDialogDirtyScopes.size&&!confirm("Hay cambios sin guardar en la ficha abierta.\n\n¿Cerrar sesión y descartarlos?"))return;try{if(sb&&currentUser)await supabaseRpc("mark_operator_offline");await sb.auth.signOut()}finally{clearSensitiveUi();location.reload()}}

window.addEventListener("beforeunload",e=>{if(!centerDialogDirtyScopes.size)return;e.preventDefault();e.returnValue=""});

document.getElementById("loginForm").onsubmit=async e=>{
 e.preventDefault();const err=document.getElementById("loginError");err.textContent="Entrando…";
 const email=document.getElementById("loginEmail").value.trim(),password=document.getElementById("loginPassword").value;
 const {data,error}=await sb.auth.signInWithPassword({email,password});
 if(error){console.warn("Login rechazado",error?.status||"");err.textContent="No se ha podido iniciar sesión. Revisa el email y la contraseña.";return}
 try{await startAuthenticatedApp(data.session)}catch(ex){console.error(ex);err.textContent="Tu cuenta no está habilitada para acceder al CRM.";await sb.auth.signOut()}
};

const RECOVERY_REDIRECT_URL="https://crm.viajesdegruposescolares.com/";
document.getElementById("forgotPasswordBtn").onclick=()=>{
 const loginEmail=document.getElementById("loginEmail").value.trim();
 document.getElementById("recoveryEmail").value=loginEmail;
 document.getElementById("recoveryStatus").textContent="";
 document.getElementById("recoveryStatus").classList.remove("success");
 document.getElementById("loginForm").hidden=true;
 document.getElementById("recoveryForm").hidden=false;
 document.getElementById("recoveryEmail").focus();
};
document.getElementById("backToLoginBtn").onclick=()=>{
 document.getElementById("recoveryForm").hidden=true;
 document.getElementById("loginForm").hidden=false;
 document.getElementById("loginEmail").focus();
};
document.getElementById("recoveryForm").onsubmit=async e=>{
 e.preventDefault();
 const status=document.getElementById("recoveryStatus"),button=document.getElementById("recoverySubmitBtn");
 const email=document.getElementById("recoveryEmail").value.trim();
 status.classList.remove("success");status.textContent="Enviando enlace…";button.disabled=true;
 try{
   if(!sb)throw new Error("AUTH_NOT_READY");
   const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:RECOVERY_REDIRECT_URL});
   if(error)throw error;
   status.classList.add("success");
   status.textContent="Si el correo corresponde a una cuenta del CRM, recibirás un enlace de recuperación. Revisa también el correo no deseado.";
 }catch(error){
   console.warn("No se pudo solicitar la recuperación",error?.status||"");
   status.textContent=error?.status===429?"Espera unos minutos antes de solicitar otro enlace.":"No se ha podido enviar el enlace. Inténtalo de nuevo más tarde o contacta con administración.";
 }finally{button.disabled=false}
};

document.getElementById("invitePasswordForm").onsubmit=async e=>{
 e.preventDefault();
 const err=document.getElementById("invitePasswordError");
 const password=document.getElementById("invitePassword").value;
 const repeated=document.getElementById("invitePasswordRepeat").value;
 if(password.length<14){err.textContent="La contraseña debe tener al menos 14 caracteres.";return}
 if(!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password)||!/[^A-Za-z0-9]/.test(password)){err.textContent="La contraseña debe incluir una mayúscula, una minúscula, un número y un símbolo.";return}
 if(password!==repeated){err.textContent="Las dos contraseñas no coinciden.";return}
 err.textContent="Guardando contraseña…";
 const {data,error}=await sb.auth.updateUser({password});
 if(error){console.warn("No se pudo guardar la contraseña",error?.status||"");err.textContent=error?.status===422?"La contraseña no cumple los requisitos: 14 caracteres como mínimo, con mayúscula, minúscula, número y símbolo.":"El enlace ya no es válido o ha caducado. Solicita un nuevo correo de recuperación.";return}
 history.replaceState(null,"",location.pathname+location.search);
 document.getElementById("invitePasswordForm").hidden=true;
 document.getElementById("loginForm").hidden=false;
 try{await startAuthenticatedApp((await sb.auth.getSession()).data.session)}catch(ex){console.error(ex);err.textContent="La cuenta se activó, pero todavía no está habilitada en el CRM."}
};

document.getElementById("logoutBtn").onclick=()=>signOut(false);
document.getElementById("newCenterBtn").onclick=openNewCenterDialog;
document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>{
 capturePermissionRoleDrafts();
 if(b.dataset.statusNav){currentView="status";activeStatus=b.dataset.statusNav;filters={search:"",status:"",community:"",seller:"",quick:"all"};}
 else{currentView=b.dataset.view;activeStatus="";filters={search:"",status:"",community:"",seller:"",quick:"all"};}
 render();
});
document.getElementById("enableAlertsBtn").onclick=enableAlerts;
document.getElementById("excelBtn").onclick=exportExcel;
document.getElementById("viewDueBtn").onclick=()=>{currentView="overdue";activeStatus="";filters={search:"",status:"",community:"",seller:"",quick:"all"};render()};
document.getElementById("dismissReminderBtn").onclick=()=>{setReminderMutedUntil(Date.now()+15*60*1000);updateReminderStrip();toast("Aviso pospuesto durante 15 minutos")};
document.getElementById("backupBtn").onclick=exportJSON;
document.getElementById("settingsBtn").onclick=e=>{e.stopPropagation();document.getElementById("settingsMenu").classList.toggle("open")};
document.addEventListener("click",e=>{if(!e.target.closest("#settingsMenu")&&!e.target.closest("#settingsBtn"))document.getElementById("settingsMenu").classList.remove("open")});
function closePasswordDialog(){
 const dlg=document.getElementById("passwordDialog");
 document.getElementById("changePasswordForm").reset();
 const status=document.getElementById("changePasswordStatus");status.className="save-feedback";status.textContent="";
 if(dlg.open)dlg.close();
}
document.getElementById("changePasswordBtn").onclick=()=>{
 document.getElementById("settingsMenu").classList.remove("open");
 const dlg=document.getElementById("passwordDialog");dlg.showModal();document.getElementById("currentSessionPassword").focus();
};
document.getElementById("closePasswordDialog").onclick=closePasswordDialog;
document.getElementById("passwordDialog").addEventListener("cancel",e=>{e.preventDefault();closePasswordDialog()});
document.getElementById("changePasswordForm").onsubmit=async e=>{
 e.preventDefault();
 const currentPassword=document.getElementById("currentSessionPassword").value,password=document.getElementById("newSessionPassword").value,repeated=document.getElementById("newSessionPasswordRepeat").value;
 const status=document.getElementById("changePasswordStatus"),button=document.getElementById("changePasswordSubmitBtn");
 status.className="save-feedback show error";
 if(!currentPassword){status.textContent="Introduce tu contraseña actual.";return}
 if(password.length<14){status.textContent="La contraseña debe tener al menos 14 caracteres.";return}
 if(!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password)||!/[^A-Za-z0-9]/.test(password)){status.textContent="Incluye una mayúscula, una minúscula, un número y un símbolo.";return}
 if(password!==repeated){status.textContent="Las dos contraseñas no coinciden.";return}
 button.disabled=true;status.className="save-feedback show info";status.textContent="Guardando la nueva contraseña…";
 try{
   const {error}=await sb.auth.updateUser({password,current_password:currentPassword});if(error)throw error;
   status.className="save-feedback show success";status.textContent="Contraseña actualizada correctamente.";
   document.getElementById("currentSessionPassword").value="";document.getElementById("newSessionPassword").value="";document.getElementById("newSessionPasswordRepeat").value="";
   setTimeout(()=>{closePasswordDialog();toast("Contraseña actualizada correctamente")},900);
 }catch(error){
   console.warn("No se pudo cambiar la contraseña",error?.status||"");status.className="save-feedback show error";
   if(error?.code==="bad_password"||error?.code==="invalid_credentials")status.textContent="La contraseña actual no es correcta.";
   else if(error?.code==="same_password")status.textContent="La nueva contraseña debe ser distinta de la actual.";
   else if(error?.code==="weak_password")status.textContent="La nueva contraseña debe tener al menos 14 caracteres y no ser predecible ni aparecer en filtraciones.";
   else if(error?.code==="current_password_required")status.textContent="Introduce tu contraseña actual.";
   else if(error?.code==="session_not_found"||error?.status===403){
     status.textContent="Tu sesión ha caducado. Volverás al acceso para iniciar sesión de nuevo.";
     setTimeout(async()=>{try{await sb.auth.signOut({scope:"local"})}finally{clearSensitiveUi();location.reload()}},1400);
   }
   else if(error?.status===422)status.textContent="La contraseña no cumple los requisitos de seguridad.";
   else status.textContent="No se ha podido cambiar la contraseña. Inténtalo de nuevo.";
 }
 finally{button.disabled=false}
};
document.getElementById("exportBtn").onclick=exportJSON;
document.getElementById("exportCsvBtn").onclick=exportCSV;
["pointerdown","keydown","touchstart"].forEach(ev=>window.addEventListener(ev,()=>{lastActivityAt=Date.now();touchPresence({interaction:true})},{passive:true}));
setInterval(()=>{if(!document.getElementById("app").hidden&&currentUser)touchPresence({interaction:false})},PRESENCE_HEARTBEAT_MS);
setInterval(()=>{if(currentView==="team"&&isAdmin&&!document.getElementById("app").hidden)renderTeamPresence()},30000);
setInterval(()=>{if(!document.getElementById("app").hidden&&Date.now()-lastActivityAt>CLIENT_INACTIVITY_MS)signOut(true)},60000);

(async()=>{
 try{
   initializeSupabaseClient();
   // Supabase puede devolver invitaciones/recuperaciones en flujo implícito
   // (type=invite|recovery) o PKCE (?code=...). Ambos deben pedir contraseña.
   const inviteFlow=/[?#&]type=(?:invite|recovery)(?:&|$)/.test(location.href)||/[?&]code=[^&]+/.test(location.href)||/[?&]set-password=1(?:&|$)/.test(location.href);
   const {data:{session}}=await sb.auth.getSession();
   if(session&&inviteFlow){
     document.getElementById("loginForm").hidden=true;
     document.getElementById("invitePasswordForm").hidden=false;
   }else if(session)await startAuthenticatedApp(session);
   sb.auth.onAuthStateChange((event)=>{
     if(event==="SIGNED_OUT")clearSensitiveUi();
     if(event==="PASSWORD_RECOVERY"){
       document.getElementById("app").hidden=true;
       document.getElementById("loginScreen").hidden=false;
       document.getElementById("loginForm").hidden=true;
       document.getElementById("invitePasswordForm").hidden=false;
     }
   });
   setInterval(()=>{if(!document.getElementById("app").hidden)checkReminders()},30000);
 }catch(e){console.error(e);document.getElementById("loginError").textContent="No se ha podido iniciar el CRM. Revisa la configuración o contacta con administración."}
})();
