create table if not exists public.audiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  age_min integer,
  age_max integer,
  gender text[],
  languages text[],
  countries text[],
  regions text[],
  cities text[],
  radius_km integer,
  interests text[],
  behaviors text[],
  job_titles text[],
  industries text[],
  education_levels text[],
  income_ranges text[],
  platforms text[],
  estimated_size_min integer default 0,
  estimated_size_max integer default 0,
  is_favorite boolean default false,
  used_in_campaigns integer default 0,
  last_used_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint age_min_check check (age_min >= 13 and age_min <= 100),
  constraint age_max_check check (age_max >= 13 and age_max <= 100)
);

alter table public.audiences enable row level security;

create index idx_audiences_user_id on public.audiences(user_id);
create index idx_audiences_created_at on public.audiences(created_at desc);
create index idx_audiences_is_favorite on public.audiences(is_favorite);