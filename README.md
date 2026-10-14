# NeerOS (नीरओएस)
### Water Distribution Business Operating System · Patil Brothers (पाटिल ब्रदर्स)

> **Every Drop. Every Delivery. Every Detail.**  
> Production-grade Android application built with React Native, TypeScript, Expo, and SQLite.

---

## 1. Product Overview

NeerOS is an operational operating system designed specifically for water supply and jar distribution businesses. The initial release is pre-configured for **Patil Brothers (पाटिल ब्रदर्स)** in Pune, Maharashtra.

The application replaces error-prone paper registers and informal diary tracking with an auditable, bilingual system for:
- **Fast Daily Deliveries:** 1-tap customer delivery logging, product line items, rate preservation, filled delivered vs empty jar collection.
- **Auditable Financial Ledger:** Strict receivable accounting invariants ($\text{Closing} = \text{Opening} + \text{Debits} - \text{Credits}$), partial payments, and non-destructive payment reversals.
- **Physical Jar Circulation:** Independent tracking of 20L returnable containers (customer custody vs warehouse stock), separate from currency.
- **Monthly Delivery Cards:** Complete calendar-day supply cards with monthly totals.
- **Document Generation:** Shareable A4 Tax Invoices, payment receipts, and delivery cards via PDF and WhatsApp.
- **Bilingual Localization:** 100% complete English and Hindi (हिंदी) translations across UI, documents, and messages.
- **Offline-First Resilience:** Zero-dependency local persistence with SQLite (WAL mode) and JSON backup/restore.

---

## 2. Technology Stack & Architecture

- **Runtime & Framework:** React Native 0.86, Expo SDK 57, TypeScript (Strict Mode)
- **Architecture:** Feature-Oriented Clean Architecture (Presentation $\to$ Application Services $\to$ Pure Domain Invariants $\to$ Repositories $\to$ SQLite)
- **Navigation:** Expo Router (File-based navigation with typed routes)
- **Design System:** Material Design 3-inspired design tokens with Light, Dark, and System modes
- **Local Persistence:** `expo-sqlite` with WAL mode, foreign keys, and atomic transactions
- **Cloud Backend & Sync:** Supabase (PostgreSQL, Supabase Auth, Row-Level Security, multi-tenant business scoping)
- **Document Generation:** `expo-print` + `expo-sharing` (HTML5/CSS print layouts with UTF-8 Devanagari font support)
- **Messaging:** WhatsApp Intent launcher (`whatsapp://send?phone=...&text=...`) with clipboard fallback
- **State Management:** Zustand (Transient user session & role permissions)
- **Unit & Invariant Testing:** Jest + `ts-jest` (31 tests across 5 suites)
- **Setup Guide:** See [docs/supabase-setup.md](file:///Users/joelsmac/.gemini/antigravity-ide/scratch/neeros/docs/supabase-setup.md) for backend configuration

---

## 3. Directory Structure

```text
neeros/
├── docs/
│   ├── design.md                  # Canonical Material 3 design tokens & component specs
│   ├── TECHNICAL_ARCHITECTURE.md  # Clean architecture, invariants, and role security
│   ├── DATABASE_SCHEMA.md         # SQLite DDL, indexes, seed data, and formulas
│   ├── IMPLEMENTATION_PLAN.md     # Requirements traceability matrix (23/23 verified)
│   └── supabase-setup.md          # Supabase cloud setup, migrations, and sync guide
├── supabase/
│   └── migrations/                # PostgreSQL schema, RLS policies, atomic functions
├── src/
│   ├── theme/                     # Colors (light/dark), typography, spacing, shapes, ThemeProvider
│   ├── localization/              # English & Hindi bilingual dictionaries & LanguageProvider
│   ├── types/                     # Domain entities & database interfaces (including Supabase)
│   ├── domain/                    # Pure testable domain logic (Accounting, Jars, Inventory, Roles)
│   ├── database/                  # SQLite connection, DDL migrations, and Repositories
│   │   └── repositories/
│   │       ├── cloud/             # Cloud Repositories (Auth, Customer, Inventory, Delivery, Billing)
│   │       └── ...                # Local SQLite Repositories (Customer, Product, Delivery, etc.)
│   ├── lib/                       # Supabase client singleton & AuthProvider
│   ├── services/                  # PdfService, WhatsAppService, SyncService
│   ├── hooks/                     # useColorScheme, useTheme, useSyncState
│   ├── store/                     # Zustand user session & capability store
│   ├── components/ui/             # Button, TextField, Card, MetricCard, StatusChip, HeaderBar, ConfirmModal
│   └── app/                       # Expo Router file-based screens
│       ├── _layout.tsx            # Root Stack, Auth Guard, & Providers
│       ├── (auth)/                # Supabase Auth: Sign in, Sign up, Forgot password
│       ├── (tabs)/                # Bottom Tabs: Home, Customers, Deliveries, Inventory, Accounts
│       ├── customer/[id].tsx      # Customer Detail & 5-tab profile
│       ├── customer-new.tsx       # Add customer with route & opening balances
│       ├── customer-edit.tsx      # Edit customer
│       ├── delivery-new.tsx       # Fast daily delivery entry form
│       ├── payment-new.tsx        # Payment recording form
│       ├── bill-new.tsx           # Monthly bill generation
│       ├── reports.tsx            # Sales vs Collections & stock status
│       └── settings.tsx           # Business profile, language/theme, staff PIN switcher, JSON backup
└── package.json
```

---

## 4. Verification & Testing

### Run Automated Invariant & Domain Tests
```bash
npm test
```
**Test Results:**
- `src/domain/__tests__/accounting.test.ts`: 10 passed
- `src/domain/__tests__/localization.test.ts`: 3 passed
- `src/domain/__tests__/whatsapp.test.ts`: 4 passed
- `src/domain/__tests__/database_invariants.test.ts`: 6 passed
- `src/domain/__tests__/supabase_client.test.ts`: 7 passed
- **Total: 31 passed, 0 failed (5 test suites)**

### Run Strict TypeScript Check
```bash
npx tsc --noEmit
```
**Result:** 0 errors.

### Run Expo Doctor
```bash
npx expo-doctor
```
**Result:** 21/21 checks passed. No issues detected!

---

## 5. Running the Application Locally

```bash
# Start Expo development server
npm start

# Run on Android emulator / connected device
npm run android
```

---

## 6. Business Profile: Patil Brothers

- **Owner Profile:** Ganesh Patil (`usr_owner`, PIN: `1234`)
- **Office Staff:** Suresh Shinde (`usr_office`, PIN: `1111`)
- **Delivery Staff:** Ramesh Jadhav (`usr_delivery`, PIN: `0000`)
- **Standard Routes:** Kothrud & Karve Nagar, Aundh & Baner, Market Yard & Camp
- **Primary Product:** 20L RO Water Jar (`prod_20l_jar`, ₹40.00)
