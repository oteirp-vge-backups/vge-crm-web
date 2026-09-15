(function installSupabaseMock() {
  window.__r10TechnicalIncidents = [];
  window.__r10RpcCalls = [];
  const session = {
    user: { id: "10000000-0000-4000-8000-000000000003", email: "seller@example.invalid" },
  };
  const agendaCenter = {
    id: "R10-MOCK-AGENDA",
    school: "Centro agenda de prueba",
    city: "León",
    province: "León",
    community: "Castilla y León",
    school_phone: "987000000",
    school_email: "centro@example.invalid",
    assigned_to: "OP-SELLER",
    status: "Pendiente",
    next_contact_at: "2000-01-15T09:00:00Z",
    last_contact_at: null,
    last_result: null,
    last_operator_code: null,
    contact_count: 0,
    state_version: 7,
    state_updated_at: "2000-01-01T09:00:00Z",
    row_updated_at: "2000-01-01T09:00:00Z",
  };

  function rpcData(name) {
    const values = {
      get_my_operator: [{ code: "OP-SELLER", display_name: "Comercial de prueba", role: "seller", email: "seller@example.invalid" }],
      get_my_permissions_v2: [{
        access_role: "seller",
        can_view_global: false,
        can_assign_centers: false,
        can_archive_centers: false,
        can_restore_centers: false,
        can_view_team: false,
        can_manage_roles: false,
        can_export_global: false,
        can_export_backup: false,
        can_delete_permanently: false,
        can_manage_security: false,
      }],
      get_visible_operators: [{ code: "OP-SELLER", display_name: "Comercial de prueba", role: "seller", access_role: "seller" }],
      get_current_campaign_v1: { code: "R10", label: "Campaña de prueba" },
      get_visible_travel_summaries_v1: { centers: [{
        center_id: agendaCenter.id,
        opportunity_total: 1,
        opportunity_pending: 1,
        opportunity_interested: 0,
        opportunity_quoted: 0,
        opportunity_not_interested: 0,
        opportunity_overdue: 0,
        opportunity_next_contact_at: null,
      }] },
      get_agenda_items_v2: { items: [{
        task_key: `center:${agendaCenter.id}`,
        task_type: "Centro",
        title: "Seguimiento general",
        center_id: agendaCenter.id,
        assigned_to: "OP-SELLER",
        status: "Pendiente",
        due_at: agendaCenter.next_contact_at,
        contact_name: "",
        contact_role: "",
        contact_mobile: "",
        contact_email: agendaCenter.school_email,
      }] },
      get_center_history_v2: [],
      get_center_workspace_v1: {
        campaign: { code: "R10", label: "Campaña de prueba" },
        contacts: [],
        opportunities: [{
          opportunity_id: "VGE-O-MOCK-1",
          center_id: agendaCenter.id,
          cycle: "Bachillerato",
          destination: "Italia",
          status: "Pendiente",
          active: true,
          opportunity_version: 3,
        }],
      },
      register_contact_multi_v1: { ok: true },
      get_statistics_dashboard_v2: {
        schema_version: 2,
        generated_at: "2026-09-13T08:00:00Z",
        scope: { period_days: 30 },
        campaign: { code: "R10" },
        kpis: {
          portfolio_total: 5,
          worked_centers: 4,
          worked_pct: 80,
          interested_centers: 1,
          quoted_centers: 3,
          quote_conversion_pct: 75,
          contacts_period: 0,
          overdue_followups: 0,
          due_today: 0,
          on_time_followups_pct: null,
          on_time_followups: 0,
          due_followups_period: 0,
          new_centers_period: 0,
          unattended_opportunities: 4,
        },
        travel_metrics: {
          opportunities_total: 5,
          opportunities_worked: 4,
          opportunities_interested: 0,
          opportunities_quoted: 4,
          opportunity_conversion_pct: 100,
          opportunity_followups_overdue: 0,
          opportunities_without_future_followup: 4,
          new_opportunities_period: 5,
        },
        operators: [],
        zones: [],
        opportunities: [],
        recent_activity: [],
        lead_sources: [],
        channels: [],
        opportunities_by_status: [],
        opportunities_by_cycle: [],
        opportunities_by_operator: [],
      },
      get_access_fingerprint_v2: [{ row_count: 0, max_updated_at: null, id_hash: "r10" }],
      touch_operator_presence: true,
      mark_operator_offline: true,
    };
    return Object.hasOwn(values, name) ? values[name] : [];
  }

  function queryBuilder(table) {
    const response = { data: table === "crm_centers" ? [agendaCenter] : [], error: null };
    const builder = {
      select() { return builder; },
      order() { return builder; },
      limit() { return builder; },
      gt() { return builder; },
      eq() { return builder; },
      update() { return builder; },
      then(resolve, reject) { return Promise.resolve(response).then(resolve, reject); },
    };
    return builder;
  }

  window.supabase = {
    createClient() {
      return {
        auth: {
          async getSession() {
            const authenticated = new URLSearchParams(location.search).has("r10-auth") || new URLSearchParams(location.search).has("set-password");
            return { data: { session: authenticated ? session : null }, error: null };
          },
          async signInWithPassword({ email }) {
            if (email === "denied@example.invalid") return { data: { session: null }, error: { status: 400 } };
            return { data: { session }, error: null };
          },
          async resetPasswordForEmail() { return { data: {}, error: null }; },
          async updateUser() { return { data: { user: session.user }, error: null }; },
          async signOut() { return { error: null }; },
          onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
        },
        async rpc(name, args = {}) {
          window.__r10RpcCalls.push({ name, args });
          return { data: rpcData(name), error: null };
        },
        from(table) { return queryBuilder(table); },
        functions: {
          async invoke(name, options = {}) {
            if (name === "vge-technical-incident") {
              window.__r10TechnicalIncidents.push(options.body);
              return { data: { ok: true, correlation_id: options.body?.correlation_id }, error: null };
            }
            return { data: { ok: true }, error: null };
          },
        },
      };
    },
  };
})();
