# UI Defect Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the six screenshot-confirmed UI defects across capture, media, habits, training, and category editing.

**Architecture:** Complete the missing capture-sheet component contract, introduce reusable icon-input and colour-field primitives, and make register actions explicitly styled. Keep the existing Record tokens and page structure; move responsive behavior into `record.css` and remove brittle per-page positioning where it caused the defects.

**Tech Stack:** React 18, CSS, Node test runner, Playwright, Vite.

## Global Constraints

- Preserve the Record graphite/violet identity and existing route behavior.
- Maintain WCAG-oriented labels, focus handling, Escape behavior, and 44px practical touch targets.
- Support desktop and narrow/mobile layouts without horizontal overflow.
- Respect reduced motion and do not add dependencies.

---

### Task 1: Regression contracts

**Files:**
- Create: `frontend/src/uiDefectRepair.test.mjs`

- [ ] Write source-level contracts for capture-sheet styling, icon-input layout, explicit register actions, heatmap sizing, and colour-field affordance.
- [ ] Run `node --test src/uiDefectRepair.test.mjs` and confirm the assertions fail because the contracts are absent.

### Task 2: Capture sheet and shared controls

**Files:**
- Create: `frontend/src/components/product/IconInput.jsx`
- Create: `frontend/src/components/product/ColorField.jsx`
- Modify: `frontend/src/components/product/CaptureSheet.jsx`
- Modify: `frontend/src/pages/Media/Media.jsx`
- Modify: `frontend/src/pages/Workout/WorkoutExercises.jsx`
- Modify: `frontend/src/record.css`

- [ ] Add complete fixed-layer, panel, header, action-grid, close-button, and mobile safe-area styling for CaptureSheet.
- [ ] Implement IconInput with a real grid slot for its icon and migrate media search fields.
- [ ] Implement ColorField with native picker, swatch, visible hex value, and clear label.
- [ ] Run the focused contract and build checks.

### Task 3: Training actions and activity heatmap

**Files:**
- Modify: `frontend/src/pages/Workout/Workout.jsx`
- Modify: `frontend/src/components/habits/HabitHeatmap.jsx`
- Modify: `frontend/src/pages/Habits/Habits.jsx`
- Modify: `frontend/src/record.css`

- [ ] Replace browser-default register buttons with explicit compact/tertiary variants and 40-44px targets.
- [ ] Prevent equal-height panel stretching and give the yearly heatmap a deliberate full-width desktop region.
- [ ] Add a meaningful zero-activity state and preserve usable heatmap cell sizing via horizontal scrolling on narrow surfaces.
- [ ] Run the focused contract and existing design-system tests.

### Task 4: Browser verification

**Files:**
- Test: `frontend/tests/ui/ui-defect-repair.spec.ts`

- [ ] Add Playwright coverage for the capture sheet, media icon-input spacing, explicit training actions, and responsive overflow.
- [ ] Run focused Playwright tests and `npm run build`.
- [ ] Inspect desktop and narrow views in the live local application, including keyboard focus and console errors.
