# GBC Analytics Dashboard

A mini order analytics pipeline built for the AI Tools Specialist test assignment. The project connects RetailCRM, Supabase, Vercel, and Telegram into a working data pipeline with a live dashboard and automated alerts.

**Live dashboard:** https://gbc-analytics-dashboard-2.vercel.app

---

## What was built

A five-step pipeline:

1. 50 mock orders (Nova shapewear brand, Kazakhstan market) uploaded to RetailCRM via API
2. Orders synced from RetailCRM into a Supabase PostgreSQL database
3. Analytics dashboard deployed on Vercel showing KPIs, charts by city and traffic source, and a recent orders table
4. Telegram bot that alerts when an order exceeds 50,000 ₸, triggered via a Vercel cron job

---

## Architecture

```
mock_orders.json
      │
      │  upload script (Node.js)
      ▼
  RetailCRM API
      │
      │  sync script (Node.js)
      ▼
   Supabase (PostgreSQL)
      │
      ├──────────────────────────┐
      │  Next.js dashboard       │  Vercel cron → /api/notify
      ▼                          ▼
  Vercel (public URL)       Telegram bot
```

---

## Tech stack

| Layer | Tool |
|---|---|
| Order source | RetailCRM (REST API v5) |
| Database | Supabase (PostgreSQL) |
| Dashboard | Next.js 14, Tailwind CSS, Recharts |
| Hosting | Vercel |
| Alerts | Telegram Bot API |
| Scripts | Node.js 18+ (native fetch, no extra deps) |

---

## Project structure

```
gbc-analytics-dashboard/
├── scripts/
│   ├── upload-orders.js       # Step 2: upload mock_orders.json → RetailCRM
│   └── sync-to-supabase.js    # Step 3: RetailCRM → Supabase
├── dashboard/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Server component — fetches data, renders dashboard
│   │   ├── globals.css
│   │   └── api/
│   │       └── notify/
│   │           └── route.ts   # Step 5: Telegram alert endpoint + cron
│   ├── components/
│   │   └── Charts.tsx         # Client component — Recharts bar charts
│   ├── vercel.json            # Cron schedule (daily, Hobby plan)
│   └── package.json
├── mock_orders.json           # 50 test orders (provided in assignment repo)
├── .env                       # Local secrets (not committed)
├── .gitignore
└── README.md
```

---

## Supabase schema

```sql
create table orders (
  id            integer primary key,
  number        text,
  first_name    text,
  last_name     text,
  phone         text,
  email         text,
  status        text,
  order_type    text,
  order_method  text,
  city          text,
  utm_source    text,
  total         numeric,
  created_at    timestamptz,
  synced_at     timestamptz default now()
);

create table alerted_orders (
  order_id   integer primary key,
  alerted_at timestamptz default now()
);
```

---

## How to run locally

**Prerequisites:** Node.js 18+

**1. Clone the repo and set up environment:**
```bash
git clone https://github.com/KairatTest/gbc-analytics-dashboard.git
cd gbc-analytics-dashboard
```

Create `.env` in the root:
```
RETAILCRM_URL=https://your-account.retailcrm.ru
RETAILCRM_API_KEY=your_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

**2. Upload orders to RetailCRM:**
```bash
npm run upload
```

**3. Sync to Supabase:**
```bash
npm run sync
```

**4. Run the dashboard:**
```bash
cd dashboard
cp ../.env .env.local   # or create .env.local manually
npm install
npm run dev
```

Open `http://localhost:3000`

**5. Test the Telegram bot manually:**
```
GET http://localhost:3000/api/notify
```
Or on production: `https://gbc-analytics-dashboard-2.vercel.app/api/notify`

---

## AI tool used

**Claude (claude.ai)** was used as the primary AI tool throughout the entire project — architecture decisions, all code, debugging, and deployment guidance. The entire session was conducted interactively in the Claude chat interface.

---

## Prompts given to Claude

The project was built through a single continuous conversation. Key prompts included:

- *"Go over this repo and explain what it asks me to do and what is the proper way to do it"* — used to understand the assignment and plan the approach
- *"Explain the tools itself. What they are, how they are implemented and connected with each other"* — to understand RetailCRM, Supabase, Vercel, and Telegram before writing code
- *"Let's build it according to your sophisticated plan"* — initiated the build phase
- *"Write the upload script"*, *"Write the sync script"*, *"Build the dashboard"*, *"Write the Telegram bot"* — one step at a time, with Claude producing complete working files at each stage
- Debugging prompts when errors occurred — pasting error output directly and asking Claude to diagnose

---

## Issues encountered and how they were solved

This section is required by the assignment. These are real problems that occurred during the build.

### Issue 1 — Wrong RetailCRM API endpoint
**What happened:** The upload script sent requests to `POST /api/v5/orders` and received `Method Not Allowed` on all 50 orders.

**Root cause:** `POST /api/v5/orders` is not the create endpoint — it is used for listing orders via POST with filters. The correct endpoint for creating a single order is `POST /api/v5/orders/create`.

**How it was solved:** Corrected the endpoint in the script. This is a common gotcha with RetailCRM's API design where the same resource path behaves differently depending on whether you append `/create`.

---

### Issue 2 — Wrong endpoint for fetching site codes
**What happened:** After fixing Issue 1, added auto-detection of the site code by calling `/api/v5/sites`. This returned `API method not found`.

**Root cause:** The correct endpoint for the sites reference list is `/api/v5/reference/sites`, not `/api/v5/sites`. RetailCRM puts all reference/lookup data under the `/reference/` namespace.

**How it was solved:** Updated the endpoint to `/api/v5/reference/sites`. Also added auto-detection of order types and order methods using the same pattern (`/api/v5/reference/order-types` and `/api/v5/reference/order-methods`).

---

### Issue 3 — Order type `eshop-individual` not found
**What happened:** After fixing Issue 2, orders still failed with: `"OrderType" with "code"="eshop-individual" does not exist`.

**Root cause:** The `mock_orders.json` file uses `eshop-individual` as the order type, but RetailCRM demo accounts don't have this type pre-configured. Reference values like order types must exist in the account's settings before they can be used.

**How it was solved:** Instead of hardcoding the order type, the script now fetches all available order types from the account's reference data and uses the first available one. This makes the script portable across any RetailCRM account regardless of how it's configured.

---

### Issue 4 — Git credential conflict between two GitHub accounts
**What happened:** The repo needed to be pushed to a new GitHub account (KairatTest) but git was caching credentials for the original account (Kairat11), resulting in a 403 Permission Denied error.

**Root cause:** Windows credential manager was serving the old account's token automatically.

**How it was solved:** Embedded the new account's Personal Access Token directly in the remote URL: `https://KairatTest:TOKEN@github.com/KairatTest/gbc-analytics-dashboard.git`. This bypasses the credential cache entirely.

---

### Issue 5 — Vercel deploying from repo root instead of `dashboard/` subfolder
**What happened:** After connecting the repo to Vercel, the build failed with: `Couldn't find any pages or app directory`.

**Root cause:** The Next.js app lives in the `dashboard/` subfolder, but Vercel was trying to build from the repo root where no Next.js app exists.

**How it was solved:** Added a `vercel.json` at the repo root with `{ "rootDirectory": "dashboard" }`. This tells Vercel at the configuration level where the app lives, without needing to change the UI settings.

---

### Issue 6 — Vercel cron frequency limit on Hobby plan
**What happened:** Setting the cron to `*/5 * * * *` (every 5 minutes) caused a build error: `Hobby accounts are limited to daily cron jobs`.

**Root cause:** Vercel's free Hobby plan only allows cron jobs that run once per day.

**How it was solved:** Changed the schedule to `0 9 * * *` (once daily at 9am UTC). For testing purposes, the endpoint can be triggered manually at any time by visiting `/api/notify` directly in the browser, which bypasses the cron schedule entirely.

---

## Results

- 50 orders successfully uploaded to RetailCRM
- 50 orders synced to Supabase (41 Алматы, 6 Астана, 2 Шымкент, 1 Актау)
- Dashboard live at https://gbc-analytics-dashboard-2.vercel.app
- Telegram bot confirmed working — received alerts for all orders exceeding 50,000 ₸
