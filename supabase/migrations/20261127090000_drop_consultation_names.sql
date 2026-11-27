-- The student is already on the row. Names stay on the profile.
-- if exists covers databases created after those columns were taken out of the first migration.

alter table public.consultations
  drop column if exists first_name,
  drop column if exists last_name;
