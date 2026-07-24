# Cache-First Data Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make cached data render immediately and ordinary record mutations complete locally while a durable queue synchronizes with the slow hosted API.

**Architecture:** Extend the existing account-scoped response cache with stale preservation and subscriptions, add a bounded route preloader, and introduce an account-scoped durable mutation queue. Integrate the shared web contract into high-frequency record flows, then add native resume/online flushing and compact sync feedback.

**Tech Stack:** React 18, Vite, browser localStorage, Capacitor WebView, Node test runner.

## Global Constraints

- Do not add a third-party state-management dependency.
- Never queue authentication, password, MFA, import, catalog synchronization, or provider synchronization commands.
- Keep all persisted cache and mutation data account-scoped.
- Cached content must remain usable during backend latency or outage.
- Tests assert user-visible intended behavior, not source-string trivia.

---

### Task 1: Response cache semantics

**Files:**
- Modify: `frontend/src/apiCache.mjs`
- Modify: `frontend/src/apiCache.test.mjs`
- Modify: `frontend/src/api.js`

**Interfaces:**
- Produces: `markPrefixesStale(prefixes)`, `update(path, updater)`, `subscribe(path, listener)`.
- Consumes: existing `createApiResponseCache` account scoping.

- [ ] Write failing tests proving invalidation preserves stale data, updates persist, and subscribers receive fresh replacements.
- [ ] Run `node --test src/apiCache.test.mjs` and confirm the new assertions fail.
- [ ] Implement stale marking, immutable updates, LRU replacement, and TTL-aware background revalidation.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Route-aware preloading

**Files:**
- Create: `frontend/src/apiPreload.mjs`
- Create: `frontend/src/apiPreload.test.mjs`
- Modify: `frontend/src/api.js`
- Modify: `frontend/src/components/Layout.jsx`

**Interfaces:**
- Produces: `getPreloadPathsForRoute(pathname, preferences)`, `preloadRouteData(pathname, preferences)`, `preloadEnabledRouteData(preferences)`.
- Consumes: `api.get(path)` and module preferences.

- [ ] Write failing tests for Today, Cash, Gym, Habits, Music, and Series route manifests and disabled-module filtering.
- [ ] Run the focused test and confirm the manifest is missing.
- [ ] Implement the manifest, bounded idle warming, and pointer/focus/touch intent capture.
- [ ] Re-run the test and confirm it passes.

### Task 3: Durable optimistic mutation queue

**Files:**
- Create: `frontend/src/apiMutationQueue.mjs`
- Create: `frontend/src/apiMutationQueue.test.mjs`
- Modify: `frontend/src/api.js`

**Interfaces:**
- Produces: `queueApiMutation`, `flushApiMutations`, `retryFailedApiMutations`, `subscribeToApiMutations`, `getApiMutationSnapshot`.
- Queue entry: `{ id, accountId, method, path, body, prefixes, dedupeKey, status, attempts, createdAt, nextAttemptAt }`.

- [ ] Write failing tests for immediate enqueue, persistence, account isolation, ordered flush, deduplication, transient retry, and permanent failure.
- [ ] Run the focused test and confirm the queue module is missing.
- [ ] Implement the minimal queue and connect its executor to authenticated `apiFetch`.
- [ ] Re-run the tests and confirm they pass.

### Task 4: Web optimistic record flows

**Files:**
- Modify: `frontend/src/pages/Habits/Habits.jsx`
- Modify: `frontend/src/pages/Home.jsx`
- Modify: `frontend/src/pages/Workout/WorkoutActive.jsx`
- Modify: `frontend/src/pages/Workout/WorkoutHistory.jsx`
- Modify: `frontend/src/components/finance/TransactionForm.jsx`
- Modify: `frontend/src/pages/Media/Media.jsx`
- Add or modify focused model tests beside each affected domain.

**Interfaces:**
- Consumes: `queueApiMutation(...)`.
- Produces: immediate local state transitions and background `committed` reconciliation.

- [ ] Add failing interaction/model tests proving visible state changes before a delayed request resolves.
- [ ] Run the focused tests and verify their expected failures.
- [ ] Replace blocking ordinary record mutations with optimistic state plus queued synchronization.
- [ ] Keep command operations server-confirmed.
- [ ] Re-run domain tests and confirm they pass.

### Task 5: Web and native synchronization feedback

**Files:**
- Create: `frontend/src/components/product/MutationSyncState.jsx`
- Modify: `frontend/src/components/product/ProductHeader.jsx`
- Modify: `frontend/src/components/Layout.jsx`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/tests/auth/native-app.spec.ts`

**Interfaces:**
- Consumes: mutation queue snapshot/subscription/retry.
- Produces: compact accessible Saved/Saving/Queued/Needs attention state.

- [ ] Add a failing component/native contract test for queue state and retry.
- [ ] Implement web header feedback, native compact feedback, and online/focus/visibility flushing.
- [ ] Re-run the focused native test.

### Task 6: Verification and documentation

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `README.md`

**Interfaces:**
- Documents: cache freshness, queue guarantees, non-queueable command operations, and account isolation.

- [ ] Run all cache, preload, queue, and affected domain tests.
- [ ] Run a delayed-network browser check proving cached first render and immediate mutations.
- [ ] Run the Vite production build with `npx vite build --clearScreen false`.
- [ ] Run `git diff --check`.
- [ ] Record residual risks without claiming unverified results.
