# Complete Premium Interface Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the superficial theme overlay with the approved purpose-built Personal Record web and Android interfaces, including coherent navigation, interaction states, responsive behavior, and a landing page derived from the finished product.

**Architecture:** Keep React 18, React Router, vanilla CSS, existing APIs, cache-first behavior, and native bridges. Remove the broad override stylesheet, establish explicit shell and working-surface primitives, and migrate each route to domain-owned markup and CSS. Container components retain fetching and mutations; focused view-model modules and presentational components define behavior and rendering contracts.

**Tech Stack:** React 18, Vite, React Router, vanilla CSS, Chart.js, Node test runner, Playwright, Capacitor, Android Gradle.

## Global Constraints

- The approved sources of truth are `docs/superpowers/specs/2026-07-13-premium-ui-redesign-design.md`, `docs/superpowers/specs/2026-07-13-premium-product-redesign-design.md`, and `docs/product/CORRECTIVE_UX_AUDIT.md`.
- Preserve API, cache, module-preference, analytics, native payment, Health Connect, widget, Android back, and authentication contracts.
- Do not reintroduce synthetic life scores, equal-weight dashboard card walls, broad class-substring selectors, copied reference branding, or visual-only controls.
- Mobile keeps Today, Apps, Capture, Assistant, and You as the five stable global destinations.
- Every new behavior follows red-green-refactor and every route is verified at 320, 390, 768, 1024, and 1440 pixels.

---

### Task 1: Make the design contract enforce structure

**Files:**
- Modify: `frontend/src/designSystem.test.mjs`
- Create: `frontend/src/product/interfaceContracts.mjs`
- Create: `frontend/src/product/interfaceContracts.test.mjs`
- Modify: `frontend/src/main.jsx`
- Delete: `frontend/src/styles/premium-overrides.css`
- Modify: `docs/product/BRAND_PROFILE.md`
- Modify: `docs/product/UX_AUDIT_RESULTS.md`

**Interfaces:**
- Produces: `DOMAIN_SURFACES`, `GLOBAL_NAVIGATION`, and `assertNoLegacyOverrideImport(source)` for design-contract tests.
- Consumes: existing product metadata from `frontend/src/product/brand.mjs` and navigation metadata from `frontend/src/product/navigation.mjs`.

- [ ] Add failing tests that reject `premium-overrides.css`, broad `[class*='...']` selectors, synthetic daily-score copy, conflicting warm-paper brand rules, and legacy E2E assertions for stat-card grids.
- [ ] Run `node --test src/designSystem.test.mjs src/product/interfaceContracts.test.mjs` and confirm failures name each obsolete contract.
- [ ] Implement the explicit interface contract, remove the override import/file, and reconcile brand and audit documentation with the approved graphite instrument direction.
- [ ] Run the focused tests and the full frontend Node suite.
- [ ] Commit as `refactor(ui): remove superficial theme layer`.

### Task 2: Rebuild global and local navigation

**Files:**
- Modify: `frontend/src/components/Layout.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/components/product/MobileGlobalNav.jsx`
- Modify: `frontend/src/components/product/DomainNav.jsx`
- Modify: `frontend/src/components/product/CaptureSheet.jsx`
- Create: `frontend/src/components/product/ProductHeader.jsx`
- Create: `frontend/src/components/product/ProductShellState.mjs`
- Create: `frontend/src/components/product/ProductShellState.test.mjs`
- Modify: `frontend/src/styles/shell.css`
- Modify: `frontend/src/styles/primitives.css`
- Modify: `frontend/tests/auth/native-app.spec.ts`

**Interfaces:**
- Produces: `getProductHeader(pathname)`, `getBackTarget(pathname, search)`, and a single `ProductHeader` contract for web and native.
- Consumes: `GLOBAL_DESTINATIONS`, `getDomainNavigation`, feature preferences, sync state, capture actions, and native back destinations.

- [ ] Add failing unit and Playwright assertions for one active global destination, no redundant mobile Apps/settings controls, stable local tabs, Escape focus return, and Android back order.
- [ ] Verify the tests fail against the current duplicated header/app-switcher implementation.
- [ ] Split synchronization/background effects from visual shell rendering, implement one compact product header, simplify the desktop rail, and make capture a correctly trapped bottom sheet.
- [ ] Verify keyboard, focus, 44px targets, safe-area insets, and no horizontal overflow.
- [ ] Commit as `feat(ui): rebuild product navigation`.

### Task 3: Replace Today's synthetic dashboard with a daily brief

**Files:**
- Modify: `frontend/src/pages/Home.jsx`
- Modify: `frontend/src/pages/Home/todayModel.mjs`
- Modify: `frontend/src/pages/Home/todayModel.test.mjs`
- Replace: `frontend/src/pages/Home/components/DailyBrief.jsx`
- Replace: `frontend/src/pages/Home/components/ActionTimeline.jsx`
- Create: `frontend/src/pages/Home/components/ActiveRecordStrip.jsx`
- Create: `frontend/src/pages/Home/components/RecentRecordFeed.jsx`
- Modify: `frontend/src/styles/domains/today.css`
- Modify: `frontend/tests/dashboard/home.spec.ts`
- Modify: `frontend/tests/auth/native-app.spec.ts`

**Interfaces:**
- Produces: `buildTodayBrief({ habits, activeWorkout, paymentSuggestions, recentRecords, sync })` returning `urgent`, `active`, `recent`, and `sync` sections without an aggregate score.
- Consumes: existing dashboard/mobile snapshot and desktop domain endpoints.

- [ ] Add failing tests proving unresolved payment reviews and active workouts lead, habits expose direct completion, passive records remain secondary, and no score is fabricated.
- [ ] Implement a date-and-sync header, actionable queue, active-record strip, recent cross-domain feed, and evidence-backed Assistant handoff.
- [ ] Verify optimistic habit completion rollback, offline copy, empty day, partial data, and long labels.
- [ ] Commit as `feat(today): build action-first daily brief`.

### Task 4: Make Cash one coherent ledger workflow

**Files:**
- Modify: `frontend/src/pages/Finance/Finance.jsx`
- Modify: `frontend/src/pages/Finance/FinanceTransactions.jsx`
- Modify: `frontend/src/pages/Finance/FinanceBudgets.jsx`
- Modify: `frontend/src/pages/Finance/FinanceTrends.jsx`
- Modify: `frontend/src/pages/Finance/financeViewModel.mjs`
- Modify: `frontend/src/pages/Finance/financeViewModel.test.mjs`
- Modify: `frontend/src/pages/Finance/nativeFinanceComponents.jsx`
- Modify: `frontend/src/components/finance/TransactionForm.jsx`
- Modify: `frontend/src/components/finance/PaymentCaptureSheet.jsx`
- Modify: `frontend/src/styles/domains/cash.css`
- Modify: `frontend/tests/finance/transactions.spec.ts`
- Modify: `frontend/tests/auth/native-app.spec.ts`

**Interfaces:**
- Produces: one date-grouped `Ledger`, one `TransactionSheet`, and one `PaymentReview` interaction used across web and native.
- Consumes: existing transaction, summary, wallet, category, budget, trend, and suggestion APIs.

- [ ] Add failing tests for month navigation, grouped rows, visible wallet/category provenance, edit-in-place sheet behavior, review/ignore/confirm, optimistic ledger insertion, and undo/error recovery.
- [ ] Replace overview-card navigation with the ledger root and adjacent desktop review context; keep compact native filters and keypad entry.
- [ ] Verify empty ledger, long merchant names, transfers, multiple currencies, keyboard form flow, and 320px entry.
- [ ] Commit as `feat(cash): unify ledger and capture flows`.

### Task 5: Make Gym a dedicated training workbench

**Files:**
- Modify: `frontend/src/pages/Workout/Workout.jsx`
- Modify: `frontend/src/pages/Workout/WorkoutActive.jsx`
- Modify: `frontend/src/pages/Workout/WorkoutHistory.jsx`
- Modify: `frontend/src/pages/Workout/WorkoutExercises.jsx`
- Modify: `frontend/src/pages/Workout/WorkoutBodyweight.jsx`
- Modify: `frontend/src/pages/Workout/workoutViewModel.mjs`
- Modify: `frontend/src/pages/Workout/workoutViewModel.test.mjs`
- Modify: `frontend/src/pages/Workout/components/ExerciseBlock.jsx`
- Modify: `frontend/src/pages/Workout/components/SetEditorRow.jsx`
- Modify: `frontend/src/styles/domains/gym.css`
- Modify: `frontend/tests/workout/overview.spec.ts`
- Modify: `frontend/tests/auth/native-app.spec.ts`

**Interfaces:**
- Produces: `TrainingToday`, `ActiveSessionWorkbench`, `ExerciseHistory`, and `ProgressWorkspace` presentations.
- Consumes: existing workout session, routine, exercise, bodyweight, record, timer, and live-step APIs.

- [ ] Add failing tests for start/continue priority, previous-set defaults, direct weight/reps entry, one-tap completion, undo, rest timer, notes, reorder affordance, and offline continuation.
- [ ] Replace the analytics-first overview with today's routine/session state and rebuild active logging around exercise blocks and stable set rows.
- [ ] Keep history, exercises, and progress dense on desktop and task-focused on mobile.
- [ ] Commit as `feat(gym): rebuild training workbench`.

### Task 6: Make Series season-aware and continuity-aware visually

**Files:**
- Modify: `frontend/src/pages/Media/Media.jsx`
- Modify: `frontend/src/pages/Media/SeriesDetail.jsx`
- Modify: `frontend/src/pages/Media/SeriesSeasonList.jsx`
- Modify: `frontend/src/pages/Media/AnimeContinuity.jsx`
- Modify: `frontend/src/pages/Media/seriesViewModel.mjs`
- Modify: `frontend/src/pages/Media/seriesViewModel.test.mjs`
- Modify: `frontend/src/pages/Media/Media.css`
- Modify: `frontend/tests/auth/native-app.spec.ts`

**Interfaces:**
- Produces: status-grouped library rows, TV season/episode navigation, and separate anime release continuity.
- Consumes: the existing structured series catalog and provider metadata.

- [ ] Add failing tests for concrete season/episode position, next episode action, completion boundaries, TV season grouping, separate anime releases, continuity order, missing artwork, and provider provenance.
- [ ] Replace generic media cards with dense status lanes and title rows; rebuild detail as artwork/facts plus explicit season or continuity navigation.
- [ ] Verify large libraries, narrow tabs, long titles, unknown episode totals, completed shows, and offline cached catalog data.
- [ ] Commit as `feat(series): rebuild structured watch workflow`.

### Task 7: Refine Habits and Music without flattening them

**Files:**
- Modify: `frontend/src/pages/Habits/Habits.jsx`
- Modify: `frontend/src/pages/Habits/Habits.css`
- Modify: `frontend/src/pages/Habits/habitViewModel.mjs`
- Modify: `frontend/src/pages/Habits/habitViewModel.test.mjs`
- Modify: `frontend/src/pages/Spotify/SpotifyPersonal.jsx`
- Modify: `frontend/src/pages/Spotify/SpotifyRanking.jsx`
- Modify: `frontend/src/pages/Spotify/SpotifyGlobal.jsx`
- Modify: `frontend/src/styles/domains/spotify.css`
- Modify: `frontend/tests/habits/habits.spec.ts`
- Modify: `frontend/tests/spotify/personal.spec.ts`

**Interfaces:**
- Produces: one selected-day habit register and one shared Spotify timeframe/ranking grammar.
- Consumes: existing habit entry/undo and Spotify artwork/ranking helpers.

- [ ] Add failing behavior tests for dominant habit completion, deliberate skip/miss, numeric value save, immediate undo, timeframe persistence, rank movement text, artwork fallback, and source/error states.
- [ ] Simplify Habits to a register plus progressive history and reshape Music around listener identity, artwork-led ranks, distribution, and recent listening.
- [ ] Verify both at all target widths and with missing data.
- [ ] Commit as `feat(ui): refine habits and music instruments`.

### Task 8: Rebuild Assistant, settings, auth, and utility states

**Files:**
- Modify: `frontend/src/components/ChatPanel.jsx`
- Modify: `frontend/src/components/ChatPanel.css`
- Modify: `frontend/src/pages/Chat/ChatPage.jsx`
- Modify: `frontend/src/pages/Settings/Settings.jsx`
- Modify: `frontend/src/pages/Settings/Account.jsx`
- Modify: `frontend/src/pages/Settings/Connections.jsx`
- Modify: `frontend/src/pages/Settings/Appearance.jsx`
- Modify: `frontend/src/pages/Settings/DataManagement.jsx`
- Modify: `frontend/src/pages/Auth/Login.jsx`
- Modify: `frontend/src/pages/Auth/Register.jsx`
- Modify: `frontend/src/styles/base.css`
- Modify: `frontend/tests/chat/panel.spec.ts`
- Modify: `frontend/tests/settings/*.spec.ts`
- Modify: `frontend/tests/auth/login.spec.ts`
- Modify: `frontend/tests/auth/register.spec.ts`

**Interfaces:**
- Produces: full Assistant workspace, shared settings index/detail rows, and consistent auth/state surfaces.
- Consumes: existing conversation, provenance, preference, connection, account, and authentication APIs.

- [ ] Add failing tests for visible provenance, pending/failure/retry, conversation navigation, settings location, row-contained controls, inline validation, focus return, and responsive auth.
- [ ] Remove the competing floating desktop Assistant pattern, build one analysis workspace, and normalize settings/auth/disabled/offline/error/import states.
- [ ] Verify keyboard-only flows, 200% zoom, long labels, and reduced motion.
- [ ] Commit as `feat(ui): unify assistant and account surfaces`.

### Task 9: Rebuild landing from the finished application

**Files:**
- Modify: `frontend/src/pages/Landing.jsx`
- Modify: `frontend/src/pages/Landing.css`
- Create: `frontend/src/pages/landing/ProductStage.jsx`
- Create: `frontend/src/pages/landing/DomainProof.jsx`
- Modify: `frontend/tests/auth/landing.spec.ts`
- Modify: `frontend/tests/responsive/viewports.spec.ts`
- Modify: `frontend/tests/visual-regression/pages.spec.ts`

**Interfaces:**
- Produces: a public product stage composed from the final shell and domain presentation grammar.
- Consumes: final product tokens, brand, representative non-sensitive demo records, hosted/self-hosted copy, and legal navigation.

- [ ] Add failing tests for actual product workflow evidence, managed/self-hosted clarity, honest privacy copy, primary actions, legal/repository navigation, and responsive first viewport.
- [ ] Replace the simplified fake dashboard with a faithful composition of Today, Cash review, Gym logging, and Series continuation.
- [ ] Capture desktop/mobile baselines only after the authenticated product passes visual review.
- [ ] Commit as `feat(landing): present the finished product`.

### Task 10: Full interaction and release verification

**Files:**
- Modify: `frontend/tests/auth/native-app.spec.ts`
- Modify: `frontend/tests/visual-regression/pages.spec.ts`
- Modify: `docs/product/UX_AUDIT_RESULTS.md`
- Modify: `docs/product/RELEASE_READINESS.md`

**Interfaces:**
- Produces: an evidence matrix mapping every approved requirement to a test, screenshot, or documented external dependency.

- [ ] Run the full frontend Node suite and backend suite.
- [ ] Run focused Playwright journeys for Today, Cash, Habits, Gym, Music, Series, Assistant, settings, auth, and landing with one worker.
- [ ] Capture and inspect every major surface at 320x720, 390x844, 768x1024, 1024x768, and 1440x900.
- [ ] Walk pointer, keyboard, Escape, Android back, focus return, reduced motion, offline, loading, empty, error, success, undo, long-content, and 200% zoom states.
- [ ] Run production frontend/backend builds, `npx cap sync android`, and Android debug assembly.
- [ ] Update the audit and readiness documents only with observed evidence.
- [ ] Commit as `test: verify complete premium interface`.

## Plan self-review

- Every approved domain and public/utility surface has a structural migration task.
- The landing page is explicitly last.
- The global override layer and contradictory documentation are removed first.
- Each behavior change starts with a failing test and includes responsive/accessibility verification.
- Backend and native contracts remain unchanged unless a failing integration test proves a presentation boundary requires adjustment.
