# Record foundational redesign implementation plan

> Execute in order. Each production change starts with a failing intent-based test. Inspect each completed surface in the in-app browser before moving on.

**Goal:** Replace the inherited presentation layer with one coherent Record system while preserving domain behavior, data, APIs, cache contracts, and native capabilities.

**Architecture:** Keep React/Vite, routing, services, view models, and backend contracts. Introduce a small explicit Record component layer and one ordered stylesheet entry. Migrate route composition to registers and workbenches instead of relying on wildcard CSS over legacy page markup.

**Verification:** Node unit tests for view models and shell state, Playwright task flows, in-app browser inspection at the release breakpoints, Vite build, Capacitor sync, and Android debug build.

---

## 1. Foundation contract and removal

- Replace visual-system source tests so they reject constellation assets, per-domain page themes, wildcard legacy overrides, floating chat, and duplicated mobile navigation.
- Remove prior premium/corrective redesign documents and stale CSS entry layers.
- Replace `DESIGN.md` and `docs/product/BRAND_PROFILE.md` with the approved Record contract.
- Add the new brand mark and shared primitives: `RecordMark`, `RouteBar`, `PageHeading`, `Register`, `RegisterRow`, `SummaryStrip`, `StatePanel`, `Sheet`, and `SegmentedNav`.
- Verify with focused Node tests and build.

## 2. Shell and navigation

- Write shell-state tests for every route label, navigation grouping, local navigation ownership, mobile destinations, and back behavior.
- Rebuild desktop rail, tablet icon rail, route bar, native top bar, Records index, capture sheet, and bottom navigation.
- Remove sidebar accordions, header app switcher, floating Assistant, and navigation duplication.
- Inspect 320, 390, 768, 1024, and 1440px plus keyboard navigation.

## 3. Landing and authentication

- Replace generic visual assertions with CTA, managed/self-hosted, form-error, recovery, fit, and overflow contracts.
- Recompose landing from Record registers; rebuild login and register in the shared auth frame.
- Inspect first viewport and full page on desktop/mobile; validate tab and error flow.

## 4. Today

- Write tests for the open-record queue, factual summaries, recent records, empty, error, cached, and direct actions.
- Replace metric-card composition with open and recent registers.
- Verify each action routes to the correct domain context.

## 5. Cash and contactless capture

- Replace overview-card tests with ledger, filtering, edit, and review-flow contracts.
- Rebuild the root ledger, date groups, transaction row/editor, filter sheet, budgets register, trends, and settings.
- Rebuild payment capture review with explicit source, confidence, editable fields, duplicate handling, accept/reject, success, and recovery.
- Verify pointer, keyboard, numeric entry, native back, and narrow Android layouts.

## 6. Gym

- Write task tests for starting/continuing, logging and undoing a set, rest timer, completion, history filtering, exercises, and bodyweight.
- Rebuild overview as a session-first surface and active workout as the focused workbench.
- Migrate history, exercises, bodyweight, and import to register/state primitives.

## 7. Habits

- Preserve existing behavior tests and extend for selected-day clarity, undo, error recovery, and keyboard use.
- Recompose daily logging into a single register; unify boolean and numeric controls.
- Migrate calendar, analysis, settings, and import without competing with the day workflow.

## 8. Music

- Write tests for shared timeframe, connection state, ranked artwork rows, movement, patterns, and route continuity.
- Recompose personal, global, and ranking views using the Record register grammar while retaining stats.fm-style density.

## 9. Series

- Extend model and flow tests for TV seasons, season episode numbers, anime catalogue-entry continuity, search type labels, progress, and next actions.
- Rebuild library rows, filters, detail, season navigation, episode register, and anime continuity.
- Verify that TV and anime never share the wrong numbering model.

## 10. Assistant and settings

- Write tests for full-workspace Assistant, provenance disclosure, thread navigation, and composer behavior.
- Rebuild Assistant as a route-only workspace.
- Recompose Settings into index/detail groups and migrate all connection, notification, module, sync, update, data, and developer interactions.

## 11. Full release pass

- Run all unit and E2E suites.
- Inspect each major route and relevant state at 320, 390, 768, 1024, and 1440px in the in-app browser.
- Perform keyboard, focus, Escape, overlay focus-return, reduced-motion, offline/cache, and horizontal-overflow passes.
- Run Vite production build, Capacitor sync, and Android debug build.
- Record the page-by-page evidence and unresolved launch dependencies. Do not mark complete with known presentation or interaction defects.
