-- Only the Edge Function's server credentials may read or mutate these tables.
-- Browsers use custom room sessions; no private state is exposed through the Data API.
create table public.rnvp_rooms (
  code text primary key check (code ~ '^[A-Z2-9]{6}$'),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
create index rnvp_rooms_updated_at on public.rnvp_rooms(updated_at);
alter table public.rnvp_rooms enable row level security;
revoke all on public.rnvp_rooms from public, anon, authenticated;
grant select, insert, update, delete on public.rnvp_rooms to service_role;
comment on table public.rnvp_rooms is 'Private casino room state, including hashed session tokens. Service role only; intentional default-deny RLS.';

create table public.rnvp_limits (
  key text primary key,
  count integer not null,
  expires_at timestamptz not null
);
create index rnvp_limits_expiry on public.rnvp_limits(expires_at);
alter table public.rnvp_limits enable row level security;
revoke all on public.rnvp_limits from public, anon, authenticated;
grant select, insert, update, delete on public.rnvp_limits to service_role;
comment on table public.rnvp_limits is 'Short-lived request counters with hashed network identities. Service role only.';

-- SECURITY INVOKER keeps the caller's privileges. Neither RPC is executable by browsers.
create function public.rnvp_rate(p_key text, p_max integer, p_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  insert into public.rnvp_limits as limits(key, count, expires_at)
  values (p_key, 1, now() + make_interval(secs => p_seconds))
  on conflict (key) do update set
    count = case when limits.expires_at <= now() then 1 else limits.count + 1 end,
    expires_at = case when limits.expires_at <= now() then excluded.expires_at else limits.expires_at end
  returning count into n;
  return n <= p_max;
end;
$$;
revoke all on function public.rnvp_rate(text,integer,integer) from public, anon, authenticated;
grant execute on function public.rnvp_rate(text,integer,integer) to service_role;

create function public.rnvp_create_room(p_code text, p_state jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
begin
  -- Serialize creation to keep the global capacity limit strict across Edge instances.
  perform pg_advisory_xact_lock(873296104);
  delete from public.rnvp_rooms where updated_at < now() - interval '2 hours' or jsonb_array_length(state->'players') = 0;
  delete from public.rnvp_limits where expires_at < now();
  if (select count(*) from public.rnvp_rooms) >= 100 then return 'full'; end if;
  insert into public.rnvp_rooms(code,state) values(p_code,p_state) on conflict do nothing;
  if not found then return 'collision'; end if;
  return 'created';
end;
$$;
revoke all on function public.rnvp_create_room(text,jsonb) from public, anon, authenticated;
grant execute on function public.rnvp_create_room(text,jsonb) to service_role;
