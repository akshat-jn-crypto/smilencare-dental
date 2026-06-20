-- =====================================================================
-- Smile'n'Care Dental Clinic — Supabase setup
-- ---------------------------------------------------------------------
-- Run this ONCE in your Supabase project:
--   Dashboard  ->  SQL Editor  ->  New query  ->  paste  ->  Run.
--
-- Design (privacy-safe):
--   * bookings      = private patient details. The public anon key can
--                     INSERT a booking but can NEVER read this table,
--                     so names/phones/emails are not exposed publicly.
--   * booked_slots  = only date + time. Publicly readable so the website
--                     can show which slots are taken, and realtime-enabled
--                     so booked slots vanish for everyone instantly.
--   * A trigger locks the slot by inserting into booked_slots; its
--     PRIMARY KEY(date,time) makes double-booking impossible (the second
--     concurrent booking fails with a unique violation).
-- =====================================================================

-- 1) Private bookings (patient details) ------------------------------
create table if not exists public.bookings (
  id         uuid primary key default gen_random_uuid(),
  date       date        not null,
  time       text        not null,
  name       text        not null,
  phone      text        not null,
  email      text        not null,
  service    text,
  reason     text,
  created_at timestamptz default now()
);

-- 2) Public, PII-free availability ----------------------------------
create table if not exists public.booked_slots (
  date date not null,
  time text not null,
  primary key (date, time)        -- guarantees no slot is taken twice
);

-- 3) Lock the slot whenever a booking is created --------------------
create or replace function public.lock_slot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Fails with unique_violation (SQLSTATE 23505) if already booked,
  -- which aborts the booking insert -> the client shows "slot taken".
  insert into public.booked_slots(date, time) values (new.date, new.time);
  return new;
end;
$$;

drop trigger if exists trg_lock_slot on public.bookings;
create trigger trg_lock_slot
  before insert on public.bookings
  for each row execute function public.lock_slot();

-- 4) Row Level Security --------------------------------------------
alter table public.bookings    enable row level security;
alter table public.booked_slots enable row level security;

-- Anyone (anon) may CREATE a booking...
drop policy if exists "anon can insert bookings" on public.bookings;
create policy "anon can insert bookings"
  on public.bookings for insert
  to anon, authenticated
  with check (true);
-- ...but there is intentionally NO select policy on bookings,
-- so patient details can never be read with the public key.

-- Anyone may READ availability (date + time only)
drop policy if exists "anyone can read booked slots" on public.booked_slots;
create policy "anyone can read booked slots"
  on public.booked_slots for select
  to anon, authenticated
  using (true);
-- No insert/update/delete policy: only the trigger (security definer)
-- writes here, so visitors cannot tamper with availability.

-- 5) Enable realtime on the public availability table --------------
alter publication supabase_realtime add table public.booked_slots;

-- =====================================================================
-- View your bookings later (as the project owner) in:
--   Dashboard -> Table Editor -> bookings
-- or run:  select * from public.bookings order by created_at desc;
-- =====================================================================
