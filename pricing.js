# Deployment Guide — Vercel + Airtable

You'll deploy the calculator to Vercel and connect it to your Airtable base. Total time: about 15 minutes.

---

## What you have

A folder with these files:

```
panel-calc/
├── api/
│   ├── _airtable.js      # shared Airtable client (not a route)
│   ├── auth.js           # POST /api/auth
│   ├── pricing.js        # GET + POST /api/pricing
│   └── quotes.js         # POST /api/quotes
├── index.html            # the calculator UI
├── package.json
└── vercel.json
```

---

## Step 1 — Get the files into a place Vercel can read

Two options:

### Option A: GitHub (recommended if you use GitHub)

1. Create a new private repo (e.g., `panel-calculator`)
2. Drop the contents of the `panel-calc/` folder into it (so `index.html` is at the root, `api/` is a subfolder)
3. Commit and push

### Option B: Upload directly via Vercel CLI

1. Install Vercel CLI on your machine: `npm i -g vercel`
2. Open a terminal in the `panel-calc/` folder
3. Run `vercel` — it'll walk you through deploying
4. Skip to Step 3 below; you can skip the GitHub connection step

---

## Step 2 — Create the Vercel project (if using GitHub)

1. Log into https://vercel.com
2. Click **Add New → Project**
3. Import your `panel-calculator` repo
4. **Framework Preset**: leave as "Other" (Vercel will detect the static HTML + API folder)
5. **Don't deploy yet** — click into "Environment Variables" first (see next step)

---

## Step 3 — Add environment variables in Vercel

In your project's **Settings → Environment Variables**, add these four. Apply to all environments (Production, Preview, Development).

| Name | Value | Notes |
|---|---|---|
| `AIRTABLE_TOKEN` | (your rotated token) | The new token you created after rotating |
| `AIRTABLE_BASE_ID` | `appkJe18C0BxCxpCV` | Your base ID |
| `ADMIN_PASSCODE` | (your admin passcode) | The new one you picked |
| `ESTIMATOR_PASSCODE` | (your estimator passcode) | The new one you picked |

After adding all four, **Save** and then click **Deploy** (or redeploy if you already did).

---

## Step 4 — Verify it works

Once Vercel finishes deploying:

1. Click the URL Vercel gives you (something like `panel-calculator-yourname.vercel.app`)
2. You should see the lock screen
3. Enter your **estimator passcode** first to test that role
   - You should NOT see the gear icon, admin-only fields, or margin/profit info
   - The pricing should match what's in your Airtable Globals/Panels/Breakers tables
4. Reload and try the **admin passcode**
   - You SHOULD see the gear icon and admin fields
   - Edit a value (like Labor Rate) — within a couple seconds the "Save status" pill should flash "Saved"
   - Check Airtable Globals — the value should have updated there
5. Build a test quote and click **Save Quote**
   - Check the Quotes table in Airtable — your test row should appear

If anything fails, see the troubleshooting section below.

---

## Step 5 — Custom domain (optional)

Vercel's default URL is fine. If you want a cleaner URL like `panel.yourcompany.com`:

1. **Settings → Domains** in your Vercel project
2. Add the domain
3. Add the DNS records Vercel shows you (CNAME usually) to your DNS provider
4. Wait for DNS to propagate (usually a few minutes)

---

## Step 6 — Share with your team

Send the URL plus the estimator passcode to your two estimators. They can:

- Bookmark it on their phones and desktop
- "Add to home screen" on iOS/Android for a near-app experience
- Use it offline? **No** — it needs internet to talk to Airtable. If they need offline, we'd have to add a different sync strategy later.

---

## Troubleshooting

**Lock screen says "Invalid passcode"**
Double-check the env vars in Vercel. They're case-sensitive. After changing env vars, click **Redeploy** (just changing them isn't enough).

**Lock screen passes but "Pricing load failed"**
Probably an Airtable issue. Check:
- Token is still valid (try regenerating again)
- Token has the right scopes (`data.records:read` and `data.records:write`)
- Token has access to your specific base
- Table names match exactly: `Pricing - Panels`, `Pricing - Breakers`, `Pricing - Globals`, `Quotes`
- Single-select field options match: brand options must be exactly `Siemens`, `Eaton BR`, `Square D Homeline`. Breaker types must be exactly `Single-pole`, `Tandem`, `Double-pole`, `GFCI`, `AFCI`, `Dual-function`.

**Admin pricing edits don't save**
Check the browser console (F12). Likely an Airtable field name mismatch. The pricing.js file maps field names — if you named them slightly differently in Airtable, that's the source. Tell me what you named them and I'll fix the mapping.

**"Save Quote" button does nothing**
Check console. Most likely cause is the Quotes table is missing a field or has a different field name than expected. Field names must match exactly.

**Anything else weird**
F12 → Console tab → screenshot the red errors, send them to me.

---

## Adding/removing estimator names

If you want a dropdown of fixed estimator names on the lock screen instead of free text, find this line in `index.html` (near the top of the script section):

```js
const ESTIMATOR_NAMES = ['__PLACEHOLDER__'];
```

Replace with your actual names:

```js
const ESTIMATOR_NAMES = ['Jane Doe', 'John Smith', 'You'];
```

Push the change to GitHub (or redeploy via CLI) and the dropdown updates.

---

## Updating the calculator later

Any time you (or I) make changes to the HTML or API:

- **If using GitHub**: push to your repo. Vercel auto-deploys.
- **If using CLI**: run `vercel --prod` in the folder.

---

## What to do next

Once it's deployed and working:

1. Take it for a test drive with a real quote
2. Check that quotes are landing in Airtable
3. Bring me a list of anything that feels wrong or missing
