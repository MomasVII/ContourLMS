# LMS

A small consultations app. Students book, reschedule, and cancel their own consultations. Admins see every consultation and can mark a scheduled one complete.

## Special setup

1. Install dependencies and copy the environment file.

   ```bash
   npm install
   cp .env.example .env.local
   ```

2. Start the local Supabase stack, then copy the API URL and anon key from `supabase status` into `.env.local`. The app reads these names only:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_LOCAL_ANON_KEY
   ```

   A key stored as `NEXT_PUBLIC_SUPABASE_ANON_KEY` does not count. Do not put the service role key in a `NEXT_PUBLIC_` variable.

3. Apply the SQL in `supabase/migrations`, then start the app:

   ```bash
   supabase start
   supabase migration up
   npm run dev
   ```

   The app runs at [localhost:3000](http://localhost:3000/).

4. Password rules live in `supabase/config.jsonc` (at least 8 characters, with a number, a symbol, and upper and lower case). Restart the local stack after changing that file.

5. The sign-up form has an Admin checkbox so a test account can be created without a manual SQL update. Leave it unticked for a student. Local auth mail is caught by the local stack, so confirmation links show up in the Supabase inbox from `supabase status`.

## Deployment

The live app is at [https://contour-lms-wine.vercel.app/](https://contour-lms-wine.vercel.app/).

Three services stay connected:

- GitHub holds the code at [github.com/MomasVII/ContourLMS](https://github.com/MomasVII/ContourLMS).
- Vercel builds that repository and serves the site at the address above.
- Supabase is the hosted database and login service, project `gzqvudvkldunviseczkk` (`https://gzqvudvkldunviseczkk.supabase.co`).

The hosted database gets its tables from the same migration files, with `supabase db push --remote` after `supabase link --project-ref gzqvudvkldunviseczkk`. That updates the schema only. Local users and consultations stay on the local stack.

## Justifications and assumptions

- Students cannot mark a consultation complete. Admins keep that control because a student cannot be trusted to close their own consultation.
- Sign-up creates a student. The Admin checkbox is only there for testing and would not exist in production.
- The name is collected on sign-up and stored on the profile. Booking does not ask for it again.

### Contemplations

- A cancelled consultation could be moved back to scheduled, in case it was cancelled by mistake. Creating a new one is enough for now.
- An admin could be assigned to particular students and only have authority over those consultations. That is out of scope, and it would assume a relationship the app does not have.

## Summary of the implementation

The app is a Next.js App Router project with Supabase Auth and Postgres. The session is a cookie. Signed-out visitors can open the home page and the auth pages. Other pages send them to login.

`/` is the dashboard for both roles. A student sees their consultations, with reschedule and cancel on scheduled rows, and a link to `/consultations/book`. An admin sees every consultation, with the student's name and a mailto email, and can mark a scheduled row complete. The sidebar shows Book consultation for students only.

Booking asks for a reason and a date and time. The name comes from the profile created at sign-up. The list is ordered scheduled, then completed, then cancelled, then earliest time. Status filters and page numbers are kept in the address, for example `/?status=scheduled&page=2`.

Auth covers sign-up, login, logout, password reset, and email confirmation. Sign-up copies the name and email onto `profiles`. The consultation tables, policies, grants, and triggers are the migration files in `supabase/migrations`.
