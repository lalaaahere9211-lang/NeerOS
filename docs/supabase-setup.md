# NeerOS Supabase Setup Guide

## Overview

NeerOS uses Supabase as its cloud backend for:
- **Authentication** (email/password sign-up, sign-in, password reset)
- **Cloud PostgreSQL** (synced copy of local data for backup and multi-device access)
- **Row Level Security** (business-level data isolation enforced at the database)

NeerOS remains **fully offline-first**. All operations work locally via SQLite. Supabase is an optional cloud layer. If environment variables are not configured, the app runs in offline-only mode with no login screen.

---

## Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account (free tier works)
- Supabase CLI (optional, for local development):
  ```bash
  npm install -g supabase
  ```

---

## 1. Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose your organization, project name (e.g., `neeros`), and region
4. Set a strong database password (save it securely)
5. Wait for the project to finish provisioning

---

## 2. Get Your API Keys

From the Supabase Dashboard:
1. Navigate to **Project Settings → API**
2. Copy:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Publishable Key** (`sb_publishable_...`) or legacy **anon public key** (`eyJhbGciOi...`)

> ⚠️ **Never use the `service_role` key in the React Native app.** Only use the `publishable` or `anon` public key.

---

## 3. Configure Environment Variables

```bash
# From the project root
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key-here
```

The `EXPO_PUBLIC_` prefix makes these available to the Expo app at build time. They are **public** keys — safe for the client, but never commit your actual `.env` file.

---

## 4. Apply Database Migrations

### Option A: Supabase Dashboard (SQL Editor)

1. Open **SQL Editor** in your Supabase Dashboard
2. Run each migration file in order:
   - `supabase/migrations/20261014000001_initial_schema.sql`
   - `supabase/migrations/20261014000002_rls_policies.sql`
   - `supabase/migrations/20261014000003_functions.sql`

### Option B: Supabase CLI (recommended for development)

```bash
# Link to your remote project
supabase link --project-ref your-project-ref

# Apply all migrations
supabase db push
```

### Option C: Local Development with Supabase CLI

```bash
# Start local Supabase (requires Docker)
supabase start

# Migrations are applied automatically from supabase/migrations/
# Local dashboard: http://localhost:54323
```

---

## 5. Configure Authentication

### Email Authentication (default)

Email/password auth is enabled by default in Supabase. Optionally configure:

1. **Dashboard → Authentication → Settings**:
   - Enable/disable email confirmation requirement
   - Set custom email templates
   - Configure password requirements

2. **Dashboard → Authentication → URL Configuration**:
   - Add your app's deep link scheme: `neeros://`
   - Add redirect URLs for password reset

### Email Templates (optional)

Customize the confirmation and reset emails in **Authentication → Email Templates** to match NeerOS branding.

---

## 6. Verify Setup

### Quick Verification Steps

1. **Start the app**:
   ```bash
   npx expo start
   ```

2. **Sign up** with an email and password on the auth screen

3. **Check the Supabase Dashboard**:
   - **Authentication → Users**: Your new user should appear
   - **Table Editor → user_profiles**: A profile record should be auto-created

4. **Create a business** via the app (if prompted)

5. **Verify RLS**: In the SQL Editor, try:
   ```sql
   -- This should return no rows (not authenticated via Dashboard)
   SELECT * FROM customers;
   ```

---

## 7. Database Reset Procedure

If you need to reset the database during development:

### Supabase CLI (local)
```bash
supabase db reset
```

### Remote Project
```sql
-- ⚠️ DESTRUCTIVE: Drops and recreates all tables
-- Run in SQL Editor

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS sync_queue CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS bill_items CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS payment_reversals CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS jar_movements CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS delivery_items CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS business_memberships CASCADE;
DROP TABLE IF EXISTS business_profiles CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop enums
DROP TYPE IF EXISTS sync_status CASCADE;
DROP TYPE IF EXISTS sync_operation CASCADE;
DROP TYPE IF EXISTS ledger_direction CASCADE;
DROP TYPE IF EXISTS ledger_entry_type CASCADE;
DROP TYPE IF EXISTS bill_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS jar_movement_type CASCADE;
DROP TYPE IF EXISTS stock_movement_reason CASCADE;
DROP TYPE IF EXISTS delivery_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS get_user_business_id CASCADE;
DROP FUNCTION IF EXISTS is_business_member CASCADE;
DROP FUNCTION IF EXISTS get_user_role_in_business CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS record_delivery_atomic CASCADE;
DROP FUNCTION IF EXISTS record_payment_atomic CASCADE;
DROP FUNCTION IF EXISTS reverse_payment_atomic CASCADE;

-- Then re-run all migration files
```

---

## 8. Type Generation

To regenerate TypeScript types from your Supabase schema:

```bash
# From remote
npx supabase gen types typescript --project-id your-project-ref > src/types/supabase.ts

# From local
npx supabase gen types typescript --local > src/types/supabase.ts
```

The generated types replace the hand-maintained `src/types/supabase.ts`.

---

## 9. Offline Synchronization Model

### How It Works

```
┌─────────────────────────────────────────────────────┐
│  User Action (e.g., Record Delivery)                │
│                                                     │
│  1. Write to local SQLite (immediate, always works) │
│  2. Enqueue in sync_queue table                     │
│  3. Background sync pushes to Supabase when online  │
└─────────────────────────────────────────────────────┘
```

### What Can Be Created Offline

| Entity | Offline Create | Offline Edit | Notes |
|--------|:-:|:-:|---|
| Customers | ✅ | ✅ | Synced on next connection |
| Products | ✅ | ✅ | Rate changes sync independently |
| Deliveries | ✅ | ❌ | Idempotency key prevents duplicates |
| Payments | ✅ | ❌ | Never auto-overwritten on conflict |
| Bills | ✅ | ❌ | Generated locally, synced to cloud |
| Inventory Changes | ✅ | ❌ | Stock movements are append-only |
| Jar Movements | ✅ | ❌ | Append-only ledger |

### Conflict Resolution Strategy

| Data Type | Strategy |
|---|---|
| Customer records | Last-write-wins (server timestamp) |
| Product catalog | Last-write-wins |
| Deliveries | Idempotency key prevents duplicates |
| Payments | **Never auto-overwrite** — conflicts flagged for manual review |
| Ledger entries | Append-only, no conflicts possible |
| Bills | Unique bill_number per business prevents duplicates |
| Stock/Jar movements | Append-only, no conflicts possible |

### Retry Behavior

- Failed syncs retry up to 5 times with the queue
- Financial table conflicts (payments, ledger) are marked as FAILED immediately
- Force sync available in Settings screen
- Completed sync items are cleaned up after 24 hours

---

## 10. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes (for cloud) | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes (for cloud) | Supabase anon/public API key |

If neither variable is set, the app runs in **offline-only mode** — no login screen, no cloud sync.

---

## 11. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      React Native App                        │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Screens  │→│  Repositories │→│  Local SQLite (neeros.db)│ │
│  │  (UI)     │  │  (local)      │  │  - Primary data source │ │
│  └──────────┘  └──────┬───────┘  │  - Always available     │ │
│                       │          └────────────────────────┘ │
│                       │                                      │
│                  ┌────▼────┐                                 │
│                  │  Sync   │    ← Queue in local SQLite      │
│                  │ Service │                                  │
│                  └────┬────┘                                 │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │ (when online)
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                   Supabase Cloud                              │
│                                                              │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────────────┐ │
│  │  Auth         │  │ PostgreSQL  │  │  RLS Policies        │ │
│  │  (email/pwd)  │  │ (cloud DB)  │  │  (business isolation)│ │
│  └──────────────┘  └────────────┘  └──────────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  Server Functions (record_delivery_atomic, etc.)         ││
│  │  - Atomic multi-table operations                         ││
│  │  - Authorization checks                                  ││
│  │  - Idempotency enforcement                               ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```
