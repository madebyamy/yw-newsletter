# Setup — about 10 minutes left

**GitHub is already done.** The code is pushed to
<https://github.com/madebyamy/yw-newsletter> on the `main` branch.

Two steps remain: Supabase (where the newsletter is stored) and Netlify (the
public link).

---

## 1. Supabase — the database

1. Go to **supabase.com** → **New project**. Name it `yw-newsletter`. Pick a
   region near you. Save the database password somewhere safe (you will not
   need it for this app, but Supabase will ask you to set one).
2. Wait for the project to finish building.
3. In the left sidebar open **SQL Editor** → **New query**.
4. Open `supabase/schema.sql` from this repo, paste the whole thing in, and
   press **Run**. It creates two tables: `newsletters` and `newsletter_edits`.
5. In the left sidebar open **Project Settings → API**. Copy these two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **service_role** secret key — the long one under "Project API keys"

> The service_role key is a master key. It only ever lives in Netlify's
> environment variables and is used by the server-side function. It never
> reaches anybody's browser. Do not paste it into the code or into git.

---

## 2. Netlify — the link

1. Go to **netlify.com** → **Add new site** → **Import an existing project** →
   **GitHub** → pick `yw-newsletter`.
2. Netlify reads `netlify.toml`, so build command and publish directory are
   already correct. Just press **Deploy**.
3. When the first deploy finishes, open **Site configuration → Environment
   variables** and add these three:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | the Project URL from step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role key from step 1 |
   | `EDIT_PASSCODE` | whatever passcode you want to give your editors |

4. Go to **Deploys → Trigger deploy → Deploy site**. Environment variables are
   only picked up by a fresh build, so this second deploy is required.
5. Optional: **Site configuration → Change site name** to something like
   `yw-newsletter-ourward` so the link reads nicely.

You now have a link like `https://yw-newsletter-ourward.netlify.app`.

---

## Checking it worked

Open the site. The pill in the toolbar should say **SHARED** (green-ish). If it
says **THIS BROWSER ONLY**, the function is not reaching Supabase — the three
environment variables are missing, misspelled, or the site has not been
redeployed since you added them.

Then press **Edit sections**, enter your name and the passcode, change
something small, and save. Open the same link on your phone: the change should
be there.

---

## Giving it to your editors

Send them two things:

- The link.
- The passcode.

That is the whole onboarding. They press **Edit sections**, type their name and
the passcode, pick a section, write, and press **Save section**. Their name
shows up next to that section on the printed page, so everyone can see who
wrote what.

Each section saves on its own. Two people editing two different sections at the
same time will not overwrite each other. The previous version of every section
is also kept in the `newsletter_edits` table, so nothing is ever truly lost.

---

## Changing the passcode

Change `EDIT_PASSCODE` in Netlify, then trigger a deploy. Anyone still holding
the old passcode is locked out at their next save.

---

## Running it on your own computer

```bash
npm install
```

```bash
npm run dev
```

That runs without Supabase. Anything you save goes into that browser only, the
pill says **THIS BROWSER ONLY**, and the passcode is `yw2026` (change it with
`VITE_LOCAL_PASSCODE` in a `.env` file). This is only useful for trying layout
changes — real editing should happen on the Netlify link.

To preview the whole thing including the save function, install the Netlify CLI
and run `netlify dev` instead.
