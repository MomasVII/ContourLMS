-- Testing only. A signup can ask for the admin role. Anything else stays a student.
-- The profile update grant still does not include role, so a signed-in person cannot change it later.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, email, role)
  values (
    new.id,
    left(btrim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), 100),
    left(btrim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), 100),
    coalesce(new.email, ''),
    case
      when new.raw_user_meta_data ->> 'role' = 'admin' then 'admin'
      else 'student'
    end
  );

  return new;
end;
$$;
