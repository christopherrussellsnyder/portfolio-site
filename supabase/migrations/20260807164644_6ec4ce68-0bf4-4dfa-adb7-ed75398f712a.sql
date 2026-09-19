create table if not exists public.rate_limit_hits (
  bucket_key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket_key, window_start)
);

grant all on public.rate_limit_hits to service_role;

alter table public.rate_limit_hits enable row level security;
-- No policies: only service_role / security-definer functions may touch this table.

create index if not exists rate_limit_hits_window_idx on public.rate_limit_hits (window_start);

create or replace function public.consume_rate_limit(_key text, _limit integer, _window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ws timestamptz;
  c integer;
begin
  if _key is null or _limit is null or _limit < 1 or _window_seconds is null or _window_seconds < 1 then
    return true;
  end if;

  ws := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds);

  insert into public.rate_limit_hits (bucket_key, window_start, count)
  values (left(_key, 200), ws, 1)
  on conflict (bucket_key, window_start)
    do update set count = public.rate_limit_hits.count + 1
  returning count into c;

  if random() < 0.005 then
    delete from public.rate_limit_hits where window_start < now() - interval '1 hour';
  end if;

  return c <= _limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;