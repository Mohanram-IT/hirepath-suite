## Goals

1. Fix email delivery (recruiter login + candidate) — replace `worker-mailer` (which requires `cloudflare:sockets`, missing on our Node runtime) with `nodemailer`, loaded via `createRequire` to avoid the earlier bundling error.
2. Reduce spam-folder placement with proper headers.
3. Switch auth to password-first with OTP only when the session has expired or the account is new.
4. Add a super-admin form to create recruiter/HR accounts with an admin-chosen password, emailed to the user.

## Email fix

- Remove `worker-mailer`, reinstall `nodemailer` + `@types/nodemailer`.
- Rewrite `src/lib/gmail-mailer.server.ts` to load nodemailer with `createRequire(import.meta.url)('nodemailer')` inside the handler. This sidesteps Vite's ESM wrapper that produced `Class extends [object Module]`.
- Use `smtp.gmail.com:465`, `secure: true`, `GMAIL_USER` / `GMAIL_APP_PASSWORD`.
- Set `From: "TalentFlow" <GMAIL_USER>`, add `Reply-To`, `List-Unsubscribe`, and a plain-text alternative — these three are the biggest levers against Gmail marking mail as spam.
- Return the real `messageId` from nodemailer for `email_send_log`.

Note: `m.mohanram@tvs-e.in` non-delivery is out of our control (their mail server / corporate spam gateway rejected or quarantined it). We'll surface the SMTP error into `email_send_log.error_message` so you can see exactly why. Users can whitelist your Gmail sender in their corporate mail rules.

## Auth flow (candidate)

Signup:
- Candidate enters email + full name + password.
- We send a 6-digit OTP; on verify we create the auth user with `password` set and `email_confirm: true`.

Login:
- Enter email + password → normal `signInWithPassword`. No OTP.
- Session lasts 24h (Supabase default is 1h access token, 30-day refresh — we'll set project JWT expiry to 24h and disable refresh persistence beyond that window by signing out on tab open if session older than 24h).

Session-expiry OTP:
- If `signInWithPassword` fails and it's been >24h since last login (tracked via `profiles.last_login_at`), UI flips to "Verify OTP to reset session," sends OTP, and on verify allows password entry again. (Password itself never expires — the OTP is the re-verification step you described.)

## Auth flow (recruiter / HR)

- No self-signup. Only `signInWithPassword`. Same 24h re-verify OTP rule.
- Super admin (hr_admin role) creates the account via a new page `/_authenticated/admin/users`:
  - Form: email, full name, role (recruiter | hr_admin), password.
  - Calls a `createServerFn` guarded by `has_role('hr_admin')` that:
    - `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, signup_as: role } })`
    - Inserts/updates `user_roles` to the chosen role (overriding the trigger's default recruiter/candidate mapping).
    - Emails the user their credentials via `sendGmail`.

## Schema changes

Migration adds:
- `profiles.last_login_at timestamptz`
- Trigger or `signInWithPassword` wrapper server fn to update it (we'll use a server fn on successful sign-in — simpler and does not touch auth schema).
- (auth_otps table already exists; we'll add `purpose text default 'signup'` to distinguish `signup` vs `reverify`.)

## Files touched

- `src/lib/gmail-mailer.server.ts` — rewrite with `createRequire`.
- `src/lib/otp-core.server.ts` — support `purpose`, `password` on signup, mark last_login on verify.
- `src/lib/otp.functions.ts` — add `password` to request/verify schemas.
- `src/lib/auth.functions.ts` (new) — `signInWithPasswordFn` (updates last_login), `adminCreateUser`.
- `src/routes/auth.tsx` — new UI: sign in tab (email+password), sign up tab (email+name+password+OTP), re-verify path.
- `src/routes/_authenticated/admin/users.tsx` (new) — super-admin form; guarded by role check in `beforeLoad`.
- Migration: `alter table profiles add column last_login_at`, `alter table auth_otps add column purpose`.
- Remove `worker-mailer` from `package.json`, add `nodemailer`.

## Out of scope for this turn (say if you want them)

- SPF/DKIM tuning (not possible without a domain; Gmail-from-Gmail already has DKIM).
- Enforcing password strength via HIBP (one tool call, can add).
- Email delivery to `m.mohanram@tvs-e.in` — dependent on their mail server accepting it.