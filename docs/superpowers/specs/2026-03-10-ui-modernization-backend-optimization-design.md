# UI Modernization & Backend Optimization Design

**Date:** 2026-03-10
**Status:** Approved

## Overview

Two-track project to (1) modernize the entire app UI to match the cinematic landing page aesthetic and (2) optimize the backend for Render free-tier hosting constraints.

**Constraints:**
- Render free tier: 512MB RAM, shared CPU, sleeps after 15min inactivity
- Zero external cost (no Redis, no paid services)
- Must maintain mobile responsiveness (bottom nav, compact layouts)

---

## Track 1: Backend Performance (Zero-Cost)

### 1.1 Response Compression

Add `compression` middleware to NestJS main.ts. Gzip reduces JSON payloads ~70%.

```
npm install compression @types/compression
```

Apply in `main.ts` before any route handlers.

### 1.2 In-Memory Cache Layer

Use `CacheModule` from `@nestjs/common` (ships with NestJS 9). No separate `@nestjs/cache-manager` package needed.

```
npm install cache-manager@4
```

> **Note:** NestJS 9 uses `CacheModule.register()` from `@nestjs/common`. The newer `@nestjs/cache-manager` package is for NestJS 10+.

**Cache TTLs by endpoint type:**

| Endpoint Category | TTL | Examples |
|---|---|---|
| Static reference data | 5 min | Exercise list, categories, wallets list |
| Dashboard summaries | 30s | Finance summary, habits summary, workout stats |
| Spotify stats/tops | 60s | Top tracks, top artists, listening stats |
| Wallet balances | 15s | Computed balance aggregations |
| User-mutated data | 0 (no cache) | POST/PUT/DELETE — bust related caches on write |

**Memory limits:** Set `max: 500` items on the in-memory store to prevent OOM on 512MB Render instance. Use LRU eviction (default in cache-manager).

**Implementation:** Use `@CacheKey()` and `@CacheTTL()` decorators on controller methods. Add `CacheInterceptor` globally or per-controller.

**Cache invalidation on mutations:** Inject `CACHE_MANAGER` in services that handle POST/PUT/DELETE. On write operations, call `cacheManager.del(relatedKey)` to bust stale entries for the affected resource.

### 1.3 Cold Start Optimization

- **Keep self-ping** at 4min interval (already in main.ts)
- **Lazy-load heavy modules:** Use NestJS v9 `LazyModuleLoader` for Spotify and Agents modules. Remove them from `AppModule.imports` and instead load on first request via `lazyModuleLoader.load(() => AgentsModule)` in a lightweight facade controller. This requires creating thin proxy controllers that trigger lazy loading.
- **Reduce TypeORM boot time:** Ensure `synchronize: false` (already set), minimize entity scanning overhead
- **Startup probe endpoint:** Add `GET /api/health/ready` that returns 200 only after all modules are initialized. Frontend uses this to show "connecting..." state.

### 1.4 Query Optimization

**Database indexes (migration):**
- `app_transaction.transactionDate` — filtered in every transaction query
- `app_transaction.walletId` — wallet-scoped queries
- `app_transaction.categoryId` — category filters
- `app_habit_entry.date` — calendar queries
- `app_habit_entry.habitId` — per-habit lookups
- `app_stream.playedAt` — timeframe-scoped Spotify queries

**Query improvements:**
- Add `.select()` to TypeORM queries — only fetch needed columns
- Limit eager loading depth on workout sessions (don't load sets.exercise.category by default)
- Ensure all list endpoints enforce pagination with max limit (200)

### 1.5 Frontend-Side Performance

**Stale-while-revalidate pattern in API client (`api.js`):**
- Cache GET responses in memory with timestamp
- On subsequent GET, return cached data immediately + fetch fresh in background
- If fresh data differs, update UI with smooth transition
- Cache survives within session, cleared on logout
- **Invalidation on mutations:** POST/PUT/DELETE calls automatically clear cached entries matching the same URL prefix (e.g., POST to `/finance/transactions` clears all cached `/finance/transactions*` entries)

**Optimistic updates:**
- When toggling a habit entry, update UI immediately, revert on error
- When deleting a transaction, remove from list immediately

**Pre-fetching:**
- On login success, pre-fetch dashboard data, wallet list, habit summary in parallel
- On sidebar hover (desktop), pre-fetch that section's data

---

## Track 2: UI Modernization — Full Cinematic + Liveliness

### 2.1 Global Ambient Background

**Component:** `<GradientMesh />`
- 2-3 animated gradient orbs (cyan, violet, blue)
- Positioned absolute behind all authenticated page content
- Rendered once at Layout level (persists across navigation)
- Reduced opacity (0.15-0.25) to not compete with data
- CSS `will-change: transform` for GPU acceleration
- Orbs animate position on 10-15s ease-in-out cycles (match landing)
- Add very subtle micro-particles (CSS-only floating specs)

**Placement:** Inside `Layout.jsx`, behind `.content` div. Only on authenticated pages (not landing/auth).

### 2.2 Depth & Layering System

**Glass depth levels (new CSS variables):**
- `--glass-bg-deep: rgba(15, 23, 42, 0.3)` — background layer
- `--glass-bg: rgba(15, 23, 42, 0.6)` — content layer (existing)
- `--glass-bg-elevated: rgba(15, 23, 42, 0.8)` — interactive/foreground layer

**Card parallax:**
- On desktop: cards shift subtly on mouse move via CSS `perspective(1000px)` + JS mousemove handler
- Lightweight implementation: single event listener on `.content`, calculate offset per card based on position
- Disabled on mobile (performance)

**Stacked card overlaps:**
- Stat cards in the grid overlap by ~4px with progressive z-index
- Creates a "card deck" feel vs flat grid
- Implemented via negative margin + z-index on `.stat-grid` children

**Shadow depth scale:**
- Background elements: `0 8px 32px rgba(0,0,0,0.2)`
- Content cards: `0 4px 16px rgba(0,0,0,0.3)`
- Elevated/hover: `0 12px 40px rgba(0,0,0,0.4)` + accent color glow

### 2.3 Card System Upgrade

**Base card enhancements:**
- Glow shadow on hover: `box-shadow: 0 8px 40px rgba(accent, 0.08)`
- `translateY(-4px)` lift on hover with spring easing
- Domain accent borders: Finance=amber, Habits=purple, Spotify=cyan, Workout=green
- Scroll-reveal: `IntersectionObserver` triggers fade-in + slide-up (staggered per card)

**Interactive cards:**
- Scale(0.98) on press, back to 1.0 on release
- Brief glow pulse on click

### 2.4 Stat Cards Redesign

**Visual upgrades:**
- Large value text with gradient color (accent gradient like landing headline)
- Animated number count-up on load and data change (expand existing `AnimatedNumber`)
- Icon with colored glow background circle (like landing feature icons)
- Mini sparkline below value showing 7-day trend (tiny SVG, ~30px tall)
- Subtle breathing glow on the accent color

**Implementation:** Rewrite existing `StatCard` component in `shared/` (currently accepts only `label, value, subtitle`). Add `trend` prop (array of numbers) for sparkline, `accentColor` prop for domain theming, `icon` prop. Update all existing call sites.

**Backend support for sparklines:** Extend summary endpoints to return `trend` arrays:
- `/finance/transactions/summary` → add `dailyTotals: number[]` (last 7 days)
- `/habits/summary` → add `dailyCompletions: number[]` (last 7 days)
- `/workout/sessions` stats → add `weeklyVolume: number[]` (last 7 days)
- These are computed via SQL `GROUP BY date` queries, added to existing summary logic.

### 2.5 Navigation Polish

**Sidebar (desktop):**
- Animated active indicator: sliding pill background that transitions between nav items
- Hover glow on nav items
- Section activity badges: small animated dot next to sections with recent activity

**Bottom nav (mobile):**
- Glass blur background: `backdrop-filter: blur(20px)`
- Top edge glow line (1px gradient in accent color)
- Active item: filled icon + subtle scale bump

**Page transitions:**
- CSS-only approach (no framer-motion dependency): use CSS `@keyframes` with a route wrapper component that triggers animation classes on mount
- Enter: fade-in + translateY(8px→0) over 200ms via `animation` property
- No exit animation (would require animation library) — keep transitions snappy
- Implemented via a `<PageTransition>` wrapper that applies animation class on mount

### 2.6 Charts & Data Visualization

**Chart.js global theme:**
- Dark grid lines: `rgba(255,255,255,0.06)`
- Gradient fills on area/bar charts (color to transparent)
- Rounded bar caps
- Custom tooltip with glass morphism styling
- Chart containers get glass card treatment with glow

**Loading states:**
- Animated shimmer gradient (not just pulse) on skeleton placeholders
- Skeleton shapes match the actual chart/card dimensions

### 2.7 Page Headers

Each authenticated page gets a cinematic header:
- Large bold title (clamp sizing like landing)
- Domain icon with glow background
- Accent gradient underline (48px wide, 3px tall)
- Optional subtitle text
- Consistent across all pages via `<PageHeader icon="" title="" subtitle="" accentColor="" />` component

### 2.8 Micro-Animations

**Global:**
- Button press: `scale(0.98)` + subtle shadow change
- Success states: brief green glow pulse (e.g., after habit toggle)
- List items: staggered fade-in with 50ms delay per item
- Number changes: animated count transitions (spring easing)
- Skeleton-to-content: smooth morph (opacity crossfade, not snap)

**Page-specific:**
- **Finance:** Donut chart fills on load, transaction type indicators pulse on hover, wallet cards glow proportional to balance
- **Habits:** Calendar cells with animated fill, progress rings per habit (SVG), streak counter with subtle fire glow
- **Workout:** Active timer with pulsing ring, set completion checkmarks animate, volume bar fills live
- **Spotify:** Now-playing card with album-art-dominant-color glow, waveform bars animation, listening clock fills real-time

### 2.9 Rich Data Density

**Home dashboard overhaul:**
- Packed widget grid replacing current sparse layout
- Mini-widgets: today's habits ring, last workout card, spending snapshot, Spotify now-playing, cross-domain activity feed
- Each widget is a glass card with domain accent color
- Activity feed: combine last 5 items from each domain (recent transactions, habit completions, workout sessions, Spotify plays) sorted by timestamp. No new backend endpoint needed — frontend fetches existing endpoints in parallel and merges client-side.

**Inline data everywhere:**
- Sparklines next to stat values (7-day trends)
- Status badges on nav items (unfinished habit count, active workout indicator)
- Context-aware quick actions (floating bar or inline buttons)

### 2.10 Responsive Considerations

All cinematic features degrade gracefully on mobile:
- Gradient mesh: reduce to 2 orbs, smaller size, slower animation
- Card parallax: disabled on touch devices
- Animations: respect `prefers-reduced-motion`
- Stat card overlaps: flatten to standard grid on mobile
- Sparklines: still shown but simplified

---

## Implementation Order

**Phase 1 — Backend performance (highest impact, unblocks everything):**
1. Add compression middleware
2. Add in-memory caching layer
3. Database indexes migration
4. Query optimizations
5. Frontend stale-while-revalidate API client

**Phase 2 — Global UI foundation:**
6. `prefers-reduced-motion` media query foundation (wrap all animations in this check from the start)
7. GradientMesh component + Layout integration
8. Glass depth system CSS variables
9. PageHeader component
10. Card system upgrade (glow, hover, scroll-reveal)
11. Navigation polish (sidebar pill, bottom nav glass)

**Phase 3 — Component-level upgrades:**
12. StatCard redesign (gradients, sparklines, animations)
13. Backend: add trend data to summary endpoints
14. AnimatedNumber expansion
15. Chart.js global theme
16. Micro-animations system (button press, list stagger, success glow)
17. Skeleton upgrade (shimmer)

**Phase 4 — Page-specific liveliness:**
18. Home dashboard overhaul (widget grid, activity feed)
19. Finance page enhancements
20. Habits page enhancements (rings, calendar animations)
21. Workout page enhancements
22. Spotify page enhancements

**Phase 5 — Polish:**
23. Page transitions (CSS-only)
24. Card parallax (desktop, with RAF throttling)
25. Micro-particles
26. Status badges on nav

---

## Files Affected

**Backend (new/modified):**
- `backend/src/main.ts` — compression middleware
- `backend/src/app.module.ts` — cache module registration
- `backend/src/migrations/TIMESTAMP-add-indexes.ts` — new migration
- Various service files — `@CacheKey`, `@CacheTTL` decorators, `.select()` optimizations
- `backend/package.json` — add `compression`, `@nestjs/cache-manager`, `cache-manager`

**Frontend (new):**
- `frontend/src/components/GradientMesh.jsx` — ambient background
- `frontend/src/components/PageHeader.jsx` — cinematic page headers
- `frontend/src/components/Sparkline.jsx` — inline mini-charts
- `frontend/src/components/ProgressRing.jsx` — animated SVG rings
- `frontend/src/components/ScrollReveal.jsx` — intersection observer wrapper
- `frontend/src/hooks/useParallax.js` — card parallax hook

**Frontend (modified):**
- `frontend/src/styles.css` — glass depth system, animation keyframes, card upgrades
- `frontend/src/components/shared/` — StatCard, AnimatedNumber, skeletons
- `frontend/src/components/Layout.jsx` — GradientMesh integration
- `frontend/src/components/Sidebar.jsx` — animated active pill, activity badges
- `frontend/src/api.js` — stale-while-revalidate cache
- All page files — PageHeader usage, domain accent colors, micro-animations

## Success Criteria

- API response times < 200ms for cached endpoints (warm)
- Cold start completes in < 5s (measured from first request)
- Frontend shows cached data within 50ms, fresh data within 500ms
- Every page has ambient gradient background, scroll-reveal cards, animated stats
- Navigation feels fluid with page transitions and animated active states
- App feels alive: pulsing indicators, animated numbers, progress rings, sparklines
- Mobile experience maintains all visual richness with graceful degradation
- Lighthouse performance score > 85 (currently likely lower due to large bundle)
