-- ============================================================
-- REPLYIQ — Complete Supabase Schema v3
-- Run this in: Supabase → SQL Editor → New Query
-- WARNING: This will reset all tables. Back up data first.
-- ============================================================

-- Drop existing tables (clean slate)
drop table if exists public.intelligence_briefs cascade;
drop table if exists public.weekly_reports cascade;
drop table if exists public.competitors cascade;
drop table if exists public.reviews cascade;
drop table if exists public.clinics cascade;

-- ── CLINICS ──────────────────────────────────────────────────
create table public.clinics (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade not null unique,
  name              text not null default 'My Dental Clinic',
  address           text not null default '',
  phone             text not null default '',
  email             text not null default '',
  owner_email       text not null default '',
  google_rating     numeric(3,1) not null default 4.5,
  total_reviews     int not null default 0,
  monthly_appts     int not null default 80,
  avg_revenue       int not null default 1200,
  target_rating     numeric(3,1) not null default 4.7,
  subscription      text not null default 'starter',
  google_place_id   text default '',
  google_connected  boolean default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.clinics enable row level security;
create policy "Clinic owner full access" on public.clinics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── REVIEWS ──────────────────────────────────────────────────
create table public.reviews (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid references public.clinics(id) on delete cascade not null,
  author            text not null,
  rating            int not null check (rating between 1 and 5),
  review_date       date not null,
  text              text not null,
  platform          text not null default 'Google',
  responded         boolean not null default false,
  response_text     text,
  google_review_id  text unique,
  -- AI classification
  ai_sentiment      text,
  ai_categories     text[],
  ai_severity       text,
  ai_summary        text,
  ai_risk_flag      boolean default false,
  ai_risk_reason    text,
  ai_action         text,
  ai_analysed_at    timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.reviews enable row level security;
create policy "Reviews belong to clinic owner" on public.reviews
  for all using (clinic_id in (select id from public.clinics where user_id = auth.uid()))
  with check (clinic_id in (select id from public.clinics where user_id = auth.uid()));

-- ── COMPETITORS ───────────────────────────────────────────────
create table public.competitors (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid references public.clinics(id) on delete cascade not null,
  name        text not null,
  rating      numeric(3,1) not null,
  reviews     int not null default 0,
  trend       text not null default '0.0',
  distance    text not null default '0.5km',
  created_at  timestamptz not null default now()
);

alter table public.competitors enable row level security;
create policy "Competitors belong to clinic owner" on public.competitors
  for all using (clinic_id in (select id from public.clinics where user_id = auth.uid()))
  with check (clinic_id in (select id from public.clinics where user_id = auth.uid()));

-- ── WEEKLY REPORTS ────────────────────────────────────────────
create table public.weekly_reports (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid references public.clinics(id) on delete cascade not null,
  report_date date not null default current_date,
  report_data jsonb not null default '{}',
  risk_score  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.weekly_reports enable row level security;
create policy "Reports belong to clinic owner" on public.weekly_reports
  for all using (clinic_id in (select id from public.clinics where user_id = auth.uid()))
  with check (clinic_id in (select id from public.clinics where user_id = auth.uid()));

-- ── INTELLIGENCE BRIEFS ───────────────────────────────────────
create table public.intelligence_briefs (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid references public.clinics(id) on delete cascade not null,
  brief_data  jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table public.intelligence_briefs enable row level security;
create policy "Briefs belong to clinic owner" on public.intelligence_briefs
  for all using (clinic_id in (select id from public.clinics where user_id = auth.uid()))
  with check (clinic_id in (select id from public.clinics where user_id = auth.uid()));

-- ── AUTO-SEED on new user signup ──────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_clinic_id uuid;
begin
  insert into public.clinics (user_id, name, address, phone, email, owner_email, google_rating, total_reviews, monthly_appts, avg_revenue, target_rating)
  values (new.id, 'My Dental Clinic', '', '', '', new.email, 4.3, 234, 80, 1200, 4.6)
  returning id into new_clinic_id;

  -- Seed 12 realistic demo reviews
  insert into public.reviews (clinic_id, author, rating, review_date, text, platform, responded) values
    (new_clinic_id, 'Thomas M.',  2, '2025-03-10', 'Waited over 40 minutes past my appointment. Reception was unhelpful. The actual treatment was fine but the wait time is unacceptable.', 'Google', false),
    (new_clinic_id, 'Sophie K.',  5, '2025-03-08', 'Dr. Weber is exceptional — gentle, thorough, and took time to explain everything. The clinic is immaculate. Best dental experience I''ve had.', 'Google', false),
    (new_clinic_id, 'Marco F.',   1, '2025-03-05', 'Completely shocked by the bill. CHF 340 for a routine cleaning with zero itemised breakdown. When I questioned it the receptionist was dismissive.', 'Google', false),
    (new_clinic_id, 'Anna L.',    3, '2025-03-03', 'Mixed experience. The dentist was good but I waited 30 minutes and the billing process could be much clearer.', 'Google', false),
    (new_clinic_id, 'Peter H.',   5, '2025-02-28', 'Absolutely fantastic. My implant procedure was completely painless and the team kept me informed throughout. Highly recommended.', 'Google', true),
    (new_clinic_id, 'Lisa R.',    2, '2025-02-25', 'Staff seem rushed and overworked. My hygiene appointment felt like they wanted to get me out as quickly as possible. Disappointing.', 'Google', false),
    (new_clinic_id, 'David W.',   4, '2025-02-22', 'Good clinic overall. Slight wait but Dr. Mueller was thorough and professional. The new digital X-ray system is impressive.', 'Google', true),
    (new_clinic_id, 'Nina B.',    1, '2025-02-18', 'I was billed for a procedure I did not consent to. When I raised this I was told it was standard practice. I am considering filing a complaint.', 'Google', false),
    (new_clinic_id, 'Lena S.',    5, '2025-02-14', 'Came in with a dental emergency and they fit me in within 2 hours. Dr. Weber was calm, professional, and solved the problem quickly.', 'Google', true),
    (new_clinic_id, 'Klaus B.',   2, '2025-02-10', 'Third time this year I''ve waited over 30 minutes. The dentist is good but the scheduling needs serious work.', 'Google', false),
    (new_clinic_id, 'Yasmin H.',  4, '2025-02-06', 'Lovely team and clean facilities. Only reason not 5 stars is the waiting time — 25 minutes past my appointment before being seen.', 'Google', false),
    (new_clinic_id, 'Michael T.', 5, '2025-02-01', 'Had an Invisalign consultation and was incredibly impressed. Dr. Weber took over an hour and answered all my questions.', 'Google', true);

  -- Seed 5 competitor clinics
  insert into public.competitors (clinic_id, name, rating, reviews, trend, distance) values
    (new_clinic_id, 'Zahnarztpraxis Zentrum', 4.7, 312, '+0.1', '0.3km'),
    (new_clinic_id, 'Dr. Müller & Partner',   4.5, 198,  '0.0', '0.5km'),
    (new_clinic_id, 'Dental Studio Nord',     4.3, 145, '-0.1', '0.7km'),
    (new_clinic_id, 'Klinik am Bahnhof',      4.6, 267, '+0.2', '0.9km'),
    (new_clinic_id, 'ZahnGesund Enge',        3.9,  89, '-0.3', '1.1km');

  return new;
end;
$$;

-- Trigger fires on every new signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists clinics_updated_at on public.clinics;
create trigger clinics_updated_at
  before update on public.clinics
  for each row execute procedure public.set_updated_at();

select 'ReplyIQ schema v3 installed successfully' as status;
