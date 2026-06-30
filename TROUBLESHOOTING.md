# 🩺 Troubleshooting — God of Seed Academy

Common problems and their exact fixes. Find your symptom below.

---

### ❌ `ERROR: 42P01: relation "public.profiles" does not exist` when running the SQL
**Cause:** you ran an old SQL file whose helper functions were declared before the
tables they use.
**Fix:** Use **`database/schema.sql` from this ZIP**. It creates every table first,
then the functions, then the policies — so this error cannot occur. Re-run it; it
is safe to run more than once. (Do not run `voting-schema.sql` first; the main
schema already includes voting.)

---

### ❌ `ERROR: 42P16: cannot drop columns from view`
**Cause:** an OLDER version of a view (e.g. `poll_results` or `report_subject_totals`)
already exists in your Supabase project, and `CREATE OR REPLACE VIEW` cannot change an
existing view's columns.
**Fix:** Use the SQL files **from this ZIP** — they now run `DROP VIEW IF EXISTS … CASCADE`
before creating each view, so re-running is always safe. (If you prefer, you can also run
`drop view if exists public.poll_results cascade; drop view if exists public.report_subject_totals cascade;`
once, then re-run the schema.)

### ❌ `ERROR: column "voter_id" does not exist` (or similar)
**Cause:** a table from an OLD schema version is missing a column the new security policies
need (`CREATE TABLE IF NOT EXISTS` does not add columns to existing tables).
**Fix:** Use the SQL files **from this ZIP** — they include an idempotent
`ALTER TABLE … ADD COLUMN IF NOT EXISTS` backfill that repairs old tables automatically.
Just re-run `database/schema.sql`.

---

### ❌ I type my email & password but nothing happens / I am not logged in
Check each item:
1. **Did you paste your keys?** Open `assets/js/config.js`. If it still says
   `YOUR_SUPABASE_URL`, login is disabled — paste your real Project URL and anon key.
2. **Did you confirm your email?** Supabase sends a confirmation link on sign-up.
   You cannot log in until you click it (unless you disabled confirmations).
3. **Is your account approved?** New accounts start as `pending`. An admin must
   approve you, or run the SQL in Step 7 of the Deployment Guide to approve yourself.
4. **Open the browser console (F12)** and look for red errors. A "Database not
   configured" toast means step 1 above.

> Note: in this version the **Sign in** and **Request access** buttons are wired to
> `App.handleSignIn` / `App.handleSignUp` and the tab switcher to
> `App.switchAuthTab`, all defined in `assets/js/app.js`. The earlier version
> referenced functions that did not exist on the generated site, so clicking did
> nothing — that is fixed here.

---

### ❌ My uploaded school logo does not show (a default badge appears instead)
**Cause (old version):** pages hard-coded `logo.svg` while your uploaded PNG/JPG was
saved as `logo.png`/`logo.jpg`, so the `<img>` pointed at a file that did not exist.
**Fix (this version):** every page now references **`logo.png`** — the exact
file that was packaged. Your logo file in this ZIP is **`assets/img/logo.png`**.
To change it later, replace that file (keep the same name) and re-upload.

---

### ❌ The voting page shows "Loading polls…" forever
- Make sure the schema ran (it creates `polls` and `poll_votes`).
- Make sure you are **logged in** — polls require an authenticated session.
- Free-tier Supabase has realtime; if a vote tally doesn't auto-update, refresh —
  the page still works without realtime.

---

### ❌ Push notifications don't appear
- The user must **install the app** (PWA banner) and click **Enable Push** on the
  Notifications page, then **Allow** in the browser prompt.
- iOS requires the app be **added to the Home Screen** first (Safari → Share → Add to Home Screen).

---

### ❌ Page looks unstyled in the in-app preview
External CSS/fonts may be blocked in a sandboxed preview. The **downloaded/hosted**
site loads them normally in a real browser.

Still stuck? Contact HMG Concepts: https://hmgconcepts.pages.dev/
