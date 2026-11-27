-- Students can mark their own scheduled consultation complete.
-- Cancel is still a status change. Admins stay read-only.

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
  and status in ('scheduled', 'cancelled', 'completed')
);
