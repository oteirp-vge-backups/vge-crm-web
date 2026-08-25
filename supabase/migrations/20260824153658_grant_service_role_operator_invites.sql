-- The invitation Edge Function reads and links operators with the backend-only
-- service role. Keep client roles unchanged and grant only the minimum access
-- required by that workflow.
grant select, update on table public.operators to service_role;
