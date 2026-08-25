// CRM VGE R10 · Fase 5 · supabase-service.js
function initializeSupabaseClient(){
 if(!window.supabase)throw new Error("No se ha cargado la librería Supabase.");
 if(!VGE_CONFIG.supabaseUrl||!VGE_CONFIG.supabasePublishableKey||VGE_CONFIG.supabaseUrl.includes("REEMPLAZAR"))throw new Error("Falta configurar config.js con la URL y la Publishable Key de Supabase.");
 sb=window.supabase.createClient(VGE_CONFIG.supabaseUrl,VGE_CONFIG.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 return sb
}
function supabaseFrom(table){return sb.from(table)}
function supabaseRpc(name,args={}){return sb.rpc(name,args)}
function supabaseFunction(name,options={}){return sb.functions.invoke(name,options)}

async function fetchAllRows(table, select="*", orderColumn="id"){
 const all=[],size=1000;let lastValue=null;
 for(;;){
   let q=supabaseFrom(table).select(select).order(orderColumn,{ascending:true}).limit(size);
   if(lastValue!==null)q=q.gt(orderColumn,lastValue);
   const {data,error}=await q;
   if(error)throw error;all.push(...(data||[]));if(!data||data.length<size)break;
   const nextValue=data[data.length-1]?.[orderColumn];
   if(nextValue===null||nextValue===undefined||nextValue===lastValue)throw new Error("PAGINATION_STALLED");
   lastValue=nextValue;
 }
 return all;
}
async function rpcJson(name,args={}){const {data,error}=await supabaseRpc(name,args);if(error)throw error;return data}
async function loadArchivedCenters(){
 if(!permissions.can_archive_centers){archivedCenters=[];return []}
 const {data,error}=await supabaseRpc("list_archived_centers");
 if(error)throw error;
 archivedCenters=data||[];return archivedCenters;
}
async function loadLifecycleAudit(limit=100){
 if(!permissions.can_archive_centers){lifecycleAudit=[];return []}
 const {data,error}=await supabaseRpc("list_center_lifecycle_audit",{p_limit:limit});
 if(error)throw error;
 lifecycleAudit=data||[];return lifecycleAudit;
}
function centerFromRow(r,travel={},task=null){
 const next=splitISO(r.next_contact_at),last=r.last_contact_at||"";
 return {
  id:r.id,school:r.school||"",city:r.city||"",province:r.province||"",community:r.community||"",
  schoolPhone:r.school_phone||"",schoolEmail:r.school_email||"",assignedTo:r.assigned_to||"Sin asignar",_loadedAssignedTo:r.assigned_to||"Sin asignar",
  status:normalizeStatusValue(r.status),nextContact:next.date,nextContactTime:next.time,
  contactName:r.contact_name||"",role:r.contact_role||"",mobile:r.contact_mobile||"",directEmail:r.contact_email||"",contactBlocked:!!r.contact_blocked,contactBlockReason:r.contact_block_reason||"",
  lastContactAt:last,lastResult:r.last_result||"",lastOperator:r.last_operator_code||"",contactCount:r.contact_count||0,stateVersion:Number(r.state_version||1),_updatedAt:r.state_updated_at||null,rowUpdatedAt:r.row_updated_at||r.state_updated_at||null,
  catalogSource:r.catalog_source||"",leadSource:r.lead_source||"",leadSourceDetail:r.lead_source_detail||"",createdByOperator:r.created_by_operator||"",centerCreatedAt:r.center_created_at||"",history:[],workspace:null,
  opportunityTotal:Number(travel.opportunity_total||0),opportunityPending:Number(travel.opportunity_pending||0),opportunityInterested:Number(travel.opportunity_interested||0),opportunityQuoted:Number(travel.opportunity_quoted||0),opportunityNotInterested:Number(travel.opportunity_not_interested||0),opportunityOverdue:Number(travel.opportunity_overdue||0),opportunityNextContactAt:travel.opportunity_next_contact_at||null,nextTaskAt:task?.due_at||null
 };
}
async function loadAll(){
 const [rows,campaign,travelPayload,agendaPayload]=await Promise.all([
   fetchAllRows("crm_centers"),
   rpcJson("get_current_campaign_v1"),
   rpcJson("get_visible_travel_summaries_v1",{p_campaign_code:null}),
   rpcJson("get_agenda_items_v2",{p_campaign_code:null})
 ]);
 currentCampaign=campaign||null;
 agendaItems=agendaPayload?.items||[];
 const travelByCenter=new Map((travelPayload?.centers||[]).map(x=>[x.center_id,x]));
 const earliestTaskByCenter=new Map();
 agendaItems.forEach(item=>{const old=earliestTaskByCenter.get(item.center_id);if(!old||String(item.due_at)<String(old.due_at))earliestTaskByCenter.set(item.center_id,item)});
 centers=rows.map(r=>centerFromRow(r,travelByCenter.get(r.id)||{},earliestTaskByCenter.get(r.id)||null));
 if(permissions.can_archive_centers)await loadArchivedCenters();else archivedCenters=[];
}
async function refreshCenterSnapshot(id){
 const [centerResult,travelPayload,agendaPayload]=await Promise.all([
  supabaseFrom("crm_centers").select("*").eq("id",id).limit(1),
  rpcJson("get_visible_travel_summaries_v1",{p_campaign_code:null}),
  rpcJson("get_agenda_items_v2",{p_campaign_code:null})
 ]);
 if(centerResult.error)throw centerResult.error;
 const row=centerResult.data?.[0];if(!row)return null;
 agendaItems=agendaPayload?.items||[];
 const travel=(travelPayload?.centers||[]).find(x=>x.center_id===id)||{};
 const task=agendaItems.filter(x=>x.center_id===id).sort((a,b)=>String(a.due_at||"").localeCompare(String(b.due_at||"")))[0]||null;
 const fresh=centerFromRow(row,travel,task),index=centers.findIndex(x=>x.id===id);
 if(index>=0)centers[index]=fresh;else centers.push(fresh);
 return fresh;
}
async function loadHistory(c){
 const data=await rpcJson("get_center_history_v2",{p_center_id:c.id});
 c.history=(data||[]).map(r=>{const n=splitISO(r.next_contact_at);return {id:r.id,date:localISO(new Date(r.contacted_at)),contactedAt:r.contacted_at,channel:r.channel,result:r.result,note:r.notes||"",nextContact:n.date,nextContactTime:n.time,author:r.operator_name||r.operator_code,createdAt:r.created_at,contactName:r.contact_name||"",contactRole:r.contact_role||"",opportunities:r.opportunities||[]}});
}
async function loadWorkspace(c){c.workspace=await rpcJson("get_center_workspace_v1",{p_center_id:c.id,p_campaign_code:currentCampaign?.code||null});return c.workspace}
async function saveCenter(c){
 const patch={
   status:c.status,
   contact_name:c.contactName,
   contact_role:c.role,
   contact_mobile:c.mobile,
   contact_email:c.directEmail,
   contact_blocked:!!c.contactBlocked,
   contact_block_reason:c.contactBlockReason||null
 };
 if(isAdmin){patch.city=c.city;patch.province=c.province;}
 const {data,error}=await supabaseRpc("update_center_profile_v2",{
   p_center_id:c.id,
   p_patch:patch,
   p_expected_version:Number(c.stateVersion||1)
 });
 if(error)throw error;
 const row=Array.isArray(data)?data[0]:data;
 if(row){c.stateVersion=Number(row.state_version||c.stateVersion||1);c._updatedAt=row.updated_at||c._updatedAt;}
 if(isAdmin && c.assignedTo!==c._loadedAssignedTo){
   const {data:assignData,error:assignError}=await supabaseRpc("admin_assign_center",{p_center_id:c.id,p_operator_code:c.assignedTo});
   if(assignError)throw assignError;
   const assignedRow=Array.isArray(assignData)?assignData[0]:assignData;
   if(assignedRow)c.stateVersion=Number(assignedRow.state_version||c.stateVersion||1);
   c._loadedAssignedTo=c.assignedTo;
 }
}
