-- Profiles and consultations.
-- Cancel sets status to 'cancelled'. Rows stay so the history is kept.
-- A student can change their own consultation only while it is 'scheduled'.
-- Admins can read every consultation and have no write policy.
-- A booking is tied to the student. Names live on the profile, not the consultation.
-- Bookings have to be in the future, and a student cannot have two scheduled
-- consultations at the same time.
--
-- Deleting an auth user deletes their profile and, through that, their
-- consultations. That keeps account deletion simple. Switch student_id to
-- ON DELETE RESTRICT if a consultation has to outlive the user.

-- One profile per authenticated user.
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

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null
    constraint consultations_reason_valid
    check (char_length(btrim(reason)) between 1 and 1000),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Own consultations, ordered by date.
create index consultations_student_id_scheduled_at_idx
  on public.consultations (student_id, scheduled_at);

-- One scheduled consultation per student per start time.
-- Cancelled and completed rows are left out, so that time can be booked again.
create unique index consultations_student_slot_unique
  on public.consultations (student_id, scheduled_at)
  where status = 'scheduled';

-- Left off. This would allow one scheduled consultation per start time for
-- the whole system, which only fits a single shared consultant.
-- create unique index consultations_slot_unique
--   on public.consultations (scheduled_at)
--   where status = 'scheduled';

-- Profile row on signup. Names are trimmed and cut to 100 characters.
-- Role stays the default. Signup metadata cannot set it.
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

-- security definer so the profile policies do not recurse.
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

-- now() cannot live in a CHECK constraint, so the future-date rule is a trigger.
-- It runs when the time is set or changed, so a past consultation can still be cancelled.
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

-- Triggers only. Not callable from the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.enforce_consultation_schedule() from public, anon, authenticated;

-- Policies call is_admin() as the signed-in user.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Supabase grants anon and authenticated everything by default.
-- Take that back and grant only what the app uses. service_role is left as-is.
revoke all on public.profiles from anon, authenticated;
revoke all on public.consultations from anon, authenticated;

-- Read, and update names only. Role cannot be changed through the API.
grant select on public.profiles to authenticated;
grant update (first_name, last_name) on public.profiles to authenticated;

-- id, status, created_at, and updated_at are filled in by defaults and triggers.
-- student_id stays as it was on insert.
grant select on public.consultations to authenticated;
grant insert (student_id, reason, scheduled_at)
  on public.consultations to authenticated;
grant update (reason, scheduled_at, status)
  on public.consultations to authenticated;

alter table public.profiles enable row level security;
alter table public.consultations enable row level security;

create policy "Users can view own profile"
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

create policy "Admins can view all profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

-- Column grant limits this to names.
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Students can view own consultations"
on public.consultations for select
to authenticated
using (student_id = (select auth.uid()));

create policy "Students can create own consultations"
on public.consultations for insert
to authenticated
with check (student_id = (select auth.uid()));

-- Own rows, and only while scheduled. Status can stay scheduled or become cancelled.
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

-- Read only. There is no admin write policy.
create policy "Admins can view all consultations"
on public.consultations for select
to authenticated
using (public.is_admin());

-- No delete policy. Cancellation is a status change.

-- First admin, after that person has signed up. Run as postgres so the
-- column grants do not block the role change:
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'admin@example.com');