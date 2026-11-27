# Functions

A short description of each function in this app.

## Pages

- `Home` — Shows the dashboard, or a blank page when nobody is signed in.
- `pageNumber` — Turns the page number in the address into a safe number, or 1.
- `HomeContent` — Loads the signed-in person and one page of their consultations.
- `BookConsultationPage` — Shows the form for booking a consultation.
- `submit` — Sends the booking to the server and returns to the dashboard.
- `RootLayout` — Wraps every page with the header, sidebar, and theme.
- `Page` in `app/auth/login` — Shows the sign-in form.
- `Page` in `app/auth/sign-up` — Shows the sign-up form.
- `Page` in `app/auth/sign-up-success` — Tells the person to check their email.
- `Page` in `app/auth/forgot-password` — Shows the form that emails a reset link.
- `Page` in `app/auth/update-password` — Shows the form for choosing a new password.
- `Page` in `app/auth/error` — Shows the sign-in error page.
- `ErrorContent` — Prints the error message from the address.

## Dashboard

- `LearningDashboard` — Draws the consultation list, totals, and the buttons for the signed-in role.
- `toDatetimeLocal` — Turns a saved time into the value the reschedule box expects.
- `bySchedule` — Sorts consultations into scheduled, completed, then cancelled.
- `updateConsultation` — Sends a change for one consultation.
- `pageHref` — Builds the address for a page of the list.
- `run` — Saves a change, then refreshes the list. A reschedule error stays in the popup.

## Sidebar and header

- `AppSidebar` — Decides whether to show the sidebar, based on the signed-in role.
- `SidebarNav` — Draws the dashboard and booking links, and lets the drawer open and close.
- `SiteHeader` — Draws the top bar with the title, theme switch, and sign-in or logout.
- `AuthButton` — Shows the email and logout when signed in, otherwise Sign in and Sign up.
- `LogoutButton` — Signs this browser out and loads the login page.
- `logout` — Clears the local session and sends the browser to login.
- `EnvVarWarning` — Shows the banner when the Supabase settings are missing.
- `ThemeSwitcher` — Lets the person pick light, dark, or match the computer.
- `MuiProvider` — Turns on the Material UI theme for the app.

## Sign-in forms

- `LoginForm` — Shows the email and password form.
- `handleLogin` — Checks the password and reloads the home page.
- `SignUpForm` — Shows the name, email, and password form.
- `handleSignUp` — Creates the account and sends the person to the check-your-email page.
- `ForgotPasswordForm` — Shows the form that asks for an email.
- `handleForgotPassword` — Emails a link for choosing a new password.
- `UpdatePasswordForm` — Shows the new-password form.
- `handleForgotPassword` in the update form — Saves the new password and returns home.

## Consultations

- `listConsultations` — Loads one page of consultations and the total number that match.
- `countConsultations` — Counts scheduled, completed, and cancelled without loading the rows.
- `getOwnConsultation` — Loads one consultation that belongs to the signed-in student.
- `createConsultation` — Saves a new booking for the signed-in student.
- `updateOwnConsultation` — Lets a student change the time or cancel their own scheduled booking.
- `completeConsultation` — Marks a scheduled consultation complete. Only an admin is allowed to reach this.
- `mapWriteError` — Turns a database save failure into a readable error.
- `oneConsultation` — Checks a database row and converts it into the app's consultation shape.
- `toConsultation` — Renames the database fields into the names the app uses.
- `assertConsultationRow` — Checks that a database result really has the consultation fields.
- `isStatus` — Checks that a status is scheduled, completed, or cancelled.
- `formatWhen` — Writes a stored UTC time in the browser's local timezone.
- `assertFuture` — Rejects a booking time that is not in the future.
- `bookConsultationError` — Turns booking mistakes into a message naming the field.
- `parseConsultationId` — Rejects an id that is not a proper consultation id.

## API routes

- `POST` in `/api/consultations` — Creates a booking for the signed-in student.
- `PATCH` in `/api/consultations/[id]` — Updates one consultation. Completing it requires an admin.
- `GET` in `/auth/confirm` — Confirms an email link and sends the person into the app.

## Auth and errors

- `requireUser` — Stops the request unless someone is signed in.
- `getCurrentRole` — Reads whether the signed-in person is a student or an admin.
- `isAppRole` — Checks that a role is student or admin.
- `withErrorHandling` — Catches a failed request and turns it into an error response.
- `toErrorResponse` — Picks the status and message for a caught error.
- `fieldErrors` — Groups form mistakes by field name.
- `readJsonBody` — Reads the JSON body, or rejects a body that is not JSON.
- `json` — Sends a JSON response and tells the browser not to cache it.
- `HttpError` — An error that already knows which HTTP status to send.

## Supabase connection

- `createClient` in `lib/supabase/server.ts` — Opens a database connection that can read the sign-in cookie.
- `createClient` in `lib/supabase/client.ts` — Opens a database connection in the browser.
- `updateSession` — Refreshes the sign-in cookie and sends logged-out visitors to the login page.
- `proxy` — Runs that session check on each page request.
- `cn` — Joins CSS class names and drops the ones that clash.
- `passwordIssue` — Rejects a password shorter than 8 characters, or one missing a number, a symbol, or both letter cases.

## Database

- `handle_new_user` — Creates a profile when someone signs up, including their name, email, and admin choice.
- `sync_profile_email` — Updates the profile when the login email changes.
- `is_admin` — Reports whether the signed-in person is an admin.
- `set_updated_at` — Stamps a consultation with the time it was last changed.
- `enforce_consultation_schedule` — Rejects a consultation time that is not in the future.

## Shared controls

These only draw standard controls. They do not talk to the database.

- `Button` — A clickable button.
- `Input` — A text box.
- `Label` — The caption for a form field.
- `Badge` — A small status label.
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` — The box around a form.
- `Checkbox` — The admin tick box on sign up.
- `DropdownMenu` and its pieces — The menu used by the theme switch.
