# DentalReputAI — DRIS Platform
### AI-powered reputation intelligence for independent dental clinics

> *Not automation. Revenue protection and risk intelligence.*

---

## What's inside

| Screen | What it does |
|---|---|
| **Dashboard** | KPIs, AI intelligence brief, complaint pattern chart, trend charts, live alerts |
| **Reviews** | AI classification (sentiment, categories, severity, risk flags), GDPR-compliant response drafting, saved to Supabase |
| **Risk Index** | 5-vector reputation risk score, radar chart, component breakdown, AI 7-day recovery plan |
| **Revenue Impact** | Rating elasticity calculator (HBS Luca 2016 model), ROI projections |
| **Competitors** | Local market benchmarking, AI competitive intelligence |
| **AI Response Engine** | GDPR-compliant response drafting in professional / empathetic / concise tone |
| **Weekly Report** | Full structured intelligence brief, saved to Supabase, email delivery |
| **Settings** | Clinic profile (synced to Supabase), subscription, notification preferences |

---

## Setup — 3 steps, ~10 minutes

### Step 1 — Supabase (free account)

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name (e.g. `dris-dental`), set a strong password, pick the **Europe (Frankfurt)** region
3. Wait ~2 minutes for the project to spin up
4. Go to **SQL Editor** → **New Query**
5. Paste the entire contents of `supabase_schema.sql` and click **Run**
   - This creates all tables, RLS policies, and a trigger that seeds demo data on first signup
6. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon / public key** (the long JWT string)

### Step 2 — Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com) → **API Keys** → **Create Key**
2. Copy the key (starts with `sk-ant-...`)

### Step 3 — Configure and run

```bash
# 1. Copy the env template
cp .env.example .env

# 2. Fill in your three values
#    VITE_SUPABASE_URL=https://your-project-id.supabase.co
#    VITE_SUPABASE_ANON_KEY=your_anon_key
#    VITE_ANTHROPIC_KEY=sk-ant-your-key

# 3. Install dependencies
npm install

# 4. Start the dev server
npm run dev
# → Opens at http://localhost:3000
```

### First login

1. Open `http://localhost:3000`
2. Click **Create Account** and sign up with `alexander.mm.weber@gmail.com` (or any email)
3. The Supabase trigger automatically creates your clinic and seeds all 12 demo reviews + 5 competitors
4. Confirm your email if Supabase asks (check your inbox), then sign in
5. You're in — start clicking AI buttons

---

## Project structure

```
dris/
├── index.html
├── package.json
├── vite.config.js
├── .env.example              ← copy to .env and fill in keys
├── supabase_schema.sql       ← run this in Supabase SQL Editor
└── src/
    ├── main.jsx              ← React entry point
    ├── App.jsx               ← Router + auth guard + global toast
    ├── index.css             ← Design system (CSS variables + keyframes)
    ├── lib/
    │   ├── supabase.js       ← All Supabase calls (auth, CRUD)
    │   ├── api.js            ← All Claude AI calls
    │   └── store.js          ← React context (session, clinic, reviews, competitors)
    ├── components/
    │   ├── UI.jsx            ← Full component library (Button, Card, KPI, Toast, etc.)
    │   └── Layout.jsx        ← Sidebar + topbar (reads from store)
    └── pages/
        ├── Auth.jsx          ← Login + signup page
        ├── Dashboard.jsx     ← Main dashboard
        ├── Reviews.jsx       ← Review management + AI classify + respond
        ├── Risk.jsx          ← Risk Index page
        ├── Revenue.jsx       ← Revenue Impact Estimator
        └── OtherPages.jsx    ← Competitors, Respond, Report, Settings
```

---

## How data flows

```
User signs up
    ↓
Supabase trigger fires → creates clinic row + seeds 12 reviews + 5 competitors
    ↓
AppProvider loads → fetches clinic, reviews, competitors into React context
    ↓
All pages read from context (no prop drilling)
    ↓
AI actions (classify, respond, brief, risk, revenue, report) → call Claude API
    ↓
Results saved back to Supabase → context updated → UI re-renders
```

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + React Router v6 |
| Charts | Recharts |
| Build | Vite |
| Database + Auth | Supabase (PostgreSQL + Row Level Security) |
| AI | Anthropic Claude Sonnet |
| Styling | Pure CSS variables — zero framework |

---

## Deploying to production

```bash
npm run build
# Output in dist/ — deploy to Vercel, Netlify, or any static host
```

**Important for production:**
- Move AI calls behind a backend function (Next.js API route, Supabase Edge Function, etc.) so your Anthropic key is never exposed in the browser
- Enable email confirmation in Supabase Auth settings
- Set up a custom SMTP provider in Supabase for email delivery

---

## Customising demo data

All seeded data is in `supabase_schema.sql` inside the `handle_new_user()` function. Edit the `INSERT` statements before running the schema to customise clinic name, reviews, and competitors.

To reset demo data for a user: delete their row in `auth.users` (Supabase dashboard → Authentication → Users) and sign up again — the trigger re-seeds everything.

---

## Owner configuration

Pre-configured for:
- **Owner email:** `alexander.mm.weber@gmail.com`
- **Clinic:** Zahnarztpraxis Zürich
- **Subscription:** Starter (CHF 199/month)

Update via Settings page after login — changes save to Supabase in real time.

---

*DentalReputAI DRIS — built for independent dental clinics in Switzerland and DACH.*
