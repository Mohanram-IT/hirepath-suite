## TalentFlow — Recruitment & Vacancy Management Portal

This is a large enterprise system. Building it well requires phasing — trying to ship everything in one pass produces a shallow, broken app. Below is a realistic phased plan. I'll confirm scope for **Phase 1** before building, then move through subsequent phases on your approval.

### Tech stack (adjusted to this environment)
You requested Next.js + Supabase. This Lovable project runs on **TanStack Start (React 19 + Vite)** with **Lovable Cloud** (Supabase under the hood — same Postgres, Auth, Storage, RLS). All requested capabilities are achievable; only the framework name changes. If that's a blocker, tell me now.

---

### Phase 1 — Foundation + Vacancy & Replacement Core (this build)
The backbone everything else depends on.

- **Design system**: enterprise ATS look (dense data UI, semantic tokens in `src/styles.css`, no purple-gradient defaults). Sidebar shell + topbar.
- **Auth & RBAC**: Lovable Cloud email/password + Google login. `user_roles` table with enum (`hr_admin`, `recruitment_manager`, `recruiter`, `hiring_manager`), `has_role()` security-definer fn, route guards via `_authenticated` layout.
- **Database** (with RLS + grants): `clients`, `vacancies`, `replacement_employees`, `extensions`, `comments`, `audit_logs`, `user_roles`, `profiles`.
- **Vacancy module**: create / edit / list / detail. All fields from spec (client, role, level L1–L4, location, experience, skills, openings, RM, HM, type, status).
- **Replacement hiring logic**: replacement employee form, auto-calc Deployment Deadline = (Early Relieving OR Last Working Date) + 1 day, Target Hiring Date, Days Left with green/orange/red/critical color states.
- **Target date extension**: HR Admin can extend with reason + approval notes; full extension history preserved.
- **Vacancy detail**: timeline, internal notes/comments, extension history, SLA status badge (On Track / At Risk / Breached).
- **Admin dashboard v1**: KPI cards (open, closed, replacement, new, SLA breaches) + countdown list of at-risk replacements.
- **Filters & search** on vacancy list (client, role, status, type, date range).

### Phase 2 — Candidates & Pipeline
- Candidate table + profile fields, resume upload to Supabase Storage (PDF/DOCX).
- Pipeline stages (Sourcing → Joined / Rejected / On Hold), **Kanban + list views**, drag-and-drop stage updates.
- Candidate ↔ vacancy assignment, recruiter notes, hiring manager feedback.

### Phase 3 — Interviews + Email + Google Meet
- Interview scheduling (rounds, interviewer, date/time, type).
- Google Meet link generation + Calendar event (via Google connector — requires per-user OAuth setup; I'll walk you through it when we get here).
- Email notifications (Lovable Emails) — interview invite, feedback pending, target date approaching, SLA breach.
- In-app notifications.

### Phase 4 — SLA, Reports, Performance
- SLA reminders cron (15/7/3/1 day).
- Recruiter performance leaderboard.
- Reports (vacancy, candidate, interview, recruiter, client, SLA, replacement) with Excel/CSV/PDF export.
- Dashboard charts (recruiter perf, client-wise, role-wise, monthly trend, aging).

### Phase 5 — AI features
Resume parsing, candidate ranking, JD match score, interview question generation, closure prediction — via Lovable AI Gateway server functions.

### Phase 6 — Optional WebRTC in-app meetings
Only if still needed after Google Meet is live. This is a large standalone build; recommend deferring or descoping.

---

### What I need from you before starting Phase 1
1. **OK to proceed on TanStack Start + Lovable Cloud** (instead of literal Next.js)? Same Postgres/Auth/Storage capabilities.
2. **OK to phase the work** as above, starting with Phase 1?
3. **Microsoft login**: Lovable Cloud natively supports Email, Google, Apple, Phone, SAML. **Microsoft is not natively supported** — would require connecting external Supabase. OK to ship with Email + Google for now?
4. **In-app WebRTC video calling**: large scope, real ops cost (TURN servers). Recommend dropping or deferring to Phase 6. Confirm?

Reply with answers (or just "go") and I'll start Phase 1.
