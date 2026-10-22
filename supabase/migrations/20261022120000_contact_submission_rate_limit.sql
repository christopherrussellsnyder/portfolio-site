-- contact_submissions allows unauthenticated INSERT (anon, WITH CHECK (true))
-- so a direct REST/PostgREST call with the public anon key bypasses the
-- Contact page's own client-side sessionStorage counter entirely. Postgres
-- triggers have no visibility into the caller's IP, so key the limit on the
-- submitted email address instead -- not a complete defense against a
-- determined attacker rotating emails, but it closes the "one curl loop,
-- zero rate limit" gap using the same durable consume_rate_limit() counter
-- every edge function already relies on.

create or replace function public.enforce_contact_submission_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.consume_rate_limit('contact_form:' || lower(NEW.email), 3, 3600) then
    raise exception 'Too many submissions from this email address. Please try again later.'
      using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_contact_submission_rate_limit on public.contact_submissions;
create trigger trg_contact_submission_rate_limit
  before insert on public.contact_submissions
  for each row execute function public.enforce_contact_submission_rate_limit();
