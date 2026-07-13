# Premium Product Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the complete Personal Server web and Android experience as a cohesive premium suite of personal instruments, then finish with a reliable contactless-payment capture flow.

**Architecture:** Preserve the React/Vite, Capacitor, NestJS, and PostgreSQL stack while separating visual tokens, shell primitives, domain views, and pure interaction logic. Keep current APIs stable where they already represent the required data, introduce explicit contracts only for missing behavior, and retain cache-first rendering with an observable optimistic-write queue.

**Tech Stack:** React 18, React Router 6, Vite 5, vanilla layered CSS, Capacitor 8, NestJS 9, TypeORM, PostgreSQL, Node test runner, Playwright, Gradle/Android.

---

## File structure

New shared files:

- `frontend/src/product/brand.mjs`: customer-facing name tokens and domain metadata.
- `frontend/src/product/navigation.mjs`: stable global and local navigation contracts.
- `frontend/src/product/capture.mjs`: capture action availability and recent-action ordering.
- `frontend/src/components/product/BrandMark.jsx`: reusable accessible product mark.
- `frontend/src/components/product/MobileGlobalNav.jsx`: five-destination native navigation.
- `frontend/src/components/product/DomainNav.jsx`: compact local navigation.
- `frontend/src/components/product/CaptureSheet.jsx`: central capture chooser.
- `frontend/src/components/product/RecordList.jsx`: grouped record and timeline primitives.
- `frontend/src/components/product/SyncState.jsx`: cache, queue, retry, and conflict feedback.
- `frontend/src/styles/tokens.css`: semantic brand, type, spacing, motion, and elevation tokens.
- `frontend/src/styles/base.css`: reset, typography, focus, and document defaults.
- `frontend/src/styles/shell.css`: desktop and native shells.
- `frontend/src/styles/primitives.css`: shared product primitives.
- `frontend/src/styles/domains/*.css`: domain-owned styles.

New or extracted domain files:

- `frontend/src/pages/Workout/components/*`: workout today, active logger, set row, and history views.
- `frontend/src/pages/Habits/components/*`: today rows, plan, history, and insights views.
- `frontend/src/pages/Finance/components/*`: ledger, transaction composer, budget rows, and analysis views.
- `frontend/src/pages/Media/components/*`: Series status lists, progress controls, detail sheet, and discovery.
- `frontend/src/pages/Spotify/components/*`: range control, ranked artwork rows, listening clock, and comparisons.
- `frontend/src/pages/Home/components/*`: daily brief and actionable timeline.

Payment-capture files:

- `frontend/src/paymentCapture.mjs`: normalized event, deduplication, confidence, and local-rule logic.
- `frontend/src/paymentCapture.test.mjs`: behavior tests for the capture pipeline.
- `frontend/src/components/finance/PaymentCaptureSheet.jsx`: focused confirmation and correction.
- `backend/src/finance/dto/payment-suggestion.dto.ts`: validated suggestion payload contract.
- `backend/src/finance/payment-suggestion.service.ts`: idempotent suggestion acceptance and state transitions.
- `backend/src/finance/payment-suggestion.service.spec.ts`: backend behavior tests.
- Android notification-listener sources under the existing `frontend/android/app/src/main` package: package adapters, normalization, notification actions, and local persistence.

## Task 1: Brand foundation and CSS architecture

**Files:**
- Create: `frontend/src/product/brand.mjs`
- Create: `frontend/src/product/brand.test.mjs`
- Create: `frontend/src/components/product/BrandMark.jsx`
- Create: `frontend/src/styles/tokens.css`
- Create: `frontend/src/styles/base.css`
- Create: `frontend/src/styles/shell.css`
- Create: `frontend/src/styles/primitives.css`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/main.jsx`
- Modify: `frontend/index.html`
- Modify: `DESIGN.md`

- [ ] **Step 1: Write the failing brand-contract test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { PRODUCT, DOMAINS } from './product/brand.mjs'

test('customer brand is independent from the repository name', () => {
  assert.equal(PRODUCT.repositoryName, 'Personal Server')
  assert.notEqual(PRODUCT.displayName, PRODUCT.repositoryName)
  assert.match(PRODUCT.promise, /records/i)
})

test('every customer domain has a stable tone and label', () => {
  assert.deepEqual(Object.keys(DOMAINS), ['today', 'gym', 'habits', 'cash', 'spotify', 'series', 'assistant'])
  for (const domain of Object.values(DOMAINS)) {
    assert.match(domain.label, /\S/)
    assert.match(domain.tone, /^[a-z-]+$/)
  }
})
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `cd frontend && node --test src/product/brand.test.mjs`

Expected: FAIL because `src/product/brand.mjs` does not exist.

- [ ] **Step 3: Implement the brand contract and layered imports**

```js
export const PRODUCT = Object.freeze({
  repositoryName: 'Personal Server',
  displayName: 'Personal Record',
  shortName: 'Record',
  promise: 'Your records, kept useful.',
})

export const DOMAINS = Object.freeze({
  today: { label: 'Today', tone: 'oxide' },
  gym: { label: 'Gym', tone: 'moss' },
  habits: { label: 'Habits', tone: 'iris' },
  cash: { label: 'Cash', tone: 'ochre' },
  spotify: { label: 'Spotify', tone: 'cobalt' },
  series: { label: 'Series', tone: 'mulberry' },
  assistant: { label: 'Assistant', tone: 'slate' },
})
```

`frontend/src/styles.css` becomes the compatibility entry point and imports the new layers before remaining legacy rules:

```css
@import './styles/tokens.css';
@import './styles/base.css';
@import './styles/shell.css';
@import './styles/primitives.css';
```

The initial tokens must define both light and dark semantic values, oxide brand accent, domain tones, tabular numerals, 44px touch size, focus ring, motion durations, and reduced-motion overrides. `BrandMark` must render a custom inline SVG mark with an accessible text alternative when it is the only brand label.

- [ ] **Step 4: Verify brand contracts and build**

Run: `cd frontend && node --test src/product/brand.test.mjs && npx vite build --clearScreen false`

Expected: brand tests PASS and Vite completes without missing imports.

- [ ] **Step 5: Commit the brand foundation**

```powershell
git add frontend/src/product frontend/src/components/product/BrandMark.jsx frontend/src/styles frontend/src/styles.css frontend/src/main.jsx frontend/index.html DESIGN.md
git commit -m "feat: establish premium brand system"
```

## Task 2: Stable shell, navigation, capture, and sync feedback

**Files:**
- Create: `frontend/src/product/navigation.mjs`
- Create: `frontend/src/product/navigation.test.mjs`
- Create: `frontend/src/product/capture.mjs`
- Create: `frontend/src/product/capture.test.mjs`
- Create: `frontend/src/components/product/MobileGlobalNav.jsx`
- Create: `frontend/src/components/product/DomainNav.jsx`
- Create: `frontend/src/components/product/CaptureSheet.jsx`
- Create: `frontend/src/components/product/SyncState.jsx`
- Modify: `frontend/src/components/Layout.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/nativeNavigation.mjs`
- Modify: `frontend/src/styles/shell.css`
- Modify: `frontend/src/styles/primitives.css`
- Test: `frontend/src/nativeNavigation.test.mjs`
- Test: `frontend/tests/auth/native-app.spec.ts`

- [ ] **Step 1: Write shell-contract tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { GLOBAL_DESTINATIONS, getDomainNavigation } from './product/navigation.mjs'
import { getCaptureActions } from './product/capture.mjs'

test('native shell always exposes five stable global destinations', () => {
  assert.deepEqual(GLOBAL_DESTINATIONS.map((item) => item.id), ['today', 'apps', 'capture', 'assistant', 'you'])
})

test('gym local navigation does not replace global navigation', () => {
  assert.deepEqual(getDomainNavigation('/workout').map((item) => item.label), ['Today', 'Active', 'History', 'Exercises', 'Progress'])
})

test('capture actions respect enabled modules and keep recent action stable', () => {
  const actions = getCaptureActions({ enabled: ['finance', 'training'], recent: ['transaction'] })
  assert.deepEqual(actions.map((item) => item.id), ['transaction', 'workout', 'bodyweight', 'note'])
})
```

- [ ] **Step 2: Run focused tests and confirm failures**

Run: `cd frontend && node --test src/product/navigation.test.mjs src/product/capture.test.mjs src/nativeNavigation.test.mjs`

Expected: FAIL on missing product navigation and capture modules.

- [ ] **Step 3: Implement the contracts and shell components**

`MobileGlobalNav` renders real links for Today, Apps, Assistant, and You plus a button for Capture. `CaptureSheet` is a labelled dialog with focus return, Escape handling, 44px rows, and route actions. `DomainNav` renders the current domain routes as a compact horizontally wrapping control; it must not introduce horizontal page scroll. `SyncState` exposes queued, syncing, failed, conflict, and fresh states using icon, label, and action rather than color alone.

`Layout.jsx` owns capture-sheet state and renders global navigation for every authenticated native route. `Sidebar.jsx` remains the desktop rail only. `nativeNavigation.mjs` retains back-navigation helpers but stops generating domain-specific bottom navigation.

- [ ] **Step 4: Add Playwright assertions for stable mobile navigation**

```ts
await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
await expect(page.getByRole('link', { name: 'Today' })).toBeVisible()
await expect(page.getByRole('button', { name: 'Capture' })).toBeVisible()
await expect(page.getByRole('link', { name: 'You' })).toBeVisible()
```

- [ ] **Step 5: Run shell tests and focused native Playwright coverage**

Run: `cd frontend && node --test src/product/navigation.test.mjs src/product/capture.test.mjs src/nativeNavigation.test.mjs && npx playwright test tests/auth/native-app.spec.ts --project=chromium -g "navigation|tabbar|capture" --workers=1 --reporter=list`

Expected: unit tests PASS and focused native navigation cases PASS.

- [ ] **Step 6: Commit the shell**

```powershell
git add frontend/src/product frontend/src/components/product frontend/src/components/Layout.jsx frontend/src/components/Sidebar.jsx frontend/src/nativeNavigation.mjs frontend/src/styles frontend/tests/auth/native-app.spec.ts
git commit -m "feat: rebuild product navigation shell"
```

## Task 3: Today timeline and Assistant provenance

**Files:**
- Create: `frontend/src/pages/Home/todayModel.mjs`
- Create: `frontend/src/pages/Home/todayModel.test.mjs`
- Create: `frontend/src/pages/Home/components/DailyBrief.jsx`
- Create: `frontend/src/pages/Home/components/ActionTimeline.jsx`
- Create: `frontend/src/components/product/RecordList.jsx`
- Modify: `frontend/src/pages/Home.jsx`
- Modify: `frontend/src/pages/Chat/ChatPage.jsx`
- Modify: `frontend/src/components/ChatPanel.jsx`
- Modify: `backend/src/dashboard/*`
- Modify: `frontend/src/styles/domains/today.css`
- Modify: `frontend/src/styles/domains/assistant.css`

- [ ] **Step 1: Write the daily-priority behavior test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTodayItems } from './todayModel.mjs'

test('unresolved records and active work appear before passive summaries', () => {
  const items = buildTodayItems({
    activeWorkout: { id: 'w1' },
    habitsDue: [{ id: 'h1' }],
    paymentSuggestions: [{ id: 'p1', status: 'pending' }],
    recentStreams: [{ id: 's1' }],
  })
  assert.deepEqual(items.map((item) => item.kind), ['payment-review', 'active-workout', 'habit-due', 'recent-stream'])
})
```

- [ ] **Step 2: Run the test and confirm the missing model failure**

Run: `cd frontend && node --test src/pages/Home/todayModel.test.mjs`

Expected: FAIL because `todayModel.mjs` is missing.

- [ ] **Step 3: Implement Today as brief plus timeline**

Build a pure `buildTodayItems` projection that accepts cached domain data and returns stable priority, accessible label, destination, and timestamp fields. `Home.jsx` orchestrates data and renders `DailyBrief` plus `ActionTimeline`; remove decorative quick-action grids and zero-value cards. Assistant messages include a compact provenance region listing date range and contributing domain records. The floating desktop chat panel becomes a launcher into the full Assistant rather than a competing miniature interface.

- [ ] **Step 4: Run model tests, dashboard tests, and build**

Run: `cd frontend && node --test src/pages/Home/todayModel.test.mjs src/aiNotifications.test.mjs && npx vite build --clearScreen false`

Expected: tests PASS and build succeeds.

- [ ] **Step 5: Commit Today and Assistant**

```powershell
git add frontend/src/pages/Home* frontend/src/pages/Chat frontend/src/components/ChatPanel* frontend/src/components/product/RecordList.jsx frontend/src/styles/domains backend/src/dashboard
git commit -m "feat: make today action focused"
```

## Task 4: Gym workout-first redesign

**Files:**
- Create: `frontend/src/pages/Workout/workoutViewModel.mjs`
- Create: `frontend/src/pages/Workout/workoutViewModel.test.mjs`
- Create: `frontend/src/pages/Workout/components/WorkoutToday.jsx`
- Create: `frontend/src/pages/Workout/components/ActiveSession.jsx`
- Create: `frontend/src/pages/Workout/components/ExerciseBlock.jsx`
- Create: `frontend/src/pages/Workout/components/SetEditorRow.jsx`
- Create: `frontend/src/pages/Workout/components/WorkoutHistoryList.jsx`
- Modify: `frontend/src/pages/Workout/Workout.jsx`
- Modify: `frontend/src/pages/Workout/WorkoutActive.jsx`
- Modify: `frontend/src/pages/Workout/WorkoutHistory.jsx`
- Modify: `frontend/src/pages/Workout/WorkoutExercises.jsx`
- Modify: `frontend/src/pages/Workout/WorkoutBodyweight.jsx`
- Modify: `frontend/src/styles/domains/gym.css`
- Test: `frontend/src/workoutSteps.test.mjs`
- Test: `frontend/tests/auth/native-app.spec.ts`

- [ ] **Step 1: Write failing tests for set defaults and optimistic completion**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createNextSet, completeSetOptimistically } from './workoutViewModel.mjs'

test('new set copies the latest completed weight and reps', () => {
  const next = createNextSet([{ weight: 80, reps: 8, completed: true }])
  assert.deepEqual(next, { weight: 80, reps: 8, completed: false, kind: 'working' })
})

test('optimistic completion preserves an undo snapshot', () => {
  const result = completeSetOptimistically({ id: 's1', completed: false })
  assert.equal(result.current.completed, true)
  assert.equal(result.undo.completed, false)
})
```

- [ ] **Step 2: Run the model test and verify failure**

Run: `cd frontend && node --test src/pages/Workout/workoutViewModel.test.mjs`

Expected: FAIL on the missing model.

- [ ] **Step 3: Implement focused Gym views**

Extract orchestration from the oversized pages. The active route renders exercise blocks with column-aligned Previous, Weight, Reps/Time, and Complete controls. Set completion updates immediately, queues the API write, starts the rest timer, and offers undo. Routine/start actions live on Gym Today. History uses date-grouped rows and a detail pane/sheet. Progress owns personal records and bodyweight charts.

- [ ] **Step 4: Add intended-behavior Playwright flow**

The test starts a workout, adds an exercise, enters weight and reps, completes the set, verifies the completed state and queued/synced feedback, then undoes once. Locators use roles and labels.

- [ ] **Step 5: Run Gym tests and build**

Run: `cd frontend && node --test src/pages/Workout/workoutViewModel.test.mjs src/workoutSteps.test.mjs && npx playwright test tests/auth/native-app.spec.ts --project=chromium -g "workout|training" --workers=1 --reporter=list && npx vite build --clearScreen false`

Expected: unit tests and focused native Gym cases PASS; build succeeds.

- [ ] **Step 6: Commit Gym**

```powershell
git add frontend/src/pages/Workout frontend/src/styles/domains/gym.css frontend/src/workoutSteps* frontend/tests/auth/native-app.spec.ts
git commit -m "feat: rebuild gym logging flows"
```

## Task 5: Habits refinement

**Files:**
- Create: `frontend/src/pages/Habits/habitViewModel.mjs`
- Create: `frontend/src/pages/Habits/habitViewModel.test.mjs`
- Create: `frontend/src/pages/Habits/components/HabitTodayRow.jsx`
- Create: `frontend/src/pages/Habits/components/HabitPlan.jsx`
- Create: `frontend/src/pages/Habits/components/HabitHistory.jsx`
- Create: `frontend/src/pages/Habits/components/HabitInsights.jsx`
- Modify: `frontend/src/pages/Habits/Habits.jsx`
- Modify: `frontend/src/pages/Habits/Habits.css`
- Modify: `frontend/src/pages/Habits/HabitsSettings.jsx`
- Test: `frontend/tests/auth/native-app.spec.ts`

- [ ] **Step 1: Write failing cadence and undo tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { formatCadenceStreak, applyHabitStatus } from './habitViewModel.mjs'

test('weekly streaks name fulfilled weeks', () => {
  assert.equal(formatCadenceStreak({ cadence: 'weekly', count: 4 }), '4 fulfilled weeks')
})

test('status changes retain the prior state for undo', () => {
  const result = applyHabitStatus({ status: 'none' }, 'success')
  assert.equal(result.current.status, 'success')
  assert.equal(result.undo.status, 'none')
})
```

- [ ] **Step 2: Run the model test and verify failure**

Run: `cd frontend && node --test src/pages/Habits/habitViewModel.test.mjs`

Expected: FAIL because the model is missing.

- [ ] **Step 3: Split daily logging from planning and analytics**

Today renders due habits only, with a dominant Done action, secondary status menu, numeric stepper when applicable, sync state, and undo. Plan, History, and Insights render from route/query state and preserve the current data contracts. Import and reminder configuration remain in You/Data and You/Notifications.

- [ ] **Step 4: Run Habits tests and focused Playwright coverage**

Run: `cd frontend && node --test src/pages/Habits/habitViewModel.test.mjs && npx playwright test tests/auth/native-app.spec.ts --project=chromium -g "habit" --workers=1 --reporter=list`

Expected: model tests and habit logging flows PASS.

- [ ] **Step 5: Commit Habits**

```powershell
git add frontend/src/pages/Habits frontend/tests/auth/native-app.spec.ts
git commit -m "feat: refine daily habit logging"
```

## Task 6: Cash ledger and transaction composer

**Files:**
- Create: `frontend/src/pages/Finance/financeViewModel.mjs`
- Create: `frontend/src/pages/Finance/financeViewModel.test.mjs`
- Create: `frontend/src/pages/Finance/components/CashLedger.jsx`
- Create: `frontend/src/pages/Finance/components/TransactionComposer.jsx`
- Create: `frontend/src/pages/Finance/components/BudgetLedger.jsx`
- Create: `frontend/src/pages/Finance/components/CashAnalysis.jsx`
- Modify: `frontend/src/pages/Finance/Finance.jsx`
- Modify: `frontend/src/pages/Finance/FinanceTransactions.jsx`
- Modify: `frontend/src/pages/Finance/FinanceBudgets.jsx`
- Modify: `frontend/src/pages/Finance/FinanceTrends.jsx`
- Modify: `frontend/src/components/finance/TransactionForm.jsx`
- Modify: `frontend/src/styles/domains/cash.css`
- Test: `frontend/src/financeVisuals.test.mjs`
- Test: `frontend/tests/auth/native-app.spec.ts`

- [ ] **Step 1: Write failing grouping and default tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { groupTransactionsByDate, deriveTransactionDefaults } from './financeViewModel.mjs'

test('ledger groups newest dates first without changing row order', () => {
  const groups = groupTransactionsByDate([
    { id: 'a', date: '2026-07-12' },
    { id: 'b', date: '2026-07-13' },
    { id: 'c', date: '2026-07-13' },
  ])
  assert.deepEqual(groups.map((group) => group.date), ['2026-07-13', '2026-07-12'])
  assert.deepEqual(groups[0].items.map((item) => item.id), ['b', 'c'])
})

test('merchant history suggests but does not hide wallet and category defaults', () => {
  const result = deriveTransactionDefaults({ merchant: 'Mercadona', history: [{ walletId: 'w1', categoryId: 'food' }] })
  assert.deepEqual(result, { walletId: 'w1', categoryId: 'food', source: 'merchant-history' })
})
```

- [ ] **Step 2: Run the model test and verify failure**

Run: `cd frontend && node --test src/pages/Finance/financeViewModel.test.mjs`

Expected: FAIL because the model is missing.

- [ ] **Step 3: Implement ledger-first Cash routes**

Cash root and Transactions share a period-aware ledger. The top region contains period navigation and compact balance context, followed immediately by date-grouped source rows. A persistent Add action opens an amount-first transaction composer. Edit, duplicate, split, transfer inspection, and delete-with-undo are accessible from each row. Budgets display category drivers; Analysis keeps charts adjacent to source navigation.

- [ ] **Step 4: Add transaction CRUD Playwright flow**

The test adds an expense, verifies its optimistic row, edits amount and category, verifies the same row updates, deletes it, confirms undo restores it, and checks period/currency consistency.

- [ ] **Step 5: Run Cash tests and build**

Run: `cd frontend && node --test src/pages/Finance/financeViewModel.test.mjs src/financeVisuals.test.mjs src/moneyFormat.test.mjs && npx playwright test tests/auth/native-app.spec.ts --project=chromium -g "finance|transaction|budget" --workers=1 --reporter=list && npx vite build --clearScreen false`

Expected: unit and focused Cash flows PASS; build succeeds.

- [ ] **Step 6: Commit Cash**

```powershell
git add frontend/src/pages/Finance frontend/src/components/finance frontend/src/styles/domains/cash.css frontend/tests/auth/native-app.spec.ts
git commit -m "feat: rebuild cash ledger flows"
```

## Task 7: Series library and inline progress

**Files:**
- Create: `frontend/src/pages/Media/seriesViewModel.mjs`
- Create: `frontend/src/pages/Media/seriesViewModel.test.mjs`
- Create: `frontend/src/pages/Media/components/SeriesList.jsx`
- Create: `frontend/src/pages/Media/components/SeriesRow.jsx`
- Create: `frontend/src/pages/Media/components/SeriesProgress.jsx`
- Create: `frontend/src/pages/Media/components/SeriesDetailSheet.jsx`
- Create: `frontend/src/pages/Media/components/SeriesDiscover.jsx`
- Modify: `frontend/src/pages/Media/Media.jsx`
- Modify: `frontend/src/pages/Media/Media.css`
- Modify: `frontend/src/pages/Media/MediaImport.jsx`
- Modify: `frontend/src/pages/Media/MediaSettings.jsx`
- Test: `frontend/tests/auth/native-app.spec.ts`

- [ ] **Step 1: Write failing progress and status tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { incrementEpisode, moveSeriesStatus } from './seriesViewModel.mjs'

test('episode increment caps at the known episode total', () => {
  assert.equal(incrementEpisode({ watched: 11, total: 12 }), 12)
  assert.equal(incrementEpisode({ watched: 12, total: 12 }), 12)
})

test('finishing the final episode proposes completed status without forcing it', () => {
  assert.deepEqual(moveSeriesStatus({ watched: 12, total: 12, status: 'watching' }), {
    current: 'watching',
    suggested: 'completed',
  })
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `cd frontend && node --test src/pages/Media/seriesViewModel.test.mjs`

Expected: FAIL because the model is missing.

- [ ] **Step 3: Implement status-first Series views**

Replace the generic media card grid with cover-led rows grouped by Watching, Planning, Completed, Paused, and Dropped. Episode increment, score, and status are inline controls with optimistic feedback. Detail and discovery use sheets/panes that preserve list filter and scroll state. External search, import provenance, and conflict resolution remain explicit.

- [ ] **Step 4: Run Series tests and focused Playwright coverage**

Run: `cd frontend && node --test src/pages/Media/seriesViewModel.test.mjs && npx playwright test tests/auth/native-app.spec.ts --project=chromium -g "media|series|episode" --workers=1 --reporter=list`

Expected: model tests and Series progress flows PASS.

- [ ] **Step 5: Commit Series**

```powershell
git add frontend/src/pages/Media frontend/tests/auth/native-app.spec.ts
git commit -m "feat: rebuild series tracking"
```

## Task 8: stats.fm-inspired Spotify refinement

**Files:**
- Create: `frontend/src/pages/Spotify/spotifyViewModel.mjs`
- Create: `frontend/src/pages/Spotify/spotifyViewModel.test.mjs`
- Create: `frontend/src/pages/Spotify/components/RangeControl.jsx`
- Create: `frontend/src/pages/Spotify/components/RankedArtworkList.jsx`
- Create: `frontend/src/pages/Spotify/components/ListeningClock.jsx`
- Create: `frontend/src/pages/Spotify/components/PeriodComparison.jsx`
- Modify: `frontend/src/pages/Spotify/SpotifyPersonal.jsx`
- Modify: `frontend/src/pages/Spotify/SpotifyGlobal.jsx`
- Modify: `frontend/src/pages/Spotify/SpotifyRanking.jsx`
- Modify: `frontend/src/spotifyRanking.mjs`
- Modify: `frontend/src/styles/domains/spotify.css`
- Test: `frontend/src/spotifyRanking.test.mjs`

- [ ] **Step 1: Write failing range and rank-delta tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeRange, rankDelta } from './spotifyViewModel.mjs'

test('all Spotify views share the same supported ranges', () => {
  assert.equal(normalizeRange('4-weeks'), '4-weeks')
  assert.equal(normalizeRange('unsupported'), '6-months')
})

test('rank delta is positive when an item moves toward rank one', () => {
  assert.equal(rankDelta({ previous: 8, current: 3 }), 5)
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `cd frontend && node --test src/pages/Spotify/spotifyViewModel.test.mjs`

Expected: FAIL because the model is missing.

- [ ] **Step 3: Implement artwork-led Spotify views**

Use one time-range control across Personal, Ranking, and Global. Replace generic stat grids with top tracks, artists, and albums that show artwork, rank, rank change, streams, and minutes. Add listening clock, recent timeline, and period comparison with accessible text summaries. Keep connection/error states explicit.

- [ ] **Step 4: Run Spotify tests and build**

Run: `cd frontend && node --test src/pages/Spotify/spotifyViewModel.test.mjs src/spotifyRanking.test.mjs && npx vite build --clearScreen false`

Expected: Spotify tests PASS and build succeeds.

- [ ] **Step 5: Commit Spotify**

```powershell
git add frontend/src/pages/Spotify frontend/src/spotifyRanking* frontend/src/styles/domains/spotify.css
git commit -m "feat: refine spotify listening stats"
```

## Task 9: You, onboarding, landing, and commercial documentation

**Files:**
- Modify: `frontend/src/pages/Settings/Settings.jsx`
- Modify: `frontend/src/pages/Settings/*`
- Modify: `frontend/src/pages/Auth/Login.jsx`
- Modify: `frontend/src/pages/Auth/Register.jsx`
- Modify: `frontend/src/pages/Landing.jsx`
- Modify: `frontend/src/pages/Landing.css`
- Modify: `frontend/src/pages/MobileMenu.jsx`
- Create: `docs/product/BRAND_PROFILE.md`
- Create: `docs/product/COMMERCIAL_MODEL.md`
- Create: `docs/product/INTEGRATION_ROADMAP.md`
- Create: `docs/product/LEGAL_LAUNCH_CHECKLIST.md`
- Modify: `README.md`
- Modify: `PRODUCT.md`
- Test: `frontend/tests/auth/native-app.spec.ts`

- [ ] **Step 1: Add a failing route-coverage assertion**

Extend the existing design-system test so every authenticated route is assigned a product domain and no customer-facing navigation label uses `Media`, `Finance`, `Workout`, or the repository name where `Series`, `Cash`, `Gym`, or the customer brand is required.

Run: `cd frontend && node --test src/designSystem.test.mjs src/nativeNavigation.test.mjs`

Expected: FAIL until the remaining routes and labels use product metadata.

- [ ] **Step 2: Implement the You information architecture**

Replace mobile settings tabs with a list/detail structure for Account, Connections, Notifications, Sync and offline, Privacy, Appearance, Data, Updates, and Developer access. Onboarding explains hosted versus self-hosted use, data ownership, permissions, and optional connections without forcing every integration.

- [ ] **Step 3: Rebuild the landing page around the actual product**

The landing page shows real Gym, Cash, Series, Spotify, and Habits interfaces; managed hosting versus self-hosting; privacy and source availability; pricing position; and literal product behavior. Remove zero-value fake metrics, generic card comparisons, and unsupported security claims.

- [ ] **Step 4: Write commercial and brand documents**

`BRAND_PROFILE.md` records voice, mark usage, palette, type, imagery, motion, component grammar, naming-clearance requirement, and examples. `COMMERCIAL_MODEL.md` records hosted individual plan, annual discount, commercial self-host licensing, later household plan, cost assumptions requiring validation, and App Store billing review. `INTEGRATION_ROADMAP.md` ranks integrations by manual work removed, provenance, permission model, and failure handling. `LEGAL_LAUNCH_CHECKLIST.md` records PolyForm/commercial-license/trademark/contributor-agreement/privacy/terms/account-deletion requirements and the lawyer-review gate.

- [ ] **Step 5: Run route, auth, landing, and settings verification**

Run: `cd frontend && node --test src/designSystem.test.mjs src/nativeNavigation.test.mjs && npx playwright test tests/auth/native-app.spec.ts --project=chromium -g "settings|login|register|landing|menu" --workers=1 --reporter=list && npx vite build --clearScreen false`

Expected: route contracts and focused flows PASS; build succeeds.

- [ ] **Step 6: Commit product presentation and docs**

```powershell
git add frontend/src/pages frontend/src/product frontend/tests/auth/native-app.spec.ts docs/product README.md PRODUCT.md
git commit -m "feat: complete product presentation"
```

## Task 10: Premium contactless-payment capture

**Files:**
- Create: `frontend/src/paymentCapture.mjs`
- Create: `frontend/src/paymentCapture.test.mjs`
- Create: `frontend/src/components/finance/PaymentCaptureSheet.jsx`
- Modify: `frontend/src/nativePayments.mjs`
- Modify: `frontend/src/pages/Finance/FinanceTransactions.jsx`
- Modify: `frontend/src/pages/Settings/Settings.jsx`
- Create: `backend/src/finance/dto/payment-suggestion.dto.ts`
- Create: `backend/src/finance/payment-suggestion.service.ts`
- Create: `backend/src/finance/payment-suggestion.service.spec.ts`
- Modify: `backend/src/finance/finance.controller.ts`
- Modify: `backend/src/finance/finance.module.ts`
- Modify: existing Android payment notification listener and plugin sources under `frontend/android/app/src/main`
- Modify: `frontend/src/styles/domains/cash.css`
- Test: existing Android native payment tests
- Test: `frontend/tests/auth/native-app.spec.ts`

- [ ] **Step 1: Write failing normalization and deduplication tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePaymentEvent, paymentFingerprint, classifyCaptureConfidence } from './paymentCapture.mjs'

test('normalized event excludes raw notification text', () => {
  const event = normalizePaymentEvent({
    packageName: 'com.bank',
    notificationId: '42',
    rawText: 'Card purchase EUR 12.40 MERCADONA',
    amount: '12.40',
    currency: 'EUR',
    merchant: 'MERCADONA',
    occurredAt: '2026-07-13T10:00:00Z',
  })
  assert.equal(event.amountMinor, 1240)
  assert.equal(event.currency, 'EUR')
  assert.equal('rawText' in event, false)
})

test('fallback fingerprint is stable within the same capture bucket', () => {
  const first = paymentFingerprint({ merchant: 'Mercadona', amountMinor: 1240, currency: 'EUR', accountHint: '1234', occurredAt: '2026-07-13T10:00:10Z' })
  const second = paymentFingerprint({ merchant: 'MERCADONA', amountMinor: 1240, currency: 'EUR', accountHint: '1234', occurredAt: '2026-07-13T10:00:40Z' })
  assert.equal(first, second)
})

test('missing wallet or category requires review', () => {
  assert.equal(classifyCaptureConfidence({ amountMinor: 1240, merchant: 'Mercadona' }), 'review')
})
```

- [ ] **Step 2: Run frontend and backend tests and verify failures**

Run: `cd frontend && node --test src/paymentCapture.test.mjs`

Run: `cd backend && npx jest src/finance/payment-suggestion.service.spec.ts --runInBand`

Expected: both fail because the new contracts are missing.

- [ ] **Step 3: Implement normalized local capture**

Implement package-specific Android adapters behind one normalized event interface. Store raw notification content only in short-lived local parsing scope. Persist normalized suggestions with source identity, fallback fingerprint, parser version, and state. Add notification actions for Confirm, Edit, and Ignore. When Edit is selected, deep-link into `PaymentCaptureSheet` with the suggestion identifier.

- [ ] **Step 4: Implement idempotent backend transitions**

The service accepts a normalized suggestion exactly once, enforces account ownership, creates at most one transaction, and supports pending, confirmed, ignored, duplicate, and failed states. Repeated confirmation returns the original transaction. Correction payloads may update merchant, wallet, category, date, and amount before confirmation.

- [ ] **Step 5: Implement the confirmation experience**

`PaymentCaptureSheet` leads with amount and merchant, exposes wallet and category without hidden defaults, shows confidence/provenance in plain language, and supports Confirm, Edit, and Ignore. Confirm updates the ledger optimistically and queues sync. Capture history and parser/permission health live in Cash settings.

- [ ] **Step 6: Run payment tests, native tests, and focused Playwright flow**

Run: `cd frontend && node --test src/paymentCapture.test.mjs src/nativePayments.test.mjs && npx playwright test tests/auth/native-app.spec.ts --project=chromium -g "payment|contactless|suggestion" --workers=1 --reporter=list`

Run: `cd backend && npx jest src/finance/payment-suggestion.service.spec.ts --runInBand`

Run the existing Gradle unit test task from `frontend/android` for the payment listener package.

Expected: normalization, deduplication, idempotency, correction, notification action, and confirmation flows PASS.

- [ ] **Step 7: Commit payment capture**

```powershell
git add frontend/src/paymentCapture* frontend/src/nativePayments* frontend/src/components/finance frontend/src/pages/Finance frontend/src/pages/Settings frontend/src/styles/domains/cash.css frontend/android backend/src/finance frontend/tests/auth/native-app.spec.ts
git commit -m "feat: complete payment capture flow"
```

## Task 11: Full-product verification and release evidence

**Files:**
- Modify: `frontend/tests/auth/native-app.spec.ts`
- Modify: Playwright visual baselines under the existing test structure
- Create: `docs/product/RELEASE_READINESS.md`
- Create: `docs/product/UX_AUDIT_RESULTS.md`
- Modify: `.github/workflows/android-release.yml` only when verification reveals a release-contract gap

- [ ] **Step 1: Map every approved requirement to evidence**

Create `UX_AUDIT_RESULTS.md` with one row per design done criterion: authoritative file/runtime evidence, desktop result, native result, accessibility result, and remaining external dependency. A missing or indirect result is recorded as not complete and fixed before proceeding.

- [ ] **Step 2: Run all frontend unit tests**

Run: `cd frontend && node --test src/*.test.mjs src/product/*.test.mjs src/pages/*/*.test.mjs`

Expected: all tests PASS with no skipped required contract.

- [ ] **Step 3: Run backend tests and type/build checks**

Run: `cd backend && npm test -- --runInBand`

Run: `cd backend && npm run build`

Expected: backend tests PASS and Nest build succeeds.

- [ ] **Step 4: Run production frontend build**

Run: `cd frontend && npx vite build --clearScreen false`

Expected: build succeeds; chunk warnings are reviewed and heavy domain code is split when it materially affects initial load.

- [ ] **Step 5: Run critical Playwright journeys serially**

Run authenticated desktop and native journeys for navigation, habits, Gym, Cash, Series, Spotify, Assistant, You, offline recovery, and payment capture using `--workers=1`. Retry only after identifying the cause of a failure.

Expected: every critical journey PASS.

- [ ] **Step 6: Capture responsive visual evidence**

Capture and inspect the landing page plus every major authenticated domain at 320x720, 390x844, 768x1024, 1024x768, and 1440x900. Verify no horizontal overflow, clipped actions, hidden labels, overlapping safe areas, or desktop controls inside native sheets.

- [ ] **Step 7: Perform accessibility and interaction review**

Walk through keyboard navigation, visible focus, Escape/Back behavior, dialog focus return, screen-reader headings/landmarks, chart summaries, color-independent states, reduced motion, 200% zoom, long labels, empty data, failures, queued writes, and conflicts.

- [ ] **Step 8: Verify Android release build and workflow**

Run the repository-supported Android Gradle release build and inspect the generated artifact. Validate version, update gate, notification listener disclosure, permissions, icon, name, splash, deep links, privacy links, and workflow artifact upload contract.

- [ ] **Step 9: Finalize release-readiness documentation**

`RELEASE_READINESS.md` records passed commands, artifact paths, App Store and Play data-safety requirements, legal-review items, production secrets/infrastructure dependencies, pricing/billing decisions, rollback notes, and any external integration credentials still required. Legal-review items are not reported as complete until reviewed externally.

- [ ] **Step 10: Commit verification evidence**

```powershell
git add frontend/tests docs/product .github/workflows/android-release.yml
git commit -m "test: verify premium product release"
```

## Plan self-review

- Every approved domain has an implementation task and intended-behavior verification.
- The hosted/self-hosted product model, brand profile, licensing gate, integrations, and monetization are documented in Task 9.
- Contactless payment capture is Task 10 and cannot begin before Tasks 1–9.
- Full completion evidence is required by Task 11.
- Existing user-owned screenshots and runtime folders remain untracked and outside every commit.
