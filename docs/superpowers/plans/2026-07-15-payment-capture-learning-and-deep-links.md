# Payment Capture Learning and Deep Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prefill detected card payments from the latest confirmed merchant classification and route notification taps to the exact pending review.

**Architecture:** Enrich pending suggestions on the backend from the newest account-owned accepted suggestion and its linked transaction. Keep preset validation and deep-link matching in focused frontend view-model helpers, and preserve the native local suggestion ID through the existing event-hash synchronization path.

**Tech Stack:** NestJS, TypeORM, React, React Router, Capacitor Android, Java, Node test runner, Jest.

---

### Task 1: Backend merchant-history enrichment

**Files:**
- Modify: `backend/src/finance/transaction-suggestions/transaction-suggestions.service.spec.ts`
- Modify: `backend/src/finance/transaction-suggestions/transaction-suggestions.service.ts`

- [x] **Step 1: Write the failing tests**

Add tests proving `findAll` returns a pending suggestion with `rememberedDefaults` from the newest same-account accepted suggestion, returns no defaults without a valid linked transaction, and never uses another merchant/account.

```ts
expect(result[0].rememberedDefaults).toEqual({
  name: 'Mercadona', walletId: 'wallet-1', categoryId: 'food',
  note: 'Weekly shop', source: 'merchant-history',
});
```

- [x] **Step 2: Run the test to verify RED**

Run: `cd backend && npm test -- transaction-suggestions.service.spec.ts --runInBand`
Expected: FAIL because `findAll` returns repository rows without enrichment.

- [x] **Step 3: Implement account-scoped enrichment**

Load pending rows, collect normalized merchants, load accepted same-account suggestions ordered by `decidedAt DESC` with `matchedTransaction`, keep the first valid match per merchant, and return plain response objects with editable remembered defaults. Do not persist copied wallet/category values on pending suggestions.

- [x] **Step 4: Run the focused backend test**

Run: `cd backend && npm test -- transaction-suggestions.service.spec.ts --runInBand`
Expected: PASS.

### Task 2: Frontend presets and exact suggestion resolution

**Files:**
- Modify: `frontend/src/pages/Finance/financeViewModel.test.mjs`
- Modify: `frontend/src/pages/Finance/financeViewModel.mjs`
- Modify: `frontend/src/pages/Finance/FinanceTransactions.jsx`
- Modify: `frontend/src/components/finance/PaymentCaptureSheet.jsx`

- [x] **Step 1: Write failing view-model tests**

Cover exact backend ID, exact event hash, event-hash suffix resolution, stale requested IDs, and preset removal when wallet/category IDs are no longer present.

```js
assert.equal(resolvePaymentSuggestion(suggestions, 'local-42').id, 'server-1')
assert.deepEqual(validateRememberedDefaults(defaults, wallets, categories), {
  ...defaults, walletId: '', categoryId: '',
})
```

- [x] **Step 2: Run the frontend test to verify RED**

Run: `cd frontend && node --test src/pages/Finance/financeViewModel.test.mjs`
Expected: FAIL because the resolver and validator do not exist.

- [x] **Step 3: Implement and connect helpers**

Use the resolver in the query-parameter effect. Pass validated remembered values into the sheet, initialize merchant/wallet/category/note from them, keep amount/time detected, and render “Remembered from your last confirmed payment here” when a preset is active.

- [x] **Step 4: Add stale-link fallback**

When loading finishes and a requested suggestion cannot be resolved, remove only `paymentSuggestionId`/`captureAction`, retain the ledger route, and show `That payment is no longer waiting for review.` above the pending register.

- [x] **Step 5: Run the focused frontend tests**

Run: `cd frontend && node --test src/pages/Finance/financeViewModel.test.mjs src/paymentCapture.test.mjs`
Expected: PASS.

### Task 3: Native notification deep-link contract

**Files:**
- Modify: `frontend/src/androidNativeShell.test.mjs`
- Modify: `frontend/android/app/src/main/java/com/adrianluerssen/personalserver/payments/PaymentNotificationListenerService.java`
- Modify: `frontend/android/app/src/main/java/com/adrianluerssen/personalserver/MainActivity.java`

- [x] **Step 1: Strengthen the failing native contract test**

Require the notification body and action intents to include `paymentSuggestionId`, and require MainActivity to build the exact finance review route plus a pending-review fallback.

- [x] **Step 2: Run the native contract test to verify RED**

Run: `cd frontend && node --test src/androidNativeShell.test.mjs`
Expected: FAIL on the missing stale-review fallback contract.

- [x] **Step 3: Implement stable routing**

Keep the content intent and Edit/Confirm actions on the same suggestion-specific route. MainActivity must dispatch the route after the bridge is ready and preserve the ID without auto-confirming.

- [x] **Step 4: Run native tests and Android build**

Run: `cd frontend && node --test src/androidNativeShell.test.mjs src/nativeIntegrations.test.mjs && npm run android:prepare && .\android\gradlew.bat -p android assembleDebug`
Expected: all tests PASS and Gradle reports `BUILD SUCCESSFUL`.

### Task 4: Full verification and delivery

**Files:**
- Modify: `docs/superpowers/plans/2026-07-15-payment-capture-learning-and-deep-links.md`

- [x] **Step 1: Run backend and frontend regression suites**

Run the focused Jest service suite, relevant Node contract suites, frontend production build, and Android debug build.

- [x] **Step 2: Mark completed plan steps**

Replace each unchecked box with `[x]` only after its associated command succeeds.

- [ ] **Step 3: Commit and push**

Commit the implementation with a conventional `feat:` message, push `main`, and monitor the Android APK release workflow through signed publication.
