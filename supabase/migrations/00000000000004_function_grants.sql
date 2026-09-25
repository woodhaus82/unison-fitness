-- Postgres grants EXECUTE on new functions to PUBLIC by default, which in
-- Supabase means anon + authenticated can call them. Lock that down and
-- grant back only what each role actually needs.

revoke execute on function handle_new_user() from public;
revoke execute on function book_class(uuid) from public;
revoke execute on function cancel_booking(uuid) from public;
revoke execute on function generate_sessions_from_schedule(date) from public;
revoke execute on function mark_no_shows() from public;
revoke execute on function is_admin() from public;
revoke execute on function list_sessions(date, date) from public;

-- is_admin() is called from inside RLS policies, so both anon and
-- authenticated need to be able to execute it to even evaluate a SELECT.
grant execute on function is_admin() to anon, authenticated;

-- Member-facing RPCs.
grant execute on function list_sessions(date, date) to authenticated;
grant execute on function book_class(uuid) to authenticated;
grant execute on function cancel_booking(uuid) to authenticated;

-- Admin-only RPCs. Each function also self-checks is_admin() internally
-- (defense in depth), since SECURITY DEFINER bypasses RLS.
grant execute on function generate_sessions_from_schedule(date) to authenticated;

-- mark_no_shows is only ever invoked by the scheduled cron route using the
-- service_role key — never exposed to members.
grant execute on function mark_no_shows() to service_role;
