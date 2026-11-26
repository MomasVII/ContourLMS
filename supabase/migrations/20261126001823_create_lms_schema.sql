-- =============================================================================
-- Profiles and consultations
--
-- Design decisions
--   * Cancellation is a status ('cancelled'); consultations are never deleted
--     through the API, so history is kept.
--   * Students can edit or cancel only their own consultations, and only while
--     they are 'scheduled'. Completed and cancelled rows are locked.
--   * Admins are strictly read-only through the API.
--   * Restrictive table/column privileges plus RLS (defence in depth).
--   * Booking names are entered in the form and stored as a snapshot.
--   * Names and reasons are validated; bookings must be in the future; a
--     student cannot hold two scheduled consultations at the same time.
--
-- Known trade-off: ON DELETE CASCADE
--   Deleting an auth user deletes their profile and, through the cascade, ALL of
--   their consultations permanently. That is simple and supports account
--   deletion / data-erasure requests, but it destroys consultation history that
--   might be needed for audit or reporting. If that becomes a requirement,
--   switch consultations.student_id to ON DELETE RESTRICT (or SET NULL with a
--   nullable column) or move to soft-deleted profiles.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- Profiles: one record per authenticated user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default ''
    constraint profiles_first_name_length check (char_length(first_name) <= 100),
  last_name text not null default ''
    constraint profiles_last_name_length check (char_length(last_name) <= 100),
  role text not null default 'student'
    check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

-- Consultations
create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  -- Names are entered in the booking form (snapshot at booking time)
  first_name text not null
    constraint consultations_first_name_valid
    check (char_length(btrim(first_name)) between 1 and 100),
  last_name text not null
    constraint consultations_last_name_valid
    check (char_length(btrim(last_name)) between 1 and 100),
  reason text not null
    constraint consultations_reason_valid
    check (char_length(btrim(reason)) between 1 and 1000),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Supports the RLS filter on student_id and "my consultations by date" queries
create index consultations_student_id_scheduled_at_idx
  on public.consultations (student_id, scheduled_at);

-- Prevent a student holding two scheduled consultations at the same time.
-- Cancelled and completed rows are excluded, so a cancelled slot can be rebooked.
create unique index consultations_student_slot_unique
  on public.consultations (student_id, scheduled_at)
  where status = 'scheduled';

-- OPTIONAL (needs confirmation of the scheduling rules): allow only ONE
-- scheduled consultation per time slot across all students. This assumes a
-- single shared consultant and fixed slot start times. If enabled, a student
-- who hits it learns the slot is taken, but cannot see who holds it.
-- create unique index consultations_slot_unique
--   on public.consultations (scheduled_at)
--   where status = 'scheduled';

-- -----------------------------------------------------------------------------
-- Functions and triggers
-- -----------------------------------------------------------------------------

-- Automatically create a student profile when someone signs up.
-- Names come from signup metadata and are trimmed and truncated so that an
-- over-long value can never violate a constraint and block signup.
-- Role is never read from metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    left(btrim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), 100),
    left(btrim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), 100)
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin check (security definer avoids recursive profile RLS policies)
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

-- Keep updated_at current
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger consultations_set_updated_at
  before update on public.consultations
  for each row execute function public.set_updated_at();

-- Require future dates. This is a trigger rather than a CHECK constraint
-- because now() is not immutable and CHECK constraints must be (a now()-based
-- check would also fail when restoring a dump). It runs on insert and whenever
-- scheduled_at changes, so cancelling a past consultation is still allowed.
-- Note it applies to all roles, including backfills run from the SQL editor.
create function public.enforce_consultation_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.scheduled_at is distinct from old.scheduled_at then
    if new.scheduled_at <= now() then
      raise exception 'Consultations must be scheduled in the future'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger consultations_enforce_schedule
  before insert or update of scheduled_at on public.consultations
  for each row execute function public.enforce_consultation_schedule();

-- Function execute privileges.
-- Trigger-only functions must not be callable via the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.enforce_consultation_schedule() from public, anon, authenticated;

-- is_admin is evaluated inside RLS policies as the calling role, so
-- authenticated needs execute. anon does not.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- Table and column privileges (defence in depth alongside RLS)
-- Supabase grants broad privileges to anon/authenticated by default; reset them
-- and grant back only what the app needs. service_role and the SQL editor
-- (postgres) are unaffected.
-- -----------------------------------------------------------------------------

revoke all on public.profiles from anon, authenticated;
revoke all on public.consultations from anon, authenticated;

-- Profiles: read; update names only (role can never be changed via the API)
grant select on public.profiles to authenticated;
grant update (first_name, last_name) on public.profiles to authenticated;

-- Consultations: read; insert and update a limited set of columns.
-- id, status, created_at and updated_at are set by defaults/triggers on insert.
-- student_id, first_name and last_name are immutable after creation.
grant select on public.consultations to authenticated;
grant insert (student_id, first_name, last_name, reason, scheduled_at)
  on public.consultations to authenticated;
grant update (reason, scheduled_at, status)
  on public.consultations to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.consultations enable row level security;

-- Profiles: users can see their own profile; admins can see all
create policy "Users can view own profile"
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

create policy "Admins can view all profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

-- Profiles: users can update their own profile (column grant limits this to names)
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Consultations: students can see their own
create policy "Students can view own consultations"
on public.consultations for select
to authenticated
using (student_id = (select auth.uid()));

-- Consultations: students can create their own
create policy "Students can create own consultations"
on public.consultations for insert
to authenticated
with check (student_id = (select auth.uid()));

-- Consultations: students can edit or cancel their own consultations only while
-- scheduled. They can move a row to 'scheduled' or 'cancelled', never
-- 'completed'. Completed and cancelled rows are locked.
create policy "Students can update own scheduled consultations"
on public.consultations for update
to authenticated
using (
  student_id = (select auth.uid())
  and status = 'scheduled'
)
with check (
  student_id = (select auth.uid())
  and status in ('scheduled', 'cancelled')
);

-- Consultations: admins can view all (strictly read-only: no admin write policies)
create policy "Admins can view all consultations"
on public.consultations for select
to authenticated
using (public.is_admin());

-- No delete policies: cancellation is a status change, so history is kept.

-- -----------------------------------------------------------------------------
-- Creating the first admin (manual, not part of this migration)
--
-- 1. Sign up the user normally so a profile row exists.
-- 2. In the Supabase dashboard SQL Editor (runs as postgres, so it is not
--    limited by the API column grants), run:
--
--      update public.profiles
--      set role = 'admin'
--      where id = (select id from auth.users where email = 'admin@example.com');
--
-- 3. Confirm with: select id, role from public.profiles where role = 'admin';
-- -----------------------------------------------------------------------------