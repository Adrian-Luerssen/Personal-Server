# Finance Settings, Transfers & Subscriptions — Design Spec

**Date:** 2026-03-11
**Status:** Approved

## Overview

Three interconnected changes to the finance module:
1. A unified Finance Settings page consolidating wallet, category, and subscription management
2. Transfer transaction type supporting cross-currency wallet-to-wallet moves
3. Subscription tracking with automatic transaction generation

## 1. Finance Settings Hub

**Route:** `/finance/settings`
**Replaces:** `/finance/wallets` and `/finance/categories` (both removed as standalone pages)

A tabbed page with three tabs:

### Wallets Tab
- List of all wallets with name, icon, currency, balance, and transaction count
- Add/edit/delete wallet functionality (migrated from existing FinanceWallets page)
- Edit modal with fields: name, icon, color, currency, order
- **Deletion warning:** If a wallet has active subscriptions, warn user and pause those subscriptions on deletion

### Categories Tab
- Existing category tree UI (migrated from FinanceCategories page)
- Parent/child hierarchy with add/edit/delete
- Category form with: name, icon, color, isIncome, parentCategory
- **Deletion warning:** If a category has active subscriptions, warn user (subscriptions will lose their category)

### Subscriptions Tab
- List of active and paused subscriptions with monthly cost summary
- Add/edit/delete subscription functionality
- Each subscription row shows: name, amount, frequency, next billing date, wallet, category, status

## 2. Transfer Transaction Type

### Transaction Type Reference

| `type` value | Meaning |
|---|---|
| 0 or null | Normal transaction (income or expense) |
| 1 | Transfer (primary — created by this app) |
| 3 | Transfer (legacy — imported from Cashew) |

Frontend treats type 1 and 3 identically for display. New transfers always use type = 1.

### Frontend Changes

Modify `TransactionForm` modal to add a third type toggle: **Income | Expense | Transfer**

When Transfer is selected, the form changes:
- **From Wallet** and **To Wallet** dropdowns (instead of single wallet)
- **Amount Sent** field (labeled with source wallet currency)
- **Amount Received** field (labeled with destination wallet currency)
- Same-currency transfers: Amount Received auto-fills and locks to match Amount Sent
- Different-currency transfers: both amounts are independently editable
- Info banner: "Creates 2 linked transactions: -€X from Source, +$Y to Destination"
- Category field hidden (transfers are uncategorized)

### Backend Changes

**New field on `FinanceTransaction`:**
- `linkedTransferId: string | null` — UUID pointing to the paired transaction
- `subscriptionId: string | null` — FK to FinanceSubscription (for generated transactions)

**Transfer creation via `POST /finance/transactions`:**
When the request includes `isTransfer: true`, `fromWalletId`, `toWalletId`, `amountSent`, `amountReceived`:
1. Validate: `fromWalletId !== toWalletId`, both wallets exist and belong to the account, amounts > 0, name and date are provided
2. Within a single DB transaction (QueryRunner):
   - Create transaction A: expense from source wallet (amount = amountSent, isIncome = false, type = 1)
   - Create transaction B: income to destination wallet (amount = amountReceived, isIncome = true, type = 1)
   - Link A.linkedTransferId = B.id and B.linkedTransferId = A.id
3. Both share the same name, date, and note
4. Return both transactions

**Editing transfers:** When editing a transfer transaction:
- Name, date, and note sync to both sides
- Amounts are independent (each side keeps its own amount for cross-currency)
- Wallet changes: update the respective side only
- All updates done within a DB transaction

**Deleting transfers:** Application-level cascade — `TransactionsService.remove()` checks for `linkedTransferId` and deletes both within a DB transaction. DB FK uses SET NULL as safety net.

**Summary endpoint:** `getSummary()` must exclude transfer transactions (type IN (1, 3)) from totalIncome/totalExpense calculations to avoid inflation.

**Transaction list query:** Include `linkedTransferId` in the SELECT so frontend can render transfer indicators.

**Display in transaction list:** Transfer transactions show a blue transfer icon and display "From → To" wallet names. Clicking opens the transfer form pre-filled.

## 3. Subscriptions

### Entity: `FinanceSubscription`

Table name: `finance_subscriptions` (matches existing plural convention; actual DB table will be `app_finance_subscriptions` with entity prefix)

```
id: UUID (PK)
accountId: UUID (FK → Account)
name: string (200 chars)
amount: decimal (12,2) — always positive
isIncome: boolean (default: false) — supports recurring income (salary, etc.)
frequency: enum — "weekly" | "monthly" | "yearly"
billingDay: number — day of week (1-7 for weekly) or day of month (1-31 for monthly)
billingMonth: number | null — month (1-12), required when frequency = "yearly"
wallet: FinanceWallet (nullable FK, SET NULL on delete)
category: FinanceCategory (nullable FK, SET NULL on delete)
isActive: boolean (default: true)
lastGeneratedDate: Date | null — tracks the most recent auto-generated transaction date
note: string | null
createdAt: Date
updatedAt: Date
```

Currency is derived from the subscription's wallet (no separate currency field). If wallet is null, subscription is paused for generation until a wallet is reassigned.

### Backend API

**CRUD endpoints:**
- `GET /finance/subscriptions` — list all subscriptions for account
- `GET /finance/subscriptions/:id` — get single subscription
- `POST /finance/subscriptions` — create subscription
- `PATCH /finance/subscriptions/:id` — update subscription
- `DELETE /finance/subscriptions/:id` — delete subscription

**Generation endpoint:**
- `POST /finance/subscriptions/generate` — generate all pending transactions for the current account
  - Checks each active subscription that has a wallet assigned
  - Calculates all missed billing dates since `lastGeneratedDate` (or subscription creation date)
  - For each billing date, checks if a transaction with the same `subscriptionId` and `transactionDate` already exists (idempotency)
  - Creates a transaction for each missed date that doesn't already exist
  - Updates `lastGeneratedDate`
  - All within a DB transaction with `SELECT ... FOR UPDATE` on the subscription row to prevent race conditions
  - Returns count of generated transactions

**Cron job:** Runs daily via `@nestjs/schedule`. Iterates all accounts with active subscriptions, generates pending transactions for each. Uses the same generation logic with row-level locking.

**Frontend catch-up:** The finance dashboard page calls `POST /finance/subscriptions/generate` on mount to catch up on any missed generations.

### Generated Transaction Properties

Transactions created from subscriptions:
- `name`: subscription name
- `amount`: subscription amount
- `isIncome`: subscription's `isIncome` value
- `wallet`: subscription's assigned wallet
- `category`: subscription's assigned category
- `transactionDate`: the billing date
- `subscriptionId`: FK back to the source subscription
- `note`: "Auto-generated from subscription: {name}"
- `type`: 0 (normal transaction)

### Subscription Form Modal

Fields:
- Name (text)
- Income/Expense toggle
- Amount (number)
- Frequency (select: Weekly / Monthly / Yearly)
- Billing day (number — contextual label changes: "Day of week" for weekly, "Day of month" for monthly/yearly)
- Billing month (select — only shown when frequency = "yearly")
- Wallet (select)
- Category (select — filtered by isIncome toggle)
- Note (optional text)
- Active toggle

## 4. Navigation Changes

### Routes
- Add: `/finance/settings` → `FinanceSettings` component
- Remove: `/finance/wallets` route
- Remove: `/finance/categories` route
- Keep: `/finance/transactions`, `/finance/import`, `/finance` (dashboard)

### Finance Dashboard
- Update "Wallets" and "Categories" navigation links to point to `/finance/settings` (with appropriate tab pre-selected via query param, e.g., `?tab=categories`)

## 5. Data Model Summary

### New Entity
- `FinanceSubscription` (see fields above)

### Modified Entity: `FinanceTransaction`
- Add `linkedTransferId: string | null` (self-referencing FK, SET NULL on delete)
- Add `subscriptionId: string | null` (FK to FinanceSubscription, SET NULL on delete)
- Add index on `(accountId, linkedTransferId)`
- Add index on `(subscriptionId, transactionDate)` for idempotency checks

### Migration
- Create `finance_subscriptions` table
- Add `linkedTransferId` column to existing transaction table
- Add `subscriptionId` column to existing transaction table
- Add foreign key constraints with SET NULL on delete
- Add indexes

## 6. Existing Code Reuse

- `CategoryIcon`, `CategoryPicker`, `IconPicker` — reused in subscription form
- `MonthNavigator` — unchanged
- `PeriodSelector` — unchanged
- Existing wallet CRUD service/controller — logic migrated into settings context
- Existing category tree service/controller — logic migrated into settings context
