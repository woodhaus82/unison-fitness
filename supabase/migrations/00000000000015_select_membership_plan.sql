-- Lets a member grant themselves one of the catalog plans directly,
-- standing in for real Stripe checkout until that's wired up — so test
-- members can sign up and exercise the app without paying anything. Kept
-- as a SECURITY DEFINER RPC rather than a client-writable RLS insert
-- policy on memberships, so the validation (must be a member, no existing
-- membership, plan must be active) is enforced server-side and can't be
-- bypassed by a raw insert. Every row created here is stamped is_comp =
-- true, and this should be replaced (or at least gated) once real
-- checkout exists — granting free memberships in production is only
-- correct for as long as there's no real payment flow to bypass.
create or replace function select_membership_plan(p_plan_id uuid)
returns memberships
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role user_role;
  v_plan membership_plans;
  v_today date := (now() at time zone 'Europe/London')::date;
  v_end_date date;
  v_membership memberships;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select role into v_role from profiles where id = v_user_id;
  if v_role <> 'member' then
    raise exception 'only members can select a plan';
  end if;

  if exists (select 1 from memberships where user_id = v_user_id) then
    raise exception 'you already have a membership';
  end if;

  select * into v_plan from membership_plans where id = p_plan_id and active;
  if v_plan.id is null then
    raise exception 'plan not found';
  end if;

  v_end_date := case when v_plan.type = 'trial' then v_today + v_plan.duration_days else null end;

  insert into memberships (user_id, plan_id, status, start_date, end_date, credits_remaining, is_comp)
  values (
    v_user_id,
    v_plan.id,
    'active',
    v_today,
    v_end_date,
    case when v_plan.type = 'session_pack' then v_plan.credits_granted else null end,
    true
  )
  returning * into v_membership;

  return v_membership;
end;
$$;

revoke execute on function select_membership_plan(uuid) from public;
grant execute on function select_membership_plan(uuid) to authenticated;
