# Premium Journal Redesign & AI Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Personal Server’s landing page, shell, and dashboard into a premium quantified-self journal experience with structured insight surfaces and a real AI deep-analysis handoff.

**Architecture:** Keep the current route structure and data model, but introduce a stronger presentation layer: redesigned global styles, upgraded shared primitives, a rebuilt landing page, and a new dashboard intelligence surface. Add one backend dashboard intelligence endpoint that returns structured insight objects from existing analytics so the UI has a durable, testable contract.

**Tech Stack:** React 18, Vite, NestJS 9, TypeORM, Jest, existing chat/agent bridge, existing SWR-style API cache.

---

### Task 1: Add Dashboard Intelligence Contract

**Files:**
- Modify: `backend/src/dashboard/dashboard.service.ts`
- Modify: `backend/src/dashboard/dashboard.controller.ts`
- Test: `backend/src/dashboard/dashboard.service.spec.ts`

- [ ] Add failing Jest tests for a structured dashboard intelligence summary.
- [ ] Implement `getDashboardIntelligence(accountId)` in `DashboardService` using existing weekly and correlation data patterns.
- [ ] Expose `GET /dashboard/intelligence` from `DashboardController`.
- [ ] Re-run backend dashboard service tests.

### Task 2: Rebuild Shared Visual Foundation

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/components/Layout.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/components/PageHeader.jsx`

- [ ] Redesign root CSS variables, shell framing, navigation rhythm, and shared card/button/page-header styles.
- [ ] Update the app shell to support a more editorial content frame.
- [ ] Rework the sidebar into a premium journal navigation surface.
- [ ] Keep mobile behavior intact while improving desktop composition.

### Task 3: Rebuild Landing Page

**Files:**
- Modify: `frontend/src/pages/Landing.jsx`
- Modify: `frontend/src/pages/Landing.css`

- [ ] Replace the current SaaS-like sections with a narrative landing page.
- [ ] Add stronger hero composition, motion, proof sections, and premium CTA rhythm.
- [ ] Keep auth redirect behavior intact.

### Task 4: Rebuild Home Dashboard

**Files:**
- Modify: `frontend/src/pages/Home.jsx`
- Modify: `frontend/src/api.js`

- [ ] Add the dashboard intelligence fetch path to the frontend preload/cache layer.
- [ ] Replace the widget-wall homepage with a weekly brief, insight canvas, and operational rail.
- [ ] Add on-demand “ask AI” actions that send structured, domain-aware prompts through the existing chat bridge.
- [ ] Preserve existing useful stats and quick actions where they still add value.

### Task 5: Verify, Commit, Push

**Files:**
- Review only

- [ ] Run backend tests covering dashboard service changes.
- [ ] Run the frontend production build.
- [ ] Review the diff for accidental regressions or noisy edits.
- [ ] Commit with a conventional commit message.
- [ ] Push the branch to origin.

