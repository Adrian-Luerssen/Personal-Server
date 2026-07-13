# Structured Series Domain and Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build season-aware TV tracking, relation-aware anime tracking, an information-rich Series interface, and Vercel Analytics for the shared web/native React application.

**Architecture:** Preserve `MediaItem` as the user library record and add account-owned seasons, episodes, and provider relations. A focused catalog service synchronizes provider data and exposes a single detail contract consumed by a new Series detail experience. Analytics is isolated behind one root component with privacy filtering and native endpoint configuration.

**Tech Stack:** NestJS, TypeORM/PostgreSQL, Jest, React 18, Vite, Capacitor, Node test runner, Playwright, `@vercel/analytics`.

---

### Task 1: Persist seasons, episodes, and anime relations

**Files:**
- Create: `backend/src/media/entities/media-season.entity.ts`
- Create: `backend/src/media/entities/media-episode.entity.ts`
- Create: `backend/src/media/entities/media-relation.entity.ts`
- Create: `backend/src/migrations/1783950000000-structured-media-catalog.ts`
- Create: `backend/src/migrations/1783950000000-structured-media-catalog.spec.ts`
- Modify: `backend/src/media/media.module.ts`

- [ ] Write a migration test asserting the three tables, account/title foreign keys, cascade deletion, and unique provider indexes.
- [ ] Run `npm test -- --runInBand src/migrations/1783950000000-structured-media-catalog.spec.ts` from `backend`; confirm it fails because the migration does not exist.
- [ ] Implement typed entities and the additive migration. Keep provider payloads out of opaque JSON except for external IDs.
- [ ] Register all entities in `MediaModule`.
- [ ] Re-run the focused migration test and `npm run build`; confirm both pass.
- [ ] Commit with `feat: add structured media catalog schema`.

### Task 2: Synchronize provider catalog structure

**Files:**
- Create: `backend/src/media/catalog/media-catalog.service.ts`
- Create: `backend/src/media/catalog/media-catalog.service.spec.ts`
- Modify: `backend/src/media/media.module.ts`

- [ ] Write failing tests for TMDB season/episode ingestion, season-zero specials, idempotent refresh, watched-count backfill, and Jikan prequel/sequel relation ingestion.
- [ ] Run the focused catalog service test and confirm missing-service failures.
- [ ] Implement `syncItem`, `syncTmdbSeries`, and `syncAnimeRelations` with injected repositories and provider requests bounded by timeouts.
- [ ] Preserve watched state during refresh and map only the first legacy aggregate count across regular episodes in air order.
- [ ] Return typed `CatalogView` data with derived progress, current position, next episode, seasons, relations, and sync state.
- [ ] Re-run focused tests and backend build.
- [ ] Commit with `feat: synchronize series catalog structure`.

### Task 3: Expose catalog and episode progress contracts

**Files:**
- Modify: `backend/src/media/media/media.controller.ts`
- Modify: `backend/src/media/media/media.service.ts`
- Modify: `backend/src/media/media/media.service.spec.ts`
- Modify: `backend/src/media/catalog/media-catalog.service.ts`
- Modify: `backend/src/media/catalog/media-catalog.service.spec.ts`

- [ ] Write failing tests for account-scoped catalog reads, explicit synchronization, watched/unwatched transitions, aggregate compatibility updates, and invalid episode ownership.
- [ ] Run focused service tests and verify expected failures.
- [ ] Add `GET :id/catalog`, `POST :id/catalog/sync`, and `PATCH :id/episodes/:episodeId` routes.
- [ ] Validate booleans at the boundary and refuse cross-account/title episode mutations.
- [ ] Update `metadata.episodesWatched` after concrete episode changes so old clients remain compatible.
- [ ] Re-run media tests and backend build.
- [ ] Commit with `feat: add season-aware progress api`.

### Task 4: Model season-aware and continuity-aware presentation

**Files:**
- Modify: `frontend/src/pages/Media/seriesViewModel.mjs`
- Modify: `frontend/src/pages/Media/seriesViewModel.test.mjs`
- Create: `frontend/src/pages/Media/seriesCatalogModel.mjs`
- Create: `frontend/src/pages/Media/seriesCatalogModel.test.mjs`

- [ ] Write failing tests for `S03E07` progress labels, next-episode selection, specials exclusion, fallback aggregate progress, and deterministic anime continuity ordering.
- [ ] Run the focused Node tests and confirm missing-model failures.
- [ ] Implement pure normalizers and selectors without React dependencies.
- [ ] Update legacy progress behavior to prefer catalog summaries while retaining aggregate fallback.
- [ ] Re-run focused tests.
- [ ] Commit with `feat: model structured series progress`.

### Task 5: Rebuild Series rows and details

**Files:**
- Create: `frontend/src/pages/Media/SeriesDetail.jsx`
- Create: `frontend/src/pages/Media/SeriesSeasonList.jsx`
- Create: `frontend/src/pages/Media/AnimeContinuity.jsx`
- Modify: `frontend/src/pages/Media/Media.jsx`
- Modify: `frontend/src/pages/Media/Media.css`
- Modify: `frontend/tests/auth/native-app.spec.ts`

- [ ] Add failing Playwright contracts for informative library rows, TV season navigation, explicit episode watch toggles, anime continuity, synchronization errors, and 320px overflow.
- [ ] Run the focused Series Playwright tests and confirm the new contracts fail.
- [ ] Replace the edit-first detail interaction with an information-first detail sheet and secondary edit action.
- [ ] Add season navigation, episode rows, current/next episode emphasis, provider metadata, and anime relation rail.
- [ ] Trigger catalog sync after provider-backed additions and provide explicit refresh with visible loading/error states.
- [ ] Correct type filtering to use `type` rather than overlapping metadata tags.
- [ ] Run Node tests, focused Playwright, and frontend build.
- [ ] Commit with `feat: rebuild season-aware series experience`.

### Task 6: Add Vercel Analytics for hosted and native clients

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/src/productAnalytics.mjs`
- Create: `frontend/src/productAnalytics.test.mjs`
- Create: `frontend/src/components/ProductAnalytics.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/.env.example`
- Modify: `README.md`

- [ ] Install `@vercel/analytics` as a runtime dependency.
- [ ] Write failing tests for URL redaction and web/native endpoint selection.
- [ ] Run the focused analytics test and confirm missing-module failures.
- [ ] Implement one React Analytics component using the official React import, Vercel defaults on hosted builds, optional absolute native endpoints, production mode in native builds, and query/fragment redaction.
- [ ] Render it once at the application root and document Vercel dashboard enablement plus Capacitor environment variables.
- [ ] Re-run tests and frontend build.
- [ ] Commit with `feat: add privacy-safe product analytics`.

### Task 7: Verify migration, product flows, and release builds

**Files:**
- Modify: `docs/product/RELEASE_READINESS.md`
- Modify: `docs/product/UX_AUDIT_RESULTS.md`

- [ ] Run all frontend Node tests.
- [ ] Run the full backend Jest suite and backend build.
- [ ] Run focused native Series Playwright coverage at desktop, S24, and 320px widths.
- [ ] Run the frontend production build and inspect chunk output.
- [ ] Run `npx cap sync android` and `gradlew.bat assembleRelease`.
- [ ] Update release documentation with structured Series and analytics evidence, including the external requirement to enable Web Analytics in Vercel.
- [ ] Run `git diff --check`, inspect the complete diff, and commit with `test: verify structured series release`.
