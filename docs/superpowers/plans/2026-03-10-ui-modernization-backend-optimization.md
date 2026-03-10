# UI Modernization & Backend Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the app UI to a cinematic glass-morphism aesthetic matching the landing page, and optimize the backend for Render free-tier performance.

**Architecture:** Backend gets compression, in-memory caching (NestJS 9 CacheModule), database indexes, and query optimization. Frontend gets an ambient gradient mesh background, glass depth system, animated stat cards with sparklines, scroll-reveal animations, and page-specific liveliness features. A stale-while-revalidate API cache bridges both tracks.

**Tech Stack:** NestJS 9 + TypeORM (backend), React + Chart.js + CSS animations (frontend), PostgreSQL, Render free tier.

**Spec:** `docs/superpowers/specs/2026-03-10-ui-modernization-backend-optimization-design.md`

---

## Chunk 1: Backend Performance

### Task 1: Response Compression

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Install compression package**

```bash
cd backend && npm install compression && npm install -D @types/compression
```

- [ ] **Step 2: Add compression middleware to main.ts**

In `backend/src/main.ts`, add import at top:
```typescript
import compression from 'compression';
```

Then add `app.use(compression());` immediately after the body-parser configuration (after `app.use(bodyParser.urlencoded(...))`), before `app.setGlobalPrefix("api")`.

- [ ] **Step 3: Verify build**

```bash
cd backend && npm run build
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/main.ts
git commit -m "perf: add gzip compression middleware"
```

---

### Task 2: In-Memory Cache Layer

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/finance/transactions/transactions.controller.ts`
- Modify: `backend/src/finance/wallets/wallets.controller.ts`
- Modify: `backend/src/finance/categories/categories.controller.ts` (or equivalent)
- Modify: `backend/src/habits/habits/habits.controller.ts`
- Modify: `backend/src/workout/exercises/exercises.controller.ts` (or equivalent)

- [ ] **Step 1: Install cache-manager v4**

```bash
cd backend && npm install cache-manager@4
```

- [ ] **Step 2: Register CacheModule in AppModule**

In `backend/src/app.module.ts`, add import:
```typescript
import { CacheModule } from '@nestjs/common';
```

Add to the `imports` array (after ConfigModule, before TypeOrmModule):
```typescript
CacheModule.register({
  isGlobal: true,
  ttl: 30, // default 30s
  max: 500, // LRU eviction at 500 items
}),
```

- [ ] **Step 3: Add caching to read-heavy controller endpoints**

For each controller that handles GET requests for reference data or summaries, add `@UseInterceptors(CacheInterceptor)` and `@CacheTTL()` decorators. Import from `@nestjs/common`:

```typescript
import { CacheInterceptor, CacheTTL, UseInterceptors } from '@nestjs/common';
```

Apply to specific GET methods:
- Exercise list endpoints: `@CacheTTL(300)` (5 min)
- Category list endpoints: `@CacheTTL(300)` (5 min)
- Wallet list endpoints: `@CacheTTL(15)`
- Finance summary: `@CacheTTL(30)`
- Habits summary: `@CacheTTL(30)`
- Spotify stats: `@CacheTTL(60)`

- [ ] **Step 4: Add cache invalidation to mutation endpoints**

In services that handle create/update/delete, inject `CACHE_MANAGER`:

```typescript
import { CACHE_MANAGER } from '@nestjs/common';
import { Cache } from 'cache-manager';

constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
```

After mutations, call `await this.cacheManager.reset()` (simple approach) or `await this.cacheManager.del(specificKey)` for targeted invalidation.

- [ ] **Step 5: Verify build**

```bash
cd backend && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "perf: add in-memory caching layer with LRU eviction"
```

---

### Task 3: Database Indexes Migration

**Files:**
- Create: `backend/src/migrations/{TIMESTAMP}-add-performance-indexes.ts`

- [ ] **Step 1: Create migration file**

Create `backend/src/migrations/1762200000000-add-performance-indexes.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1762200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Transaction indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transaction_date" ON "app_transaction" ("transactionDate")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transaction_wallet" ON "app_transaction" ("walletId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transaction_category" ON "app_transaction" ("categoryId")`);

    // Habit entry indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_habit_entry_date" ON "app_habit_entry" ("date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_habit_entry_habit" ON "app_habit_entry" ("habitId")`);

    // Stream indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_stream_played_at" ON "app_stream" ("playedAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_wallet"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_habit_entry_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_habit_entry_habit"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stream_played_at"`);
  }
}
```

- [ ] **Step 2: Run migration**

```bash
cd backend && npx typeorm migration:run -d dist/dataSource.js
```

If running against Render DB, use the production DATABASE_URL.

- [ ] **Step 3: Commit**

```bash
git add backend/src/migrations/
git commit -m "perf: add database indexes for common query patterns"
```

---

### Task 4: Query Optimizations

**Files:**
- Modify: `backend/src/finance/transactions/transactions.service.ts`
- Modify: `backend/src/habits/habits/habits.service.ts`
- Modify: `backend/src/workout/sessions/sessions.service.ts` (or equivalent)

- [ ] **Step 1: Optimize transactions findAll — add select clauses**

In `transactions.service.ts` `findAll()`, add `.select()` to the query builder to only fetch needed columns for list views:

```typescript
.select([
  't.id', 't.name', 't.amount', 't.isIncome', 't.type',
  't.transactionDate', 't.note',
  'category.id', 'category.name', 'category.colour',
  'wallet.id', 'wallet.name',
])
```

- [ ] **Step 2: Optimize habits getAllStreaks — single query**

In `habits.service.ts` `getAllStreaks()`, replace the N+1 pattern (iterating over habits and fetching entries per habit) with a single query that JOINs habits with their entries and groups results.

- [ ] **Step 3: Limit eager loading on workout sessions**

In the sessions service, ensure `getActiveSession()` and list queries use `select` to avoid loading full nested entity trees. Only load `sets.exercise.category` when viewing a single session detail.

- [ ] **Step 4: Verify build and test**

```bash
cd backend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/
git commit -m "perf: optimize database queries with select clauses and reduced eager loading"
```

---

### Task 5: Frontend Stale-While-Revalidate API Client

**Files:**
- Modify: `frontend/src/api.js`

- [ ] **Step 1: Add SWR cache to api.js**

Add a cache Map at the top of `api.js`:

```javascript
const swrCache = new Map(); // key: url, value: { data, timestamp }
const SWR_MAX_AGE = 30_000; // 30s before background refresh
```

- [ ] **Step 2: Modify the `get` method to use SWR**

Wrap the existing `get` method to check cache first:

```javascript
async get(path) {
  const cached = swrCache.get(path);
  if (cached && Date.now() - cached.timestamp < SWR_MAX_AGE) {
    // Return cached data immediately, refresh in background
    apiFetch(path).then(fresh => {
      swrCache.set(path, { data: fresh, timestamp: Date.now() });
    }).catch(() => {}); // silent background refresh
    return cached.data;
  }
  const data = await apiFetch(path);
  swrCache.set(path, { data, timestamp: Date.now() });
  return data;
},
```

- [ ] **Step 3: Add cache invalidation on mutations**

In `post`, `put`, `delete`, `patch` methods, clear related cache entries:

```javascript
function invalidateCache(path) {
  const prefix = '/' + path.split('/').slice(1, 2).join('/'); // e.g. "/finance"
  for (const key of swrCache.keys()) {
    if (key.startsWith(prefix)) swrCache.delete(key);
  }
}
```

Call `invalidateCache(path)` after each successful mutation.

- [ ] **Step 4: Add clearCache for logout**

Export a `clearApiCache()` function that calls `swrCache.clear()`. Call it from the logout handler.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api.js
git commit -m "perf: add stale-while-revalidate caching to API client"
```

---

## Chunk 2: UI Foundation

### Task 6: Reduced-Motion Foundation

**Files:**
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add reduced-motion media query at the end of styles.css**

```css
/* ===== Accessibility: Reduced Motion ===== */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/styles.css
git commit -m "a11y: add prefers-reduced-motion foundation"
```

---

### Task 7: GradientMesh Component

**Files:**
- Create: `frontend/src/components/GradientMesh.jsx`
- Create: `frontend/src/components/GradientMesh.css`
- Modify: `frontend/src/components/Layout.jsx`

- [ ] **Step 1: Create GradientMesh.css**

Create `frontend/src/components/GradientMesh.css` with the animated orbs and micro-particles. Copy the orb styling approach from `Landing.css` (gradient-orb--1, --2, --3) but with reduced opacity (0.15-0.2) and the orbs sized for app context.

Key CSS:
```css
.gradient-mesh { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.gradient-mesh .orb { position: absolute; border-radius: 50%; filter: blur(100px); will-change: transform; }
.gradient-mesh .orb--1 { width: 500px; height: 500px; opacity: 0.15; background: radial-gradient(circle, rgba(125,211,252,0.5) 0%, transparent 70%); top: -10%; left: -10%; animation: meshFloat1 12s ease-in-out infinite; }
/* ... orb--2, orb--3 with violet and blue ... */
/* Micro-particles */
.gradient-mesh .particles { /* CSS-only floating dots using radial-gradient background */ }
```

Include `@media (max-width: 640px)` to reduce orb count/size on mobile.

- [ ] **Step 2: Create GradientMesh.jsx**

```jsx
import React from 'react'
import './GradientMesh.css'

export default function GradientMesh() {
  return (
    <div className="gradient-mesh" aria-hidden="true">
      <div className="orb orb--1" />
      <div className="orb orb--2" />
      <div className="orb orb--3" />
      <div className="particles" />
    </div>
  )
}
```

- [ ] **Step 3: Integrate into Layout.jsx**

In `frontend/src/components/Layout.jsx`, import and render `<GradientMesh />` as the first child inside the root div (before Sidebar), so it sits behind all content:

```jsx
import GradientMesh from './GradientMesh'
// ...
return (
  <div className={'app-layout' + (collapsed ? ' sidebar-collapsed' : '')}>
    <GradientMesh />
    <Sidebar ... />
    <main className="content">...</main>
    ...
  </div>
)
```

- [ ] **Step 4: Verify visually — run dev server, check gradient appears behind content**

```bash
cd frontend && npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/GradientMesh.jsx frontend/src/components/GradientMesh.css frontend/src/components/Layout.jsx
git commit -m "feat: add animated gradient mesh background to app layout"
```

---

### Task 8: Glass Depth System

**Files:**
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add glass depth CSS variables**

In the `:root` section of `styles.css`, add:

```css
--glass-bg-deep: rgba(15, 23, 42, 0.3);
--glass-bg-elevated: rgba(15, 23, 42, 0.8);
--shadow-depth-bg: 0 8px 32px rgba(0,0,0,0.2);
--shadow-depth-content: 0 4px 16px rgba(0,0,0,0.3);
--shadow-depth-elevated: 0 12px 40px rgba(0,0,0,0.4);
```

- [ ] **Step 2: Update .card styles**

Update the `.card` class to use the depth shadow and add hover glow:

```css
.card {
  /* existing styles... */
  box-shadow: var(--shadow-depth-content);
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-depth-elevated), 0 0 30px rgba(125, 211, 252, 0.06);
}
.card.interactive:hover {
  transform: translateY(-4px);
}
.card.interactive:active {
  transform: scale(0.98);
}
```

- [ ] **Step 3: Update .stat-grid for stacked card overlap effect**

```css
.stat-grid > * {
  position: relative;
}
.stat-grid > *:nth-child(n+2) {
  margin-top: -2px;
  z-index: 1;
}
.stat-grid > *:nth-child(n+3) {
  z-index: 2;
}
```

And flatten on mobile:
```css
@media (max-width: 640px) {
  .stat-grid > * { margin-top: 0 !important; z-index: auto !important; }
}
```

- [ ] **Step 4: Update light theme depth variants**

In `[data-theme="light"]`, add corresponding lighter shadow values.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles.css
git commit -m "feat: add glass depth system with layered shadows and card hover effects"
```

---

### Task 9: PageHeader Component

**Files:**
- Create: `frontend/src/components/PageHeader.jsx`
- Modify: All page files that currently have `<h2>` headers

- [ ] **Step 1: Create PageHeader.jsx**

```jsx
import React from 'react'
import Icon from './icons/Icon'

export default function PageHeader({ icon, title, subtitle, accentColor = 'var(--color-accent)' }) {
  return (
    <div className="page-header">
      {icon && (
        <div className="page-header-icon" style={{ background: `${accentColor}20`, color: accentColor }}>
          <Icon name={icon} size={28} />
        </div>
      )}
      <div>
        <h1 className="page-header-title">{title}</h1>
        <div className="page-header-underline" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add PageHeader CSS to styles.css**

```css
.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.page-header-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.page-header-title {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
}
.page-header-underline {
  width: 48px;
  height: 3px;
  border-radius: 2px;
  margin-top: 0.35rem;
}
.page-header-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0.25rem 0 0;
}
```

- [ ] **Step 3: Replace `<h2>` headers in all app pages**

Update each page file to use `<PageHeader>`:
- `Home.jsx`: `<PageHeader icon="home" title="Dashboard" accentColor="var(--color-accent)" />`
- `Finance.jsx`: `<PageHeader icon="wallet" title={t('finance.title')} accentColor="#fbbf24" />`
- `Habits.jsx`: `<PageHeader icon="heart-pulse" title={t('habits.title')} accentColor="#a78bfa" />`
- `WorkoutHistory.jsx`: `<PageHeader icon="bar-chart-3" title="Workout History" accentColor="#4ade80" />`
- `Workout.jsx`: `<PageHeader icon="dumbbell" title="Workout" accentColor="#4ade80" />`
- `SpotifyPersonal.jsx`: `<PageHeader icon="music" title="Spotify" accentColor="var(--color-accent)" />`
- `FinanceTransactions.jsx`: `<PageHeader icon="receipt" title={t('finance.transactions')} accentColor="#fbbf24" />`
- `FinanceWallets.jsx`, `FinanceImport.jsx`, `HabitsImport.jsx`, etc.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/PageHeader.jsx frontend/src/styles.css frontend/src/pages/
git commit -m "feat: add cinematic PageHeader component and replace flat headers"
```

---

### Task 10: Card System & Scroll-Reveal

**Files:**
- Create: `frontend/src/components/ScrollReveal.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Create ScrollReveal.jsx**

```jsx
import React, { useRef, useEffect, useState } from 'react'

export default function ScrollReveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.1, rootMargin: '50px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${visible ? 'visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Add scroll-reveal CSS**

```css
.scroll-reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.scroll-reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

- [ ] **Step 3: Wrap key sections in ScrollReveal on major pages**

In `Finance.jsx`, `Habits.jsx`, `Home.jsx`, etc., wrap card sections with `<ScrollReveal>`:

```jsx
<ScrollReveal>
  <div className="stat-grid">...</div>
</ScrollReveal>
<ScrollReveal delay={100}>
  <div className="section">...</div>
</ScrollReveal>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ScrollReveal.jsx frontend/src/styles.css frontend/src/pages/
git commit -m "feat: add scroll-reveal animations to page sections"
```

---

### Task 11: Navigation Polish

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add animated active pill to sidebar**

In `styles.css`, update `.nav-link.active` to use a sliding background pill:

```css
.sidebar .nav-link {
  position: relative;
  transition: color var(--transition-fast), background var(--transition-normal);
}
.sidebar .nav-link.active {
  background: var(--color-accent-muted);
  box-shadow: 0 0 20px rgba(125, 211, 252, 0.08);
}
.sidebar .nav-link:hover:not(.active) {
  background: rgba(125, 211, 252, 0.05);
}
```

- [ ] **Step 2: Polish mobile bottom nav**

Update the mobile sidebar CSS to add glass blur and top glow:

```css
@media (max-width: 640px) {
  .sidebar {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    background: var(--glass-bg) !important;
    border-top: 1px solid var(--glass-border);
    box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
  }
  .sidebar::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
    opacity: 0.4;
  }
  .sidebar .nav-link.active {
    transform: scale(1.05);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles.css frontend/src/components/Sidebar.jsx
git commit -m "feat: polish sidebar with active pill animation and glass bottom nav"
```

---

## Chunk 3: Component-Level Upgrades

### Task 12: StatCard Redesign

**Files:**
- Modify: `frontend/src/components/shared/StatCard.jsx`
- Create: `frontend/src/components/Sparkline.jsx`
- Create: `frontend/src/components/ProgressRing.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Create Sparkline.jsx**

```jsx
import React from 'react'

export default function Sparkline({ data = [], color = 'var(--color-accent)', width = 80, height = 24 }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  )
}
```

- [ ] **Step 2: Create ProgressRing.jsx**

```jsx
import React from 'react'

export default function ProgressRing({ value = 0, size = 48, strokeWidth = 4, color = 'var(--color-accent)' }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(value, 100) / 100) * circumference

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  )
}
```

- [ ] **Step 3: Rewrite StatCard.jsx**

Replace the existing 12-line StatCard with an enhanced version:

```jsx
import React from 'react'
import Icon from '../icons/Icon'
import Sparkline from '../Sparkline'

export function StatCard({ label, value, subtitle, icon, accentColor, trend }) {
  return (
    <div className="stat-card">
      {icon && (
        <div className="stat-card-icon" style={{
          background: accentColor ? `${accentColor}15` : 'var(--color-accent-muted)',
          color: accentColor || 'var(--color-accent)',
        }}>
          <Icon name={icon} size={20} />
        </div>
      )}
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accentColor ? {
        background: `linear-gradient(135deg, ${accentColor}, color-mix(in srgb, ${accentColor} 60%, white))`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      } : undefined}>
        {value}
      </div>
      {trend && trend.length > 1 && (
        <div style={{ marginTop: '0.35rem' }}>
          <Sparkline data={trend} color={accentColor || 'var(--color-accent)'} />
        </div>
      )}
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  )
}
```

- [ ] **Step 4: Add stat-card CSS to styles.css**

```css
.stat-card {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  box-shadow: var(--shadow-depth-content);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-depth-elevated);
}
.stat-card-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}
.stat-subtitle {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-top: 0.15rem;
}
```

- [ ] **Step 5: Update all StatCard call sites**

The new StatCard is backward-compatible (icon, accentColor, trend are all optional). Existing call sites (`label`, `value`, `subtitle`) will still work. Gradually add `icon` and `accentColor` props to page-specific usages:

- Finance pages: `accentColor="#fbbf24"` + finance-relevant icons
- Habits pages: `accentColor="#a78bfa"`
- Workout pages: `accentColor="#4ade80"`
- Spotify/Home: `accentColor="var(--color-accent)"`

- [ ] **Step 6: Export new components from shared/index.js**

Add Sparkline and ProgressRing to the barrel file.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: redesign StatCard with gradient values, icons, and sparklines"
```

---

### Task 13: Backend Trend Data Endpoints

**Files:**
- Modify: `backend/src/finance/transactions/transactions.service.ts`
- Modify: `backend/src/habits/habits/habits.service.ts`
- Modify: `backend/src/workout/sessions/sessions.service.ts` (or equivalent)

- [ ] **Step 1: Add daily totals to finance summary**

In `transactions.service.ts` `getSummary()`, add a query for last 7 days of daily expense totals:

```typescript
const dailyTotals = await this.repo
  .createQueryBuilder('t')
  .select("DATE(t.transactionDate)", 'date')
  .addSelect("SUM(CASE WHEN t.isIncome = false THEN t.amount ELSE 0 END)", 'total')
  .where('t.accountId = :accountId', { accountId: account.id })
  .andWhere('t.transactionDate >= :from', { from: sevenDaysAgo })
  .groupBy('date')
  .orderBy('date', 'ASC')
  .getRawMany();
```

Return `dailyTotals` as part of the summary response.

- [ ] **Step 2: Add daily completions to habits summary**

In `habits.service.ts`, add a method or extend `getAllStreaks()` to return last 7 days of completion counts:

```typescript
const dailyCompletions = await this.entryRepo
  .createQueryBuilder('e')
  .select("e.date", 'date')
  .addSelect("COUNT(*)", 'count')
  .innerJoin('e.habit', 'h')
  .where('h.accountId = :accountId', { accountId: account.id })
  .andWhere("e.status = 'success'")
  .andWhere('e.date >= :from', { from: sevenDaysAgo })
  .groupBy('e.date')
  .orderBy('e.date', 'ASC')
  .getRawMany();
```

- [ ] **Step 3: Add weekly volume to workout stats**

Similar pattern: GROUP BY date for last 7 days of total volume (weight * reps).

- [ ] **Step 4: Verify build**

```bash
cd backend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/
git commit -m "feat: add 7-day trend data to summary endpoints for sparklines"
```

---

### Task 14: Chart.js Global Theme

**Files:**
- Create: `frontend/src/chartTheme.js`
- Modify: Pages that use Chart.js (Finance.jsx, SpotifyPersonal.jsx)

- [ ] **Step 1: Create chartTheme.js**

```javascript
import { Chart as ChartJS } from 'chart.js'

export function applyChartTheme() {
  ChartJS.defaults.color = 'rgba(230, 238, 246, 0.45)'
  ChartJS.defaults.borderColor = 'rgba(255, 255, 255, 0.06)'
  ChartJS.defaults.font.family = "'Inter', system-ui, sans-serif"
  ChartJS.defaults.elements.bar.borderRadius = 4
  ChartJS.defaults.elements.line.tension = 0.3
  ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)'
  ChartJS.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.08)'
  ChartJS.defaults.plugins.tooltip.borderWidth = 1
  ChartJS.defaults.plugins.tooltip.cornerRadius = 8
  ChartJS.defaults.plugins.tooltip.padding = 10
  ChartJS.defaults.plugins.legend.labels.usePointStyle = true
}
```

- [ ] **Step 2: Call applyChartTheme() in App.jsx or main entry**

Import and call once at app initialization.

- [ ] **Step 3: Update chart data configs to use gradient fills**

In Finance.jsx and SpotifyPersonal.jsx, create gradient fills for chart datasets:

```javascript
// Example for bar charts
const ctx = chartRef.current?.canvas?.getContext('2d')
if (ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 200)
  gradient.addColorStop(0, 'rgba(251, 191, 36, 0.8)')
  gradient.addColorStop(1, 'rgba(251, 191, 36, 0.1)')
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/chartTheme.js frontend/src/pages/ frontend/src/App.jsx
git commit -m "feat: add global Chart.js dark theme with gradient fills"
```

---

### Task 15: Micro-Animations System

**Files:**
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add button micro-animation**

```css
.btn {
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
}
.btn:active {
  transform: scale(0.97);
}
```

- [ ] **Step 2: Add staggered list animation**

```css
@keyframes listFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.stagger-list > * {
  animation: listFadeIn 0.3s ease both;
}
.stagger-list > *:nth-child(1) { animation-delay: 0ms; }
.stagger-list > *:nth-child(2) { animation-delay: 50ms; }
.stagger-list > *:nth-child(3) { animation-delay: 100ms; }
.stagger-list > *:nth-child(4) { animation-delay: 150ms; }
.stagger-list > *:nth-child(5) { animation-delay: 200ms; }
.stagger-list > *:nth-child(n+6) { animation-delay: 250ms; }
```

- [ ] **Step 3: Add success glow animation**

```css
@keyframes successGlow {
  0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
  50% { box-shadow: 0 0 20px 4px rgba(74, 222, 128, 0.15); }
  100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
}
.success-glow {
  animation: successGlow 0.6s ease;
}
```

- [ ] **Step 4: Add shimmer skeleton upgrade**

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg,
    var(--color-bg-elevated) 25%,
    rgba(125, 211, 252, 0.06) 50%,
    var(--color-bg-elevated) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}
```

- [ ] **Step 5: Apply stagger-list class to list components on Finance, Habits, Workout pages**

Add `className="stagger-list"` to transaction lists, habit lists, session lists.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/styles.css frontend/src/pages/
git commit -m "feat: add micro-animations system (button press, list stagger, shimmer skeletons)"
```

---

## Chunk 4: Page-Specific Liveliness

### Task 16: Home Dashboard Overhaul

**Files:**
- Rewrite: `frontend/src/pages/Home.jsx`

- [ ] **Step 1: Redesign Home.jsx as a packed widget grid**

Replace the current 3-section layout with a dense widget grid:

```jsx
<PageHeader icon="home" title="Dashboard" />

<div className="dashboard-grid">
  {/* Row 1: Key stats */}
  <ScrollReveal>
    <div className="stat-grid">
      <StatCard label="Total Workouts" value={...} icon="dumbbell" accentColor="#4ade80" trend={workoutTrend} />
      <StatCard label="Habit Streak" value={...} icon="flame" accentColor="#a78bfa" trend={habitTrend} />
      <StatCard label="Monthly Spend" value={...} icon="wallet" accentColor="#fbbf24" trend={spendTrend} />
      <StatCard label="Streams Today" value={...} icon="music" accentColor="var(--color-accent)" />
    </div>
  </ScrollReveal>

  {/* Row 2: Mini-widgets */}
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
    <ScrollReveal delay={100}>
      {/* Today's Habits widget with ProgressRing */}
      <div className="card">...</div>
    </ScrollReveal>
    <ScrollReveal delay={200}>
      {/* Recent Activity feed */}
      <div className="card">...</div>
    </ScrollReveal>
    <ScrollReveal delay={300}>
      {/* Spotify Now Playing widget */}
      <div className="card">...</div>
    </ScrollReveal>
  </div>
</div>
```

- [ ] **Step 2: Add activity feed logic**

Fetch last 5 items from each domain in parallel, merge and sort by timestamp:

```jsx
const [transactions, habitEntries, sessions, streams] = await Promise.all([
  api.get('/finance/transactions?limit=5'),
  api.get('/habits/recent?limit=5'),
  api.get('/workout/sessions?limit=5'),
  api.get('/streams/recent?limit=5'),
])
// Normalize and sort by date
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Home.jsx
git commit -m "feat: overhaul home dashboard with dense widget grid and activity feed"
```

---

### Task 17: Finance Page Enhancements

**Files:**
- Modify: `frontend/src/pages/Finance/Finance.jsx`
- Modify: `frontend/src/pages/Finance/FinanceTransactions.jsx`

- [ ] **Step 1: Add PageHeader, ScrollReveal, enhanced StatCards**

Replace the `<h2>` with `<PageHeader>`. Wrap sections in `<ScrollReveal>`. Add `accentColor="#fbbf24"` and icons to StatCards.

- [ ] **Step 2: Add gradient fills to pie chart**

Update pieData config to use gradient colors and the global chart theme.

- [ ] **Step 3: Add stagger-list to transaction lists and wallet lists**

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Finance/
git commit -m "feat: enhance Finance pages with cinematic styling and animations"
```

---

### Task 18: Habits Page Enhancements

**Files:**
- Modify: `frontend/src/pages/Habits/Habits.jsx`

- [ ] **Step 1: Add PageHeader, ScrollReveal, enhanced StatCards**

Replace header, wrap sections, add accent colors.

- [ ] **Step 2: Add ProgressRing to habit cards**

Replace the text-based success rate with a `<ProgressRing>` component in HabitCard:

```jsx
<ProgressRing value={habit.successRate || 0} size={36} color="#a78bfa" />
```

- [ ] **Step 3: Animate calendar cells**

Add CSS transition to calendar day cells so they fade in their background color:

```css
/* In Habits.jsx inline styles or a new Habits.css */
transition: background 0.3s ease, transform 0.2s ease;
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Habits/
git commit -m "feat: enhance Habits page with progress rings and animated calendar"
```

---

### Task 19: Workout Page Enhancements

**Files:**
- Modify: `frontend/src/pages/Workout/Workout.jsx`
- Modify: `frontend/src/pages/Workout/WorkoutHistory.jsx`
- Modify: `frontend/src/pages/Workout/WorkoutActive.jsx`

- [ ] **Step 1: Add PageHeader, ScrollReveal, enhanced StatCards with accentColor="#4ade80"**

- [ ] **Step 2: Add stagger-list to session cards**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Workout/
git commit -m "feat: enhance Workout pages with cinematic styling and animations"
```

---

### Task 20: Spotify Page Enhancements

**Files:**
- Modify: `frontend/src/pages/Spotify/SpotifyPersonal.jsx`
- Modify: `frontend/src/pages/Spotify/SpotifyGlobal.jsx`

- [ ] **Step 1: Add PageHeader, ScrollReveal, enhanced StatCards**

- [ ] **Step 2: Apply chart theme with gradient fills to Spotify charts**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Spotify/
git commit -m "feat: enhance Spotify pages with cinematic styling"
```

---

## Chunk 5: Polish

### Task 21: Page Transitions

**Files:**
- Create: `frontend/src/components/PageTransition.jsx`
- Modify: `frontend/src/components/Layout.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Create PageTransition.jsx**

```jsx
import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function PageTransition({ children }) {
  const location = useLocation()
  const [animClass, setAnimClass] = useState('page-enter')

  useEffect(() => {
    setAnimClass('')
    requestAnimationFrame(() => setAnimClass('page-enter'))
  }, [location.pathname])

  return <div className={`page-transition ${animClass}`}>{children}</div>
}
```

- [ ] **Step 2: Add CSS**

```css
.page-transition { will-change: opacity, transform; }
@keyframes pageEnter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.page-enter {
  animation: pageEnter 0.2s ease both;
}
```

- [ ] **Step 3: Wrap `<Outlet />` in Layout.jsx with PageTransition**

```jsx
<main className="content">
  <PageTransition><Outlet /></PageTransition>
</main>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/PageTransition.jsx frontend/src/components/Layout.jsx frontend/src/styles.css
git commit -m "feat: add CSS page enter transitions"
```

---

### Task 22: Card Parallax (Desktop)

**Files:**
- Create: `frontend/src/hooks/useParallax.js`
- Modify: `frontend/src/components/Layout.jsx`

- [ ] **Step 1: Create useParallax.js**

```javascript
import { useEffect, useRef } from 'react'

export function useParallax(containerRef, { intensity = 0.01, enabled = true } = {}) {
  const rafRef = useRef(null)

  useEffect(() => {
    if (!enabled || !containerRef.current) return
    const isTouchDevice = 'ontouchstart' in window
    if (isTouchDevice) return

    const container = containerRef.current

    function handleMouseMove(e) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect()
        const x = (e.clientX - rect.left - rect.width / 2) * intensity
        const y = (e.clientY - rect.top - rect.height / 2) * intensity
        const cards = container.querySelectorAll('.card, .stat-card')
        cards.forEach(card => {
          card.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${-y}deg) translateY(-2px)`
        })
      })
    }

    function handleMouseLeave() {
      const cards = container.querySelectorAll('.card, .stat-card')
      cards.forEach(card => { card.style.transform = '' })
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [containerRef, intensity, enabled])
}
```

- [ ] **Step 2: Apply in Layout.jsx**

```jsx
const contentRef = useRef(null)
useParallax(contentRef, { intensity: 0.005 })
// ...
<main className="content" ref={contentRef}>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useParallax.js frontend/src/components/Layout.jsx
git commit -m "feat: add subtle card parallax on desktop mousemove"
```

---

### Task 23: Micro-Particles

**Files:**
- Modify: `frontend/src/components/GradientMesh.css`

- [ ] **Step 1: Add CSS-only particle effect**

```css
.gradient-mesh .particles {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(1px 1px at 10% 20%, rgba(125,211,252,0.3) 50%, transparent 50%),
    radial-gradient(1px 1px at 30% 60%, rgba(167,139,250,0.2) 50%, transparent 50%),
    radial-gradient(1px 1px at 50% 40%, rgba(125,211,252,0.25) 50%, transparent 50%),
    radial-gradient(1px 1px at 70% 80%, rgba(96,165,250,0.2) 50%, transparent 50%),
    radial-gradient(1px 1px at 90% 30%, rgba(167,139,250,0.3) 50%, transparent 50%);
  animation: particleDrift 20s linear infinite;
}
@keyframes particleDrift {
  from { transform: translateY(0); }
  to { transform: translateY(-30px); }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/GradientMesh.css
git commit -m "feat: add CSS-only micro-particles to gradient mesh"
```

---

### Task 24: Navigation Status Badges

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`

- [ ] **Step 1: Add status badges to nav items**

Fetch habit incomplete count and active workout state. Show small animated dots:

```jsx
{incompleteHabits > 0 && (
  <span className="nav-badge">{incompleteHabits}</span>
)}
```

- [ ] **Step 2: Add badge CSS**

```css
.nav-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: var(--color-accent-text);
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Sidebar.jsx frontend/src/styles.css
git commit -m "feat: add status badges to sidebar navigation items"
```

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| Chunk 1 | 1-5 | Backend: compression, caching, indexes, query optimization, SWR client |
| Chunk 2 | 6-11 | UI foundation: reduced-motion, gradient mesh, glass depth, page headers, scroll-reveal, nav |
| Chunk 3 | 12-15 | Components: StatCard redesign, sparklines, progress rings, chart theme, micro-animations |
| Chunk 4 | 16-20 | Pages: Home dashboard overhaul, Finance/Habits/Workout/Spotify enhancements |
| Chunk 5 | 21-24 | Polish: page transitions, parallax, particles, nav badges |

Total: 24 tasks, ~80 steps. Each task is independently committable.
