(function installSupabaseMock() {
  const session = {
    user: { id: "10000000-0000-4000-8000-000000000003", email: "seller@example.invalid" },
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
      get_visible_travel_summaries_v1: { centers: [] },
      get_agenda_items_v2: { items: [] },
      get_access_fingerprint_v2: [{ row_count: 0, max_updated_at: null, id_hash: "r10" }],
      touch_operator_presence: true,
      mark_operator_offline: true,
    };
    return Object.hasOwn(values, name) ? values[name] : [];
  }

  function queryBuilder(table) {
    const response = { data: table === "crm_centers" ? [] : [], error: null };
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
        async rpc(name) { return { data: rpcData(name), error: null }; },
        from(table) { return queryBuilder(table); },
      };
    },
  };
})();
