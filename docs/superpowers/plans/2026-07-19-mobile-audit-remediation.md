# Mobile Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the approved mobile UI audit so Record's Android shell is task-first, readable, resilient, and consistent across every major module.

**Architecture:** Correct systemic defects in `record.css` and the native shell before changing route composition. Route changes reuse the existing register, summary, state, and navigation primitives; data behavior remains unchanged except for response validation, bounded loading, and recoverable errors.

**Tech Stack:** React 18, React Router, Vite, Playwright, Node test runner, Capacitor Android.

## Global Constraints

- Preserve Bookplate R, Sora, JetBrains Mono, graphite surfaces, and the violet action signal.
- Native controls use a 44px minimum interaction box and essential mobile text is 14px or larger.
- Do not introduce horizontal page scroll, nested cards, blocking optional notices, or duplicated primary actions.
- Keep desktop behavior intact unless the same defect affects both surfaces.
- Every changed behavior receives a failing contract test before production code.

---

### Task 1: Mobile foundation and shell

**Files:**
- Modify: `frontend/src/record.css`
- Modify: `frontend/src/components/Layout.jsx`
- Modify: `frontend/src/components/NativeUpdateGate.jsx`
- Test: `frontend/src/mobileAuditRemediation.test.mjs`

**Interfaces:**
- Consumes: `--record-touch`, `body.native-mobile-app`, `NativeUpdateGate({ nativeApp })`
- Produces: AA-safe secondary tokens, shared 44px native hit areas, desktop-only API status, non-blocking optional update notice

- [x] Write and run the failing foundation tests.
- [x] Replace low-contrast quiet/accent text roles and define the native type scale.
- [x] Apply the shared hit-area contract to native controls while preserving compact visual content.
- [x] Hide `ApiStatus` from native customer routes.
- [x] Render optional updates and post-install notes as dismissible notices; retain the gate only for required versions.
- [x] Run the focused tests until green.

### Task 2: Task-first route composition

**Files:**
- Modify: `frontend/src/pages/MobileMenu.jsx`
- Modify: `frontend/src/pages/Media/Media.jsx`
- Modify: `frontend/src/pages/Workout/Workout.jsx`
- Modify: `frontend/src/pages/Spotify/SpotifyRanking.jsx`
- Modify: `frontend/src/pages/Habits/Habits.jsx`
- Modify: `frontend/src/record.css`
- Test: `frontend/src/mobileAuditRemediation.test.mjs`

**Interfaces:**
- Consumes: existing `PageHeading`, `Register`, `SummaryStrip`, `SeriesRow`, and mobile navigation contracts
- Produces: one Records register, Series library-first layout, one Gym primary action, one native ranking list, user-facing Habits guidance

- [x] Run the route-composition contracts and confirm the expected failures.
- [x] Remove duplicate Records cards and retain the searchable grouped register.
- [x] Move Series summaries and consumption into a native-only collapsible insights section after the library.
- [x] Remove the duplicate native Gym header action and disclose maintenance tools below recent sessions.
- [x] Render one native Music ranking list and keep podium treatment on desktop only.
- [x] Replace design-commentary copy in Habits.
- [x] Verify the focused contracts.

### Task 3: Loading, empty, and error resilience

**Files:**
- Modify: `frontend/src/pages/Spotify/SpotifyPersonal.jsx`
- Modify: `frontend/src/pages/Workout/WorkoutExercises.jsx`
- Modify: `frontend/src/components/RouteErrorBoundary.jsx`
- Modify: `frontend/src/record.css`
- Test: `frontend/src/mobileAuditRemediation.test.mjs`

**Interfaces:**
- Consumes: Spotify socket events, workout collection endpoints, React error-boundary state
- Produces: bounded playback fallback, data-aware Music composition, validated collections, retry/back route recovery

- [x] Confirm each resilience contract fails for the intended reason.
- [x] Add a bounded currently-playing timeout with HTTP fallback and timer cleanup.
- [x] Collapse the empty Music dashboard to a single sync action instead of rendering empty charts and rankings.
- [x] Normalize workout exercise/category responses before array operations.
- [x] Reset the route boundary locally and provide a Back action.
- [x] Verify tests green and exercise error/empty states in Playwright.

### Task 4: Settings progressive disclosure

**Files:**
- Modify: `frontend/src/pages/Settings/Settings.jsx`
- Modify: `frontend/src/pages/Settings/Appearance.jsx`
- Modify: `frontend/src/pages/Settings/DataManagement.jsx`
- Modify: `frontend/src/pages/Settings/Account.jsx`
- Modify: `frontend/src/record.css`
- Test: `frontend/src/mobileAuditRemediation.test.mjs`

**Interfaces:**
- Consumes: `section=appearance`, native settings shell, existing appearance/module/widget/language components
- Produces: focused appearance panels selected through `panel=`, compact data rows, flatter account sections

- [x] Verify the focused-settings contract fails.
- [x] Add an Appearance index with Density, Modules, Widgets, and Language rows.
- [x] Render only the selected appearance panel and preserve a clear return path.
- [x] Remove nested mobile card framing from Account and Data.
- [x] Verify direct links, Android Back, and browser Back.

### Task 5: Responsive and performance hardening

**Files:**
- Modify: `frontend/src/record.css`
- Modify: affected Media/Music/Settings image elements
- Modify: route imports only where the production build proves a useful split
- Test: `frontend/tests/auth/native-app.spec.ts`

**Interfaces:**
- Produces: wrapping or select-based mobile filters, lazy below-fold imagery, no local overflow at 320px, stable first viewports

- [x] Add Playwright assertions for local overflow, 44px targets, and first-viewport primary actions.
- [x] Verify the assertions fail on the baseline.
- [x] Replace overflowing mobile tab/filter rows with wrapped controls or labelled selects.
- [x] Lazy-load below-fold artwork and preserve eager loading only for the first meaningful image.
- [x] Measure build chunks and remove ineffective dynamic-import patterns when safe.
- [x] Run mobile screenshots at 320px and 390px and correct remaining defects.

### Task 6: Release verification and delivery

**Files:**
- Update: `docs/product/MOBILE_UI_AUDIT_2026-07-19.md`
- Update: `docs/superpowers/plans/2026-07-19-mobile-audit-remediation.md`

- [x] Run all focused Node tests.
- [x] Run the native Playwright mobile suite.
- [x] Run the production Vite build and inspect chunk warnings.
- [x] Run `npm run android:prepare` and an Android debug build.
- [x] Inspect final mobile screenshots and document any device-only residual risk.
- [x] Stage the requested workspace changes, create a conventional commit, and push `main` to `origin`.
