-- Only an admin can mark a consultation complete.
-- A student can still reschedule or cancel their own scheduled row.

drop policy "Students can update own scheduled consultations" on public.consultations;

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

create policy "Admins can complete scheduled consultations"
on public.consultations for update
to authenticated
using (
  public.is_admin()
  and status = 'scheduled'
)
with check (
  public.is_admin()
  and status = 'completed'
);
