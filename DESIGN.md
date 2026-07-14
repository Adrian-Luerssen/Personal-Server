# Record design system

Customer name: **Record**
Repository name: **Personal Server**
Promise: **Keep the life you live useful.**

Record is a private system for the records that make up daily life. It connects Cash, Gym, Habits, Music, Series, and Assistant without turning them into unrelated mini brands or a generic card dashboard.

## Identity

The mark is an indexed spine: offset rails, record ticks, and one active position. Use it in one color in navigation and at app-icon scale.

The interface feels like a precise, calm instrument. The reference boards set the finish bar: confident dark composition, compact navigation, crisp data typography, selective color, and high information density. Record deliberately avoids their synthetic life scores, rainbow domain skins, equal-weight bento walls, and decorative sci-fi effects.

## Type and color

- Sora Variable for interface, headings, and body.
- JetBrains Mono Variable for money, times, measurements, episode and set numbers, ranks, dates, and source state.
- Canvas `#090e14`, surface `#0e151e`, raised `#131c27`, line `#233041`, text `#f2f5f8`.
- One Record accent: violet `#7c5cff`.
- Cyan is a comparison color. Green, amber, and red are semantic success, review, and danger colors.
- Domains are distinguished by their information, imagery, icon, units, and workflow—not page themes.

## Register grammar

The main product primitive is a register: a titled and divided group of inspectable rows. Transactions, open items, habits, workout sets, episodes, rankings, connections, and settings all use the same reliable row anatomy while keeping purpose-built controls.

Prefer registers, tables, timelines, and focused workbenches to card walls. Cards are reserved for one self-contained answer, artwork, or an active task that deserves elevation.

## Shell

Desktop uses a 224px Record rail, a 56px route bar, and a maximum 1480px content frame. The rail has explicit Today, Records, Workspace, and System groups. It has no accordions.

Native uses a compact contextual top bar and five stable bottom destinations: Today, Records, Capture, Assistant, and You. Records opens the full app index. Local navigation remains inside each page.

## Interaction

- 44px minimum touch targets.
- Visible focus on every interactive element.
- Default, hover, pressed, disabled, busy, success, and error behavior.
- Stable loading geometry; factual empty states; actionable errors; explicit cached/offline state.
- Inline undo for reversible quick writes.
- Escape closes the topmost layer and returns focus. Native back closes sheets before navigating.
- Motion lasts 120–220ms and explains state; `prefers-reduced-motion` removes transforms and animated charts.

## Domain direction

- Today: an open-record queue and factual recent activity; no life score.
- Cash: a Cashew-comfortable ledger with explicit filters, editing, and contactless review.
- Gym: a FitNotes-fast active workout and set logger.
- Habits: a direct selected-day register with neutral unlogged state and undo.
- Music: stats.fm-style artwork, timeframe, ranks, movement, and listening patterns.
- Series: MyAnimeList-style dense library information, explicit TV seasons, and separate anime entries connected by continuity.
- Assistant: a full workspace with contributing records, dates, and freshness.
- Settings: stable list/detail navigation with current values and consequences.

## Release gate

Inspect every major route at 320, 390, 768, 1024, and 1440px. Verify keyboard order, visible focus, contrast, safe areas, touch targets, scrolling, loading, empty, partial, error, offline, success, undo, and destructive states. Native work also requires Capacitor sync and an Android debug build.

Reject clipped compositions, horizontal page scroll, duplicated global navigation, floating Assistant UI, domain color washes, wildcard legacy CSS, generic stat-card requirements, invented metrics, and interactions without accessible equivalents.
