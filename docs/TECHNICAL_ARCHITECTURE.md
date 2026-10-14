# NeerOS Technical Architecture
## Production-Grade Water Distribution Operating System

**Product:** NeerOS  
**Platform:** Android (React Native + TypeScript + Expo SDK 52+)  
**Initial Business Profile:** Patil Brothers (पाटिल ब्रदर्स)  
**Target Locale:** English (`en`) and Hindi (`hi`)  
**Currency:** Indian Rupee (`₹` / INR)  
**Status:** Approved Technical Architecture  

---

## 1. Architectural Principles & Clean Architecture

NeerOS follows a **Feature-Oriented Clean Architecture** with strict layer boundaries:

```
[ Presentation Layer: Screens & Components ]
                    │
                    ▼
[ Application Services & Feature Controllers / Hooks ]
                    │
                    ▼
[ Domain Layer: Business Rules, Invariants & Calculations ]
                    │
                    ▼
[ Repository Interfaces: Abstract Data Contracts ]
                    │
                    ▼
[ Infrastructure / Persistence: Expo-SQLite Database with Transactions ]
```

### Architectural Rules
1. **Separation of Concerns:** Screens MUST NOT contain direct SQL queries or authoritative financial/inventory logic.
2. **Pure Domain Logic:** Accounting, jar balance formulas, inventory thresholds, and validation rules are pure, independently testable TypeScript functions.
3. **Repository Pattern:** UI and application services interact solely through repository interfaces.
4. **Atomic Transactions:** Coupled operations (e.g., Delivery -> Stock Deduction + Jar Movement + Ledger Debit + Audit Log) execute within a single SQLite transaction.
5. **No Duplicate Financial Charging:** Exactly one charging path exists: Delivery completion posts the customer charge immediately to the ledger. Bill generation aggregates existing period charges and does not post duplicate debit entries.
6. **Physical vs. Financial Separation:** Physical water jar circulation is tracked in a dedicated physical asset ledger with jar counts, strictly segregated from monetary balances.

---

## 2. Domain Models & Accounting Invariants

### 2.1 Monetary Ledger Convention
Customer account balances use a receivable ledger convention:
$$\text{Closing Balance} = \text{Opening Balance} + \text{Charges (Debits)} - \text{Payments (Credits)} - \text{Credits} + \text{Debit Adjustments} - \text{Credit Adjustments}$$

- **Positive balance ($> 0$):** Customer owes money to Patil Brothers (Receivable).
- **Zero balance ($= 0$):** Fully settled.
- **Negative balance ($< 0$):** Customer has an advance/overpayment credit balance.

### 2.2 Payment & Reversal Policy
- Payments are never deleted.
- If a payment was recorded in error, an authorized user issues a **Payment Reversal**, creating an auditable compensating debit entry referencing the original payment ID with mandatory reason and staff actor ID.

### 2.3 Returnable Jar Movement Ledger
Returnable 20L jars are physical business assets, not monetary charges:
$$\text{Customer Jar Balance} = \text{Opening Balance} + \text{Filled Jars Delivered} - \text{Empty Jars Collected} + \text{Authorized Adjustments}$$
$$\text{Godown/Warehouse Empty Jars} = \text{Opening Empties} + \text{Empty Jars Collected} - \text{Sent for Refill/Cleaning} + \text{Adjustments}$$

Adjustments for damaged, broken, leaked, or written-off jars require mandatory reason and audit attribution.

### 2.4 Inventory Stock Reconciliation
For any product:
$$\text{Current Stock} = \text{Opening Stock} + \sum \text{Stock Movement Deltas}$$
- Delivery reduces stock by delivered quantity (`delta = -qty`).
- Restock adds stock (`delta = +qty`).
- Damage/Audit adjustment updates stock with an immutable movement record.
- Historical unit prices are snapshotted on delivery line items; altering product catalog rates never alters historical delivery or bill totals.

---

## 3. Security, Roles & Authorization

Three distinct roles are enforced via domain capability checks in the application service layer:

| Capability | Owner / Admin | Office Staff | Delivery Staff |
|---|:---:|:---:|:---:|
| View Dashboard & KPIs | Full | Permitted | Route-Only |
| Customer CRUD | Full | Full | Read Assigned |
| Delivery Entry | Full | Full | Assigned Routes |
| Product & Price Editing | Yes | No | No |
| Stock Restock / Adjustment | Yes | Permitted | No |
| Jar Audit Adjustments | Yes | Permitted | No |
| Payment Entry | Yes | Yes | Optional/Restricted |
| Payment Reversal | Yes | No | No |
| Bill Generation & PDF Export | Yes | Yes | No |
| Business Reports | Full | Standard | None |
| Backup & Database Restore | Yes | No | No |
| Business Settings Profile | Yes | No | No |

---

## 4. Local Persistence & Offline-First Strategy

1. **Storage Engine:** `expo-sqlite` utilizing SQLite database `neeros.db` with WAL mode enabled for high concurrent read performance.
2. **Offline-First:** All core operations (customer management, deliveries, payments, inventory, jars, reports) execute locally with zero external network dependencies.
3. **Future Backend Sync Adapter:** Database schema includes `sync_status`, `local_version`, `server_version`, and `updated_at` timestamps on all master entities to enable seamless cloud sync integration in future phases without schema re-architecture.

---

## 5. Document Generation & WhatsApp Sharing

- **PDF Documents:** Generated using `expo-print` from HTML5/CSS print templates with embedded UTF-8 fonts to ensure full Devanagari (Hindi) script rendering.
- **WhatsApp Integration:** Generates localized prefilled text messages with customer name, bill details, and payment receipts. Launches WhatsApp via Android Intent `whatsapp://send?phone=...&text=...` with clipboard fallback and confirmation alerts.
