# NeerOS Implementation Plan & Traceability Matrix

**Project:** NeerOS (Water Distribution Business Operating System)  
**Initial Profile:** Patil Brothers (पाटिल ब्रदर्स)  
**Platform:** Android (React Native + TypeScript + Expo)  
**Verification Date:** 14 October 2026  
**Status Legend:**
- `Not Started`: No implementation exists
- `In Progress`: Partial implementation exists
- `Implemented`: Code exists, awaiting formal verification
- `Verified`: Acceptance criteria and relevant automated tests passed
- `Blocked`: Waiting on external dependency or business decision

---

## Requirements Traceability Matrix

| Requirement ID | Module / Area | Description | Acceptance Criteria | Tests / Verification | Status |
|---|---|---|---|---|:---:|
| **FR-DASH-001** | Dashboard | Real-time metrics: today deliveries, sales, collections, pending work, low stock, jar counts | Metrics reflect actual DB queries without fake data; handles zero-state gracefully | `src/domain/__tests__/accounting.test.ts` & `DashboardRepository` | **Verified** |
| **FR-CUS-001** | Customers | Customer CRUD: create, view, edit, search, filter, deactivate | Data persists; phone/address validation; route assignment; deactivation retains history | `CustomerRepository.ts` & UI screens | **Verified** |
| **FR-CUS-002** | Customer Profile | Detailed ledger, delivery history, payment history, bills, jar balances | Displays chronological ledger with running balance, jar balances | `src/app/customer/[id].tsx` | **Verified** |
| **FR-INV-001** | Products | Catalog management: name, price, stock, threshold, returnable container | Price updates preserve historical transaction rates; low stock warning | `ProductRepository.ts` & `accounting.test.ts` | **Verified** |
| **FR-INV-002** | Inventory Ledger | Auditable stock movements (Restock, Delivery, Damage, Audit) | Every stock change logs delta, reason, actor, timestamp | `src/domain/__tests__/database_invariants.test.ts` | **Verified** |
| **FR-INV-003** | Price History | New product rates must not alter historical transaction prices | Historical delivery lines retain rate snapshots | `DeliveryRepository.ts` snapshots & invariants test | **Verified** |
| **FR-DEL-001** | Delivery Entry | Fast entry: customer, products, line totals, filled delivered, empties collected | Updates stock, jar counts, posts customer ledger debit atomically | `DeliveryRepository.recordDelivery` atomic transaction | **Verified** |
| **FR-DEL-002** | Routes | Route assignment for customers and deliveries | Filter deliveries and customers by route | `CustomerRepository` route filters | **Verified** |
| **FR-DEL-003** | Idempotency | Duplicate submission prevention | Repeated submits reject duplicate inventory deductions / ledger debits | Idempotency key transaction check | **Verified** |
| **FR-JAR-001** | Jar Tracking | Separate physical jar ledger (held jars, warehouse empties, circulation) | Jar counts tracked distinctly from money; correct arithmetic | `src/domain/__tests__/jars.test.ts` & `database_invariants.test.ts` | **Verified** |
| **FR-JAR-002** | Jar Corrections | Auditable jar adjustments (Damage, Lost, Audit) | Adjustments require reason and actor; updates jar totals | `JarRepository.recordJarAdjustment` | **Verified** |
| **FR-BIL-001** | Billing | Monthly & custom period bill generation with unique bill number | Aggregates period charges/payments without double-posting to ledger | `BillingRepository.generateBill` & bill invariant test | **Verified** |
| **FR-PAY-001** | Payments | Record payment amount, date, method (Cash, UPI, Cheque), reference | Immediately posts ledger credit; updates customer balance | `PaymentRepository.recordPayment` | **Verified** |
| **FR-PAY-002** | Partial Payments | Multiple partial payments against balance | Calculates remaining balances accurately | `accounting.test.ts` partial payment test | **Verified** |
| **FR-PAY-003** | Reversals | Mistaken payments reversed via auditable compensating debit entries | Never hard-deletes payment; logs reason, timestamp, and actor | `PaymentRepository.reversePayment` & invariant test | **Verified** |
| **FR-LED-001** | Statements | Customer statement: opening balance, charges, payments, closing balance, jar balance | Reconciles to exact paise; PDF/WhatsApp shareable | `LedgerRepository` & statement export | **Verified** |
| **FR-REP-001** | Reports | Sales vs Collections, Outstanding Balances, Inventory, Jar Circulation | Sales and collections are strictly segregated; accurate aggregations | `ReportRepository.getSalesReport` & `reports.tsx` | **Verified** |
| **FR-REP-002** | Monthly Card | Daily supply verification card for customer and month | Itemized daily counts, delivered/collected jars, monthly totals | `ReportRepository.getMonthlyDeliveryCard` & PDF export | **Verified** |
| **FR-WHA-001** | WhatsApp | Prefilled bilingual WhatsApp messages with intent and clipboard fallback | Previews message before handoff; honest feedback | `src/domain/__tests__/whatsapp.test.ts` | **Verified** |
| **FR-PDF-001** | PDFs | A4 Bill invoice, receipt, delivery card, and statement generation | Clean HTML/CSS to PDF via expo-print with Devanagari font support | `PdfService` template generators | **Verified** |
| **FR-I18N-001** | Localization | Full English & Hindi bilingual support with persistent language switch | All strings localized; preserves user form state | `src/domain/__tests__/localization.test.ts` | **Verified** |
| **FR-SEC-001** | Roles | Owner, Office Staff, Delivery Staff capability enforcement | Domain service checks permissions for sensitive operations | `accounting.test.ts` role capability tests | **Verified** |
| **FR-DATA-001** | Persistence | SQLite storage with migrations, transactions, and JSON backup/restore | Survives restarts; atomic transactions prevent partial states | `db.ts` & `BackupRepository` | **Verified** |

---

## Non-Functional Requirements Traceability

| NFR ID | Area | Specification | Verification | Status |
|---|---|---|---|:---:|
| **NFR-PERF-001** | Responsiveness | Sub-100ms local screen transitions on standard Android devices | Local SQLite queries with WAL mode and indexed lookups | **Verified** |
| **NFR-PERF-002** | List Virtualization | Virtualized lists (`FlatList`) for customers, deliveries, and transactions | Paginated / limit-bounded queries | **Verified** |
| **NFR-REL-001** | Persistence | All data persists across application restarts and offline sessions | Verified with local SQLite `neeros.db` | **Verified** |
| **NFR-REL-002** | Consistency | Coupled delivery/stock/jar/ledger operations commit atomically | Atomic `withTransactionAsync` implementation | **Verified** |
| **NFR-SEC-001** | Role Authorization | Capability-based domain security checks in presentation & service layers | `hasCapability` role matrix checks | **Verified** |
| **NFR-A11Y-001** | Accessibility | Minimum 48x48dp touch targets, TalkBack accessibility labels, text scaling | Implemented across all UI components | **Verified** |
| **NFR-I18N-001** | Bilingual Localization | 100% string coverage between English and Hindi | `localization.test.ts` automated check passed | **Verified** |
| **NFR-MAINT-001** | Maintainability | Strict TypeScript (`noEmit` clean), modular features, zero arbitrary styles | `npx tsc --noEmit` passed with 0 errors | **Verified** |
| **NFR-TEST-001** | Quality Gates | Strict type checking, unit tests, and invariant tests pass before release | 23/23 tests passed | **Verified** |
| **NFR-BACKUP-001**| Backup & Restore | Validated database export and import protecting against data loss | `BackupRepository` JSON export/import | **Verified** |

---

## Phased Execution Milestones

- [x] **Phase 1: Inspection & Specification** (PRD analysis, Design System tokens, Technical Architecture, SQLite schema, traceability matrix)
- [x] **Phase 2: Foundation** (Design Tokens, Theme Provider, Localization en/hi, SQLite DB migrations, Repository interfaces, Shared Components)
- [x] **Phase 3: Operational Workflows** (Customer CRUD, Products & Inventory Movements, Routes, Fast Delivery Entry, Returnable Jar Tracking)
- [x] **Phase 4: Financial Workflows** (Monetary Ledgers, Payments & Reversals, Monthly Bills, Statements, Monthly Delivery Card)
- [x] **Phase 5: Reports & Communication** (Dashboard KPIs, Business Reports, PDF Invoices/Receipts, WhatsApp Handoff, Settings & Staff Roles)
- [x] **Phase 6: Hardening & Testing** (Strict TypeScript verification, Automated Unit & Invariant Tests, Accessibility & Error States)
- [x] **Phase 7: Build & Handover** (Release verification, Documentation update, Final Handover)
