# Personal Record Design System

Personal Record is a private operating system for everyday life. It connects money, routines, training, listening, series, and assistant context without flattening them into a generic dashboard.

The product line is exact and permanent:

> Everything you are, in context.

## Identity

The constellation mark connects seven domain nodes around one personal center. It represents separate records becoming useful context. It replaces the former ruled-ledger glyph everywhere customers see the product.

Personal Record should feel like a premium instrument: calm graphite hardware, sharp information hierarchy, deliberate signal colors, restrained motion, and enough density to answer a real question at a glance. It must not look like a warm paper journal, a glassmorphism template, a stack of identical cards, or a neon sci-fi prop.

## Type

- Interface, headings, and body: `Sora Variable`, self-hosted through Fontsource.
- Data, times, measurements, amounts, and technical metadata: `JetBrains Mono Variable`, self-hosted through Fontsource.
- Headings use weight and scale for hierarchy. Uppercase is reserved for very short instrument labels.
- Numeric comparisons always use tabular figures.

## Color

Core surfaces:

- Canvas `#080f18`
- Panel `#111a27`
- Raised panel `#172234`
- Primary text `#eef3f8`
- Secondary text `#9aa8ba`

Domain signals:

- Today `#3b82f6`
- Cash `#22c55e`
- Habits `#14b8a6`
- Gym `#f97316`
- Music `#ec4899`
- Series `#f59e0b`
- Assistant `#8b5cf6`
- Danger `#ef5b5b`

Signal colors identify ownership, selection, chart series, and state. They do not become full-page washes or arbitrary gradients. Never rely on color alone; pair it with labels, icons, position, or copy.

## Composition

Desktop uses a fixed 240px sidebar and a maximum 1500px, 12-column content frame. The layout is intentionally asymmetric: one dominant answer, a few supporting instruments, and dense record rows. Avoid equal-weight bento grids.

Native mobile uses a compact top bar and five stable bottom destinations: Today, Apps, Capture, Assistant, and You. Domain tabs sit inside the domain. Content respects safe areas, remains usable at 320px, and never creates horizontal page scroll.

Cards are bounded instruments, not default containers. A row, divider, shared panel, or whitespace is preferable when it expresses the relationship more clearly. Default panel radii are 8px to 12px; pills are only for compact states and segmented controls.

## Interaction

- Minimum touch target: 44px.
- Every action has default, focus-visible, active, disabled, loading, success, and error treatment where applicable.
- Focus remains visible on graphite surfaces.
- Product transitions last 140ms to 220ms and explain state or location.
- `prefers-reduced-motion` removes transforms, choreography, shimmer, and decorative loops.
- Loading keeps the final geometry stable; empty states explain the missing record and provide the next useful action.
- Errors name the failed action and the recovery path.

## Data instruments

Reusable product primitives live under `frontend/src/components/product/`:

- `InstrumentPanel` for a bounded question and its answer.
- `MetricValue` for one labeled measurement with context.
- `SignalRing` for bounded progress with a textual equivalent.
- `MiniChart` for a small trend with a nearby summary.
- `RecordRow` for inspectable source records and actions.
- `EmptyInstrument` and `LoadingInstrument` for stable non-happy states.

Charts use graphite grid lines, one dominant signal, and a text takeaway. Money uses green for income, red for expense, and neutral blue for balance or transfer. Privacy-sensitive widgets prefer ratios and status over personal titles or transaction details.

## Product domains

Today is the command center. It prioritizes unresolved capture, the daily signal, and the next action in each enabled domain.

Cash follows Cashew’s comfort: compact ledger, obvious period and currency, one-tap edit paths, visible wallet/category review, and contactless capture as a first-class flow.

Habits preserves direct daily interaction, neutral unselected controls, cadence-aware streaks, and numeric steppers.

Gym puts the active workout first, with fast set editing, previous-set context, undo, and a legible rest timer.

Music borrows the useful density of stats.fm: ranked identity, artwork, timeframe comparison, movement, and listening patterns.

Series shows TV seasons and episodes explicitly. Anime releases stay separate catalog entries connected by continuity relationships and next-release actions.

Assistant keeps contributing records, dates, freshness, and provenance visible beside generated conclusions.

## Public landing

The landing page is built after the authenticated product. Its first viewport shows a faithful live-code composition of Today, not a fake screenshot. It explains the managed service and self-hosting option honestly, uses the exact product identity, and converts with one primary action.

## Release gate

A visual change is not ready until it has been inspected on desktop, narrow desktop, tablet, 390px mobile, and 320px mobile. Verify keyboard navigation, contrast, visible focus, touch targets, reduced motion, safe-area spacing, scrolling, loading, empty, error, and offline/cache states. Native changes also require Capacitor sync and an Android debug build.

Reject any change that introduces generic feature-card grids, gradient text, decorative blobs, permanent glow, oversized type that hides useful information, emoji controls, placeholder marketing copy, or a visual-only interaction with no accessible equivalent.
