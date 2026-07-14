# Record foundational redesign

Status: approved implementation direction
Date: 2026-07-13

## Why this is a restart

The previous work changed the palette and introduced new shared components, but it left most route structures intact. It therefore produced a dark skin over several generations of UI instead of one product. This redesign treats the previous presentation layer as disposable. Business logic, API contracts, data models, caching, and working integrations stay; page composition, shared primitives, navigation, CSS, and interaction feedback are rebuilt as one system.

The four supplied reference boards are quality and hierarchy constraints. Their useful shared traits are a disciplined graphite world, confident identity, compact navigation, crisp data typography, selective accent, and dense information that remains readable. Their invented life scores, rainbow domain branding, equal-weight bento walls, decorative sci-fi effects, and generic “life OS” claims are not product requirements.

## Product identity

Customer name: **Record**
Repository and self-host distribution: **Personal Server**
Promise: **Keep the life you live useful.**
Category: a private record system for daily life.

Record is not six mini brands and not an AI dashboard. It is one dependable place where a person can capture, continue, inspect, and correct the records that make up their day.

### Mark

The Record mark is an indexed spine: two offset vertical rails, three record ticks, and one active dot. It reads as an `R` at display size and remains a simple one-color device icon at 16px. It replaces the constellation mark and all decorative orbital imagery.

### Voice

Short, factual, and useful. Name the record, source, time, and next action.

- “Detected from a Revolut notification” instead of “Smart capture.”
- “Episode 4 of 12” instead of “Progress 33%.”
- “Set 2 matches last week” instead of “Great job!”
- “Last checked 4 minutes ago” instead of “All synced.”

## One visual system

### Palette

Record uses one brand accent. Domains do not repaint the application.

| Role | Value | Use |
|---|---:|---|
| Ink | `#06090d` | Browser and native canvas |
| Canvas | `#090e14` | Main application plane |
| Surface | `#0e151e` | Rails, toolbars, grouped registers |
| Raised | `#131c27` | Menus, sheets, focused work surfaces |
| Line | `#233041` | Borders and dividers |
| Line strong | `#34445a` | Selected and focused boundaries |
| Text | `#f2f5f8` | Primary information |
| Muted | `#96a3b4` | Supporting information |
| Quiet | `#657386` | Metadata |
| Record violet | `#7c5cff` | Identity, primary actions, selection |
| Record cyan | `#35c6f4` | Secondary data comparison only |
| Success | `#32d583` | Confirmed, income, completed |
| Warning | `#f7b955` | Review and pending states |
| Danger | `#f97066` | Destructive and expense emphasis |

Domain identity comes from nouns, icons, imagery, units, and purpose-built layouts. Semantic finance and state colors remain available, but there are no full-page Cash green, Gym orange, Music pink, or Series amber themes.

### Type

- Sora Variable: navigation, interface, headings, body.
- JetBrains Mono Variable: money, timestamps, set values, episode numbers, ranks, durations, and source state.
- Display sizes are restrained inside the product. The largest authenticated heading is 32px desktop and 26px mobile.
- Labels use sentence case. Uppercase is reserved for short ledger indices and technical state.
- All numbers use tabular figures.

### Geometry and spacing

- 4px base unit; common gaps are 8, 12, 16, 24, and 32px.
- Standard control height: 40px desktop, 44px touch.
- Corners: 6px controls, 10px grouped work surfaces, 14px sheets. Pills only represent compact filters or states.
- Shadows are reserved for overlays. Normal hierarchy uses planes, dividers, and contrast.
- Content width is capped at 1480px. Working pages prefer dense rows over isolated cards.

### The register grammar

Record’s distinctive component is the **register**: a titled, divided group of inspectable rows. A register may be a transaction ledger, today queue, habit list, set list, episode list, connection list, or listening ranking. Registers share:

- a compact header with scope and one contextual action;
- rows with a stable leading identity column, primary information, metadata, state, and explicit action;
- hover, focus, pressed, selected, loading, stale, and error treatment;
- no nested card decoration;
- full-row interaction only when the row has one unambiguous destination.

Cards are allowed only for one self-contained answer, artwork, or an active task that deserves elevation.

## Application shell

### Desktop

- 224px fixed left rail.
- Brand at the top; Today is its own destination; a Records group contains Cash, Gym, Habits, Music, and Series; Workspace contains Assistant; System contains Settings.
- Navigation is always expanded and never accordion-based. Collapse is a deliberate icon-rail action, not an automatic breakpoint surprise.
- A 56px route bar shows breadcrumb/context on the left and freshness, search, capture, and profile actions on the right.
- The page owns its title, local navigation, filters, and primary action. There is no floating Assistant button competing with the Assistant route.

### Tablet

- The rail becomes a 68px icon rail from 768px through 1099px.
- Labels appear in accessible tooltips; local navigation remains in the page header.
- No horizontal page scroll.

### Native mobile

- A 52px top bar contains the mark, current location, freshness when relevant, and at most one contextual action.
- Stable bottom destinations: Today, Records, Capture, Assistant, You.
- Records opens a searchable full-height index; it does not duplicate a horizontal app switcher in the header.
- Domain sub-navigation is a compact segmented row or a list inside the page, never a second global bar.
- Primary capture/save actions remain thumb reachable and respect safe areas.

### Web on phone

The existing mobile-web download gate remains. Native app layouts are still responsive and verified through the Capacitor platform contract.

## Page contracts

### Today

Job: show what needs attention now and make the next action obvious.

- Date and freshness first.
- Main register: open records, such as a payment review, active workout, unlogged habit, or next episode.
- Secondary register: recent records with source and time.
- Compact domain summaries answer factual questions only; no synthetic life score.
- Empty: “Nothing needs review” with direct capture choices.

### Cash

Job: capture, scan, filter, and correct a ledger comfortably.

- Root surface is the current period ledger, not a summary-card dashboard.
- Header carries period, net movement, available balance when known, wallet scope, and Add transaction.
- Transactions are grouped by date with daily totals; filters open a clear drawer/sheet and remain summarized after closing.
- A transaction row opens the same editor on desktop and native.
- Contactless detection enters a dedicated review state: merchant, amount, timestamp, source application, proposed wallet/category, confidence explanation, and duplicate warning. Nothing is committed until accepted.
- Amount entry uses a numeric keypad on native and a normal numeric field on desktop. Wallet, category, type, and date are always visible before save.
- Budgets and Trends are registers reached through local navigation; Settings owns wallets, categories, rules, imports, and notification capture.

### Gym

Job: start or continue training with almost no orientation cost.

- Root prioritizes an active session, then current routine and Start workout.
- Active workout is a focused workbench: exercise name, previous performance, set rows, rest timer, add set, undo, complete.
- Editing weight/reps never navigates away or opens a desktop-style modal on native.
- History is a chronological session register. Exercises is a searchable catalogue. Bodyweight is a measurement register with one trend summary.
- Completion requires confirmation and keeps a summary available after save.

### Habits

Job: make a decision for the selected day.

- One selected-day register with a seven-day date strip.
- Boolean habits present Done as the primary action and Skip/Miss as deliberate secondary choices; no state is preselected.
- Numeric habits use inline decrement/value/increment and a visible Save action.
- Every write exposes immediate undo.
- Analysis, calendar, and configuration remain secondary to today’s register.

### Music

Job: explain listening identity like a personal stats product.

- Profile/connection identity and one shared timeframe control lead the page.
- Ranked artists and tracks show artwork, rank, movement, plays, and listening time in registers.
- Listening pattern and recent activity provide the story behind the ranking.
- Global and ranking routes use the same timeframe and row grammar.
- Missing Spotify connection is an explicit setup state, not an empty dashboard.

### Series

Job: make progress and continuity legible.

- Library uses dense title rows with artwork, format, status, current season/episode or anime episode count, release state, score, and next action.
- Traditional television is one series with a season navigator and per-season episode rows.
- Anime seasons remain separate catalogue entries. Continuity shows prequel/sequel/side-story relationships and provides the next entry action without merging their episode numbering.
- Detail prioritizes Continue, then season/entry structure, then metadata and editing.
- Search results clearly distinguish TV series, TV seasons, anime entries, and movies before add.

### Assistant

Job: answer from inspectable records.

- Full workspace on web and native; no floating duplicate.
- Conversation list, current thread, composer, and sources/provenance panel.
- Each factual answer can reveal contributing records, dates, and freshness.
- Empty offers grounded starter questions based on enabled modules.

### Settings

Job: configure the product without a page-length control dump.

- Desktop list/detail layout; mobile index followed by detail routes.
- Groups: Account, Connections, Modules, Notifications, Sync & offline, Appearance, Data, Updates, Developer.
- Rows state current value and consequence. Permission-sensitive changes explain why before requesting.
- Appearance is a small set of coherent choices; users cannot assign unrelated domain themes.

### Landing and auth

Job: honestly present the same product and get out of the way.

- Uses the Record mark, palette, register components, and real route compositions.
- No giant clipped mock browser or fake life score.
- First viewport has one concise promise, managed/self-hosted context, one primary CTA, and a responsive Today/Cash register composition that fits its frame.
- Login and registration share a quiet split layout: product context on desktop, focused form on mobile, visible error and recovery states.

## Interaction state contract

Every async working surface implements the states below using the same language:

| State | Treatment |
|---|---|
| Loading | Stable row geometry and restrained progress line; never a blank page spinner |
| Empty | State the missing record and show the first valid action |
| Error | Name the failed operation, preserve entered data, and offer Retry or a safe exit |
| Offline | Show cached content, last verified time, and which actions will queue |
| Success | Confirm adjacent to the action; do not rely on transient toast alone |
| Undo | Keep an inline 6-second undo for reversible quick writes |
| Destructive | Explain the record impact and require explicit confirmation |
| Disabled | State the prerequisite in text; do not use opacity alone |

All controls have visible focus, hover, pressed, disabled, and busy states. Escape closes the topmost dismissible layer. Focus returns to its trigger. Native back closes sheets before navigating. Reduced motion removes transforms and animated charts.

## Responsive and accessibility release matrix

Inspect every major root route at 320, 390, 768, 1024, and 1440px. Verify:

- zero horizontal page overflow;
- 44px touch targets and safe-area clearance;
- correct reading and tab order;
- visible focus and AA contrast;
- keyboard operation of navigation, filters, sheets, registers, and forms;
- loading, empty, error, cached/offline, success, undo, and destructive states;
- no clipped headings, mockups, charts, menus, or dialog actions;
- Android back, status bar, keyboard, and bottom-navigation behavior.

## Explicit removal list

- Constellation identity and “Everything you are, in context.”
- Per-domain page accent themes.
- Broad styling of legacy `.card` and wildcard domain selectors.
- Floating desktop Assistant.
- Sidebar accordions and redundant mobile app switchers.
- Generic stat-card and quick-action-card page requirements.
- Synthetic daily/life scores.
- Old corrective/premium redesign plans and conflicting brand documents.
- Page-specific modal, button, empty, and loading grammars where a shared primitive applies.

## Done means

The redesign is complete only after the source contracts, automated task-flow tests, live in-app inspection, responsive screenshots, keyboard passes, production build, Capacitor sync, Android debug build, and route-by-route interaction checklist all agree with this specification.
