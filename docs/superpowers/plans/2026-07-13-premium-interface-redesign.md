# Premium Interface Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current warm editorial interface with the approved dark, data-first Personal Record product system across authenticated web, native mobile, and landing surfaces while preserving every existing workflow.

**Architecture:** Keep the existing React, Vite, Capacitor, route, API, and cache architecture. Introduce a semantic visual foundation and a small family of reusable instrument primitives, then migrate the shell and each product domain onto those contracts. Route-specific components retain their business logic; the redesign changes composition, hierarchy, copy, and styling without changing data ownership or backend contracts.

**Tech Stack:** React 18, React Router, Vite, Capacitor 8, vanilla CSS, Lucide React, Chart.js, Node test runner, Playwright, Android Gradle.

---

## Task 1: Lock the premium visual contract with failing tests

**Files:**
- Modify: `frontend/src/designSystem.test.mjs`
- Modify: `frontend/src/product/brand.test.mjs`
- Modify: `frontend/src/chartTheme.test.mjs`
- Reference: `docs/superpowers/specs/2026-07-13-premium-ui-redesign-design.md`

- [ ] Replace old paper-ledger assertions with tests for graphite surfaces, Sora/JetBrains Mono, domain color tokens, constellation branding, dense shell geometry, and reduced motion.
- [ ] Add brand assertions for “Personal Record” and “Everything you are, in context.”
- [ ] Add chart theme assertions that charts derive colors from the new data palette.
- [ ] Run `node --test src/designSystem.test.mjs src/product/brand.test.mjs src/chartTheme.test.mjs` and confirm failures identify the old implementation.

## Task 2: Build the visual foundation and brand mark

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/src/main.jsx`
- Modify: `frontend/src/styles/tokens.css`
- Modify: `frontend/src/styles/base.css`
- Modify: `frontend/src/styles/primitives.css`
- Modify: `frontend/src/custom-scrollbar.css`
- Modify: `frontend/src/product/brand.mjs`
- Modify: `frontend/src/chartTheme.js`
- Modify: `frontend/src/components/product/BrandMark.jsx`
- Modify: `DESIGN.md`

- [ ] Install self-hosted `@fontsource-variable/sora` and `@fontsource-variable/jetbrains-mono`.
- [ ] Define semantic surface, text, border, state, domain, radius, spacing, shadow, and motion tokens from the approved spec.
- [ ] Replace paper backgrounds and serif typography with graphite instrumentation surfaces and purposeful numeric type.
- [ ] Implement the constellation/hex network mark as accessible inline SVG with compact and full variants.
- [ ] Update customer-facing brand metadata and chart defaults.
- [ ] Update `DESIGN.md` so future work uses the new brand, composition, accessibility, and motion rules.
- [ ] Run the three focused contract tests and confirm they pass.
- [ ] Commit: `feat(ui): establish Personal Record visual system`.

## Task 3: Redesign the responsive application shell

**Files:**
- Modify: `frontend/src/components/Layout.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/components/PageHeader.jsx`
- Modify: `frontend/src/components/product/DomainNav.jsx`
- Modify: `frontend/src/components/product/MobileGlobalNav.jsx`
- Modify: `frontend/src/components/product/CaptureSheet.jsx`
- Modify: `frontend/src/styles/shell.css`
- Modify: `frontend/src/product/navigation.test.mjs`
- Modify: `frontend/src/nativeNavigation.test.mjs`
- Modify: `frontend/tests/responsive/viewports.spec.ts`

- [ ] Add failing tests for the stable five-destination mobile rail, compact command bar, domain-aware shell state, keyboard focus, and no horizontal overflow at 320px.
- [ ] Implement a 240px desktop command sidebar with product identity, domain accents, sync state, account controls, and a compact command affordance.
- [ ] Implement the native top bar, app switcher, contextual tabs, central Capture action, and safe-area-aware bottom navigation.
- [ ] Make shell transitions functional, short, reduced-motion-safe, and free of layout shift.
- [ ] Run focused node navigation tests and responsive Playwright specs.
- [ ] Commit: `feat(ui): rebuild responsive application shell`.

## Task 4: Add reusable instrument primitives

**Files:**
- Add: `frontend/src/components/product/InstrumentPanel.jsx`
- Add: `frontend/src/components/product/MetricValue.jsx`
- Add: `frontend/src/components/product/SignalRing.jsx`
- Add: `frontend/src/components/product/MiniChart.jsx`
- Add: `frontend/src/components/product/RecordRow.jsx`
- Add: `frontend/src/components/product/InstrumentStates.jsx`
- Add: `frontend/src/product/instruments.test.mjs`
- Modify: `frontend/src/styles/primitives.css`
- Modify: `frontend/src/components/shared/StatCard.jsx`
- Modify: `frontend/src/components/shared/ProgressBar.jsx`
- Modify: `frontend/src/components/shared/SkeletonCard.jsx`
- Modify: `frontend/src/components/shared/Modal.jsx`

- [ ] Write failing source-contract tests for accessible headings, semantic value output, reduced-motion-safe progress, empty/loading states, and optional domain accents.
- [ ] Implement small composable primitives without routing or API knowledge.
- [ ] Adapt legacy shared components to the new primitives while keeping public props compatible.
- [ ] Run instrument and design-system tests.
- [ ] Commit: `feat(ui): add data instrument component family`.

## Task 5: Recompose Today for desktop and native mobile

**Files:**
- Modify: `frontend/src/pages/Home.jsx`
- Modify: `frontend/src/pages/Home/components/ActionTimeline.jsx`
- Modify: `frontend/src/pages/Home/components/DailyBrief.jsx`
- Modify: `frontend/src/pages/Home/todayModel.mjs`
- Modify: `frontend/src/pages/Home/todayModel.test.mjs`
- Modify: `frontend/src/styles/domains/today.css`
- Modify: `frontend/tests/dashboard/home.spec.ts`
- Modify: `frontend/tests/visual-regression/pages.spec.ts`

- [ ] Add failing tests for an action-first daily model, deterministic daily signal, unresolved capture priority, and domain context labels.
- [ ] Implement the approved asymmetric desktop grid with greeting, date, daily signal, cash, habits, gym, music, series, and assistant context.
- [ ] Implement the mobile Today plan with thumb-reachable actions and compact at-a-glance records.
- [ ] Preserve module preferences, cached data, loading states, payment review, and all existing links.
- [ ] Run Today model tests, dashboard Playwright tests, and capture screenshots at desktop and mobile breakpoints.
- [ ] Commit: `feat(today): deliver the Personal Record command center`.

## Task 6: Upgrade Cash and Habits interaction surfaces

**Files:**
- Modify: `frontend/src/pages/Finance/Finance.jsx`
- Modify: `frontend/src/pages/Finance/FinanceTransactions.jsx`
- Modify: `frontend/src/pages/Finance/FinanceBudgets.jsx`
- Modify: `frontend/src/pages/Finance/FinanceTrends.jsx`
- Modify: `frontend/src/pages/Finance/nativeFinanceComponents.jsx`
- Modify: `frontend/src/components/finance/PaymentCaptureSheet.jsx`
- Modify: `frontend/src/components/finance/TransactionForm.jsx`
- Modify: `frontend/src/styles/domains/cash.css`
- Modify: `frontend/src/pages/Habits/Habits.jsx`
- Modify: `frontend/src/pages/Habits/HabitsSettings.jsx`
- Modify: `frontend/src/pages/Habits/Habits.css`
- Modify: `frontend/tests/finance/*.spec.ts`
- Modify: `frontend/tests/habits/*.spec.ts`

- [ ] Add failing interaction assertions for compact ledger hierarchy, visible wallet/category review, budget status, habit state neutrality, and undo-safe quick actions.
- [ ] Restyle Cash around a Cashew-comfort compact ledger, green data language, strong totals, clear review state, and first-class contactless capture.
- [ ] Preserve Habits interaction logic while moving streaks, cadence, heatmaps, and daily controls into the new teal instrument language.
- [ ] Verify finance and habits node/Playwright tests.
- [ ] Commit: `feat(ui): premium Cash and Habits experiences`.

## Task 7: Upgrade Gym, Music, and Series domain experiences

**Files:**
- Modify: `frontend/src/pages/Workout/*.jsx`
- Modify: `frontend/src/pages/Workout/components/*.jsx`
- Modify: `frontend/src/styles/domains/gym.css`
- Modify: `frontend/src/pages/Spotify/*.jsx`
- Modify: `frontend/src/styles/domains/spotify.css`
- Modify: `frontend/src/pages/Media/*.jsx`
- Modify: `frontend/src/pages/Media/Media.css`
- Modify: `frontend/tests/workout/*.spec.ts`
- Modify: `frontend/tests/spotify/*.spec.ts`
- Modify: `frontend/tests/visual-regression/pages.spec.ts`

- [ ] Add failing tests for active-workout priority, touch-sized set editing, stats.fm-inspired ranking hierarchy, structured season display, and anime continuity.
- [ ] Recompose Gym around the current session, rest timer, fast set entry, prior-set context, and orange performance data.
- [ ] Recompose Music around ranked listening identity, artwork, movement, timeframe comparison, and pink data visualizations while preserving current functionality.
- [ ] Recompose Series around status shelves, structured TV seasons/episodes, anime title relationships, next actions, and amber metadata.
- [ ] Run domain model tests and route Playwright tests.
- [ ] Commit: `feat(ui): premium Gym Music and Series experiences`.

## Task 8: Unify Assistant, account, setup, and error states

**Files:**
- Modify: `frontend/src/components/ChatPanel.jsx`
- Modify: `frontend/src/components/ChatPanel.css`
- Modify: `frontend/src/pages/Chat/ChatPage.jsx`
- Modify: `frontend/src/pages/Profile.jsx`
- Modify: `frontend/src/pages/MobileMenu.jsx`
- Modify: `frontend/src/pages/Settings/*.jsx`
- Modify: `frontend/src/pages/Auth/Login.jsx`
- Modify: `frontend/src/pages/Auth/Register.jsx`
- Modify: `frontend/src/components/ApiStatus.jsx`
- Modify: `frontend/src/components/RouteErrorBoundary.jsx`
- Modify: `frontend/src/components/shared/ImportProgressPanel.jsx`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/tests/chat/panel.spec.ts`
- Modify: `frontend/tests/auth/*.spec.ts`
- Modify: `frontend/tests/settings/*.spec.ts`

- [ ] Add failing tests for visible assistant provenance, accessible auth labels, actionable errors, and consistent import/setup states.
- [ ] Apply the purple Assistant language with context/provenance always visible near generated output.
- [ ] Move auth, account, settings, import, update, offline, empty, and error surfaces onto the same premium system.
- [ ] Run focused auth, chat, settings, and import tests.
- [ ] Commit: `feat(ui): unify supporting product surfaces`.

## Task 9: Rebuild the landing page from the finished product

**Files:**
- Modify: `frontend/src/pages/Landing.jsx`
- Modify: `frontend/src/pages/Landing.css`
- Modify: `frontend/src/designSystem.test.mjs`
- Modify: `frontend/tests/auth/landing.spec.ts`
- Modify: `frontend/tests/visual-regression/pages.spec.ts`

- [ ] Add failing assertions for the real product identity, exact tagline, product-first hero, self-hosting honesty, and responsive conversion actions.
- [ ] Build a restrained premium landing page whose hero uses a faithful live-code composition of the implemented Today experience.
- [ ] Explain local-first control, managed hosting, domain integrations, contactless capture, and customer value without generic SaaS claims.
- [ ] Verify landing Playwright behavior and capture desktop/mobile screenshots.
- [ ] Commit: `feat(landing): showcase the finished Personal Record product`.

## Task 10: Release-quality visual and technical verification

**Files:**
- Modify as required by defects found during verification.
- Verify: `frontend/android/`

- [ ] Run the complete frontend node suite: `node --test src/*.test.mjs src/product/*.test.mjs src/pages/*/*.test.mjs`.
- [ ] Run the complete backend suite: `node node_modules\\jest\\bin\\jest.js --runInBand --forceExit`.
- [ ] Run `npm run build` in `frontend` and `backend`.
- [ ] Run the full Playwright suite against a deterministic local backend; fix every redesign regression.
- [ ] Use the in-app browser to inspect desktop, narrow desktop, tablet, 390px mobile, and 320px mobile across Today, Cash, Habits, Gym, Music, Series, Assistant, settings, auth, and landing.
- [ ] Verify keyboard navigation, visible focus, contrast, touch targets, scrolling, modal focus, empty/loading/error states, and `prefers-reduced-motion`.
- [ ] Run `npx cap sync android` and `frontend/android/gradlew.bat assembleDebug`.
- [ ] Review `git diff --check`, final branch diff, and the design-spec checklist.
- [ ] Commit final verification fixes: `fix(ui): close premium release verification gaps`.
