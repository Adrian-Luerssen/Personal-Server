# Record Icon Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a locally served comparison lab containing exactly 50 meaningful Record-native inline-SVG app icons and their CSS loading animations.

**Architecture:** Add an isolated static lab under Vite's `public/icon-lab/` so it cannot affect production routes or bundles. It is addressed explicitly as `/icon-lab/index.html` because Vite's SPA fallback owns extensionless directory URLs. Semantic HTML owns the concept catalogue, CSS owns all icon geometry and motion, and a small vanilla JavaScript controller owns filtering, pause/replay, and view density. A Playwright contract test verifies the complete user-facing lab.

**Tech Stack:** HTML5, CSS custom properties/keyframes, vanilla JavaScript, Vite static assets, Playwright.

## Global Constraints

- Exactly 50 uniquely named concepts across five families: Archive, Capture, Continuity, Life, and Signature.
- Match Record tokens: `#090e14`, `#0e151e`, `#131c27`, `#233041`, `#f2f5f8`, `#96a3b4`, and `#7c5cff`.
- Use Sora for interface text and JetBrains Mono for indexes and metadata.
- Every mark has a unique inline SVG, a visible meaning statement, a named motion action, a static final state, an animated loading state, and three visible keyframe previews.
- Motion is mechanical and supports pause, replay, and `prefers-reduced-motion`.
- Controls are native buttons with visible focus and at least 44px targets.
- No React or new runtime dependency is added to the production application.

---

### Task 1: Define the browser contract

**Files:**
- Create: `frontend/tests/icon-lab/icon-lab.spec.ts`

**Interfaces:**
- Consumes: Vite public URL `/icon-lab/index.html`.
- Produces: executable acceptance contract for catalogue count, controls, filtering, and reduced-motion hooks.

- [ ] **Step 1: Write the failing Playwright test**

```ts
import { test, expect } from '@playwright/test'

test('exposes fifty distinct motion studies with working controls', async ({ page }) => {
  await page.goto('/icon-lab/index.html')
  const cards = page.locator('[data-icon-card]')
  await expect(cards).toHaveCount(50)
  await expect(page.locator('[data-family]')).toHaveCount(5)
  await expect(page.getByRole('button', { name: 'Pause animations' })).toBeVisible()
  await page.getByRole('button', { name: 'Pause animations' }).click()
  await expect(page.locator('body')).toHaveClass(/is-paused/)
  await page.getByRole('button', { name: 'Show Capture icons' }).click()
  await expect(page.locator('[data-icon-card]:visible')).toHaveCount(10)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/icon-lab/icon-lab.spec.ts --project=chromium`

Expected: FAIL because `/icon-lab/` and its cards do not exist.

### Task 2: Build the complete catalogue and controller

**Files:**
- Create: `frontend/public/icon-lab/index.html`
- Create: `frontend/public/icon-lab/lab.js`

**Interfaces:**
- Consumes: browser DOM and button click events.
- Produces: 50 `[data-icon-card]` articles, five `[data-family]` sections, `.is-paused` state, active family filters, replay state, compact/expanded density.

- [ ] **Step 1: Add semantic catalogue markup**

Each card uses this public contract:

```html
<article class="study" data-icon-card data-family-name="register">
  <header><span>01</span><h2>Offset register</h2></header>
  <div class="stage" aria-label="Offset register animated mark">...</div>
  <div class="frames" aria-hidden="true">...</div>
</article>
```

- [ ] **Step 2: Add the minimal controller**

```js
const root = document.body
document.querySelector('[data-pause]').addEventListener('click', (event) => {
  const paused = root.classList.toggle('is-paused')
  event.currentTarget.textContent = paused ? 'Play animations' : 'Pause animations'
})
```

- [ ] **Step 3: Run the contract and confirm structural failures remain only for styling-dependent behavior**

Run: `npx playwright test tests/icon-lab/icon-lab.spec.ts --project=chromium`

Expected: catalogue/control assertions pass.

### Task 3: Implement icon geometry and animation

**Files:**
- Create: `frontend/public/icon-lab/styles.css`

**Interfaces:**
- Consumes: shared `.mark`, `.piece`, `.frames`, `data-variant`, and family classes from the HTML.
- Produces: 50 visibly distinct marks, animated stages, static keyframe strips, responsive layout, focus states, and reduced-motion behavior.

- [ ] **Step 1: Define Record tokens and responsive lab layout**

```css
:root {
  --canvas: #090e14;
  --surface: #0e151e;
  --raised: #131c27;
  --line: #233041;
  --text: #f2f5f8;
  --muted: #96a3b4;
  --accent: #7c5cff;
}
```

- [ ] **Step 2: Implement the five family grammars and ten variants per family**

Use transforms, stroke progress, and opacity for animation. Geometry is built from unique inline SVG compositions; no bitmap or external icon asset is allowed.

- [ ] **Step 3: Implement pause, replay, hover/focus, compact view, and reduced motion**

```css
.is-paused *, .is-paused *::before, .is-paused *::after { animation-play-state: paused !important; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
}
```

- [ ] **Step 4: Run focused tests**

Run: `npx playwright test tests/icon-lab/icon-lab.spec.ts --project=chromium`

Expected: PASS.

### Task 4: Visual verification and production isolation

**Files:**
- Modify if required: `frontend/tests/icon-lab/icon-lab.spec.ts`

**Interfaces:**
- Consumes: completed lab at `/icon-lab/index.html`.
- Produces: verified desktop/mobile layout and proof the main frontend still builds.

- [ ] **Step 1: Inspect the lab at desktop and mobile widths**

Verify 1440px and 390px layouts, no horizontal page overflow, readable labels, visible focus, and working filters.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: Vite build exits 0 and copies `icon-lab/` without adding it to the React bundle.

- [ ] **Step 3: Run the complete focused suite once more**

Run: `npx playwright test tests/icon-lab/icon-lab.spec.ts --project=chromium`

Expected: PASS with 1 passed test and no console errors.
