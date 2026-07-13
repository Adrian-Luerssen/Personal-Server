# Personal Record premium interface redesign

Status: approved visual direction, implementation specification.

Visual source of truth: [Personal Record UI direction](../../product/personal-record-ui-direction.png), derived from the four user-supplied boards in `reference/`.

## Objective

Replace the warm editorial ledger interface with the approved dark, futuristic, data-first product world across the web application, native Android experience, authentication screens, and public landing page. The redesign must increase personality and perceived quality without weakening existing workflows, cache-first behavior, account isolation, accessibility, or responsive contracts.

This is a visual and interaction-system replacement, not a backend rewrite. Existing routes, data APIs, imports, native bridges, settings, payment capture, catalog synchronization, and feature-module preferences remain authoritative.

## Product character

Personal Record is a private life operating system: precise, connected, useful, and calm under density. It should feel like a premium instrument panel built around the user's actual records rather than a generic SaaS dashboard or a paper ledger.

The interface should communicate:

- one connected system with distinct record domains;
- accurate source data before synthetic scores;
- high information density with clear hierarchy;
- fast continuation and capture on mobile;
- inspection and correction on desktop;
- confident technology without fantasy holograms or decorative AI gradients.

The customer name remains **Personal Record**. The customer-facing line becomes **Everything you are, in context.** The existing promise, **Your records, kept useful**, remains valid for operational and explanatory copy.

## Visual foundation

### Color

The default product theme is dark. Light mode remains supported as a secondary accessibility preference, but it is not the primary marketing presentation.

| Role | Token direction |
|---|---|
| Ink background | `#080f18`, blue-black rather than pure black |
| Graphite surface | `#111a27` |
| Raised surface | `#172234` |
| Hairline | cool white at 9–14% opacity |
| Primary text | `#eef3f8` |
| Secondary text | `#9aa8ba` |
| Today | electric blue `#3b82f6` |
| Cash | emerald `#22c55e` |
| Habits | teal `#14b8a6` |
| Gym | warm orange `#f97316` |
| Music | magenta `#ec4899` |
| Series | amber `#f59e0b` |
| Assistant | ultraviolet `#8b5cf6` |
| Danger | coral red `#ef5b5b` |

Domain colors identify navigation, focus, progress, and charts. They do not repaint whole pages. White and graphite carry most of the structure. Gradients are limited to the brand mark, capture action, and bounded data visualizations.

### Surfaces

Surfaces resemble precision glass over machined dark polymer:

- low-opacity cool borders;
- subtle inner highlights;
- tinted depth shadows following one light direction;
- restrained background bloom near the active domain;
- fine noise or grid texture below content, never over text;
- 8–14px radii for panels, with smaller radii for controls;
- no floating white card wall, paper ruling, beige surfaces, or oversized empty hero spacing.

Cards exist only where they group a coherent record or metric. Lists, tables, timelines, and editable rows remain structurally appropriate for dense information.

### Typography

Use self-hosted open fonts so web, PWA, and Android render consistently offline:

- **Sora Variable** for wordmark, headings, controls, and body UI;
- **JetBrains Mono Variable** for values, ranks, money, sets, episode codes, dates, and system state.

Display headings use tight tracking and compact line height. Small labels use controlled positive tracking. Numeric data uses tabular figures. Body copy remains readable at 15–16px with a maximum measure near 65 characters.

### Mark and wordmark

Replace the ruled-sheet mark with an original modular constellation mark: a hexagonal network of recorded points and one connected inner path. It must remain legible at 24px, work as a single-color mask, and support a restrained blue-to-ultraviolet brand treatment at larger sizes.

The wordmark uses **PERSONAL RECORD** in spaced geometric capitals. Domain colors never alter the wordmark.

## Responsive application shell

### Desktop web

At 1024px and above:

- a 224–248px fixed sidebar carries the mark, wordmark, primary domains, secondary utilities, settings, and account control;
- sidebar collapse retains icons, accessible names, and active-domain indication;
- a compact top command bar contains context title, search/command access, sync state, notifications, and capture;
- the content canvas uses a 12-column grid within a maximum width around 1500px;
- route-level local navigation sits inside the content header, not as a second global sidebar;
- page density is deliberate: desktop is for review, comparison, import, correction, and analytics.

### Mobile and native Android

Below 701px and in Capacitor:

- a compact translucent top bar contains the mark, current domain, and context actions;
- five stable bottom destinations remain: Today, Apps, Capture, Assistant, You;
- Capture remains the visually dominant central action;
- domain switching uses the existing app sheet, redesigned as a compact luminous grid;
- local tabs remain thumb-reachable horizontal navigation;
- detail panels become bottom sheets or full-height native-feeling pages;
- screens respect safe areas, 44px touch targets, 320px widths, keyboard insets, and Android back behavior;
- the mobile experience prioritizes next actions, current state, and recent records rather than shrinking desktop dashboards.

## Shared component grammar

Build reusable primitives before page-by-page polish:

1. `InstrumentPanel`: bounded surface for a coherent metric or record group.
2. `MetricValue`: label, tabular value, comparison, and optional compact visualization.
3. `SignalRing`: progress/status ring with textual equivalent and reduced-motion behavior.
4. `DomainBadge`: icon plus text, never color alone.
5. `RecordRow`: dense list/table row with source, primary value, metadata, status, and action affordance.
6. `MiniChart`: accessible sparkline/bar/progress visualization using the existing chart stack or CSS where possible.
7. `CommandBar`: search, date/context, sync state, notifications, and capture.
8. `NativeSection`: mobile grouped surface with a heading, action, and compact rows.
9. `EmptyInstrument`: first useful action plus explanation, sized to content rather than theatrical space.
10. `LoadingInstrument`: skeleton matching final geometry; no generic spinner-only pages.

All primitives support loading, empty, partial, error, disabled, selected, hover, active, focus-visible, and long-content states.

## Route direction

### Today

Today becomes the clearest expression of the system. Desktop uses an asymmetric instrument grid: daily signal, cash position, habit week, active gym plan, listening state, current Series continuation, upcoming items, recent activity, and a cross-domain insight. Mobile uses a daily signal, today's actionable plan, and compact at-a-glance domain rows.

Any score is secondary to its concrete contributing records and must not imply unsupported precision.

### Cash

Retain Cashew-like comfort and ledger clarity. Use a compact balance header, month controls, wallet visibility, category-colored spending visualization, and dense transaction rows. Capture and detected-payment review remain first-class. Mobile opens directly into the current ledger and keeps keypad entry fast.

### Habits

Preserve the strong existing interaction model while adopting the new surfaces and typography. The week matrix, direct boolean/numeric controls, streaks, and undo behavior remain. Domain teal replaces the former warm-paper styling.

### Gym

Prioritize the active workout: exercise blocks, previous-set context, large editable weight/repetition fields, complete/undo feedback, timer, and next set. History, exercises, bodyweight, and import become compact analytical workspaces instead of card grids.

### Music

Preserve the Stats.fm-inspired information architecture and current ranking behavior. Increase artwork confidence, timeline clarity, rank movement, listening distribution, and chart quality. Magenta is used for music state and visualization, not for every surface.

### Series

Keep the new structured catalog model. Library rows emphasize artwork, title facts, concrete progress, and next action. TV details retain season tabs and episode rows. Anime retains separate releases and continuity. Amber provides progress and navigation emphasis.

### Assistant

Assistant becomes a focused record-analysis workspace. Conversation history, provenance, pending state, failures, and page context stay visible. Ultraviolet identifies assistant-owned elements; generated output must remain visually distinct from sourced records.

### Settings, imports, authentication, and utility states

Settings use a clear two-level information architecture with dense rows and inline state. Import screens show source, file, mapping, progress, warnings, and completion. Login/register use a branded split composition on desktop and a compact single column on mobile. Disabled modules, update prompts, 404/error boundaries, install prompts, and offline/sync states receive the same visual system.

## Landing page

The landing page is redesigned only after the authenticated web and mobile surfaces establish the real component language.

The first viewport shows the actual product immediately: dark brand field and promise on one side, a faithful live-code dashboard/mobile composition on the other. It must not reuse the current warm editorial ledger, fake generic dashboard imagery, or an abstract decorative hero.

Landing structure:

1. brand, promise, concrete product view, create-account/login actions;
2. connected-domain system explaining how records relate;
3. real product sections for Today, capture, review, and correction;
4. cache-first, privacy, and source-provenance explanation;
5. managed-service versus self-hosted offer;
6. final action and concise legal/repository navigation.

Marketing motion uses subtle stagger, chart draw, and bounded glow response. It respects reduced motion and never blocks interaction. Product screenshots are generated from the real implementation, not retained from concept art.

## Interaction and motion

- 140–240ms feedback for hover, press, selection, save, and navigation state;
- transform and opacity only for routine motion;
- skeleton-to-content transitions preserve geometry;
- mobile sheets use a weighted spring-like easing without overshoot;
- progress visualization may animate once when values become visible;
- reduced-motion mode disables travel, parallax, chart drawing, and glow movement;
- focus-visible rings use the current domain color plus a high-contrast outer edge.

## Accessibility and resilience

- target WCAG 2.2 AA contrast for text, icons, focus, and meaningful chart marks;
- preserve semantic landmarks, headings, buttons, links, tables, lists, dialogs, and tabs;
- supply text alternatives for charts and scores;
- ensure all controls work with keyboard and Android accessibility services;
- preserve zoom and long-content behavior at 320px, 200% browser zoom, and localized text expansion;
- keep cache-first data, sync age, partial failures, and source provenance visible;
- do not make color the only indicator of domain, state, or progress.

## Technical implementation boundaries

- retain React 18, Vite, vanilla CSS, React Router, Chart.js, GSAP, Capacitor, and the current icon registry;
- introduce no large component framework;
- add only self-hosted font packages and small utilities that materially reduce implementation risk;
- centralize tokens in `styles/tokens.css` and shell behavior in `styles/shell.css`;
- evolve existing product primitives rather than duplicating each page's card/button grammar;
- preserve route contracts and native Playwright locators where semantics remain unchanged;
- implement the authenticated shell and shared primitives first, then high-frequency domains, then secondary/settings/import surfaces, and finally landing/auth.

## Verification

Completion requires:

- all existing frontend model and contract tests;
- backend tests for any API contract touched incidentally;
- production frontend build and bundle review;
- focused Playwright flows for Today, Cash capture, Habits, active Gym, Music, Series, Assistant, settings, auth, and the landing page;
- responsive screenshots at 320, 390, 768, 1024, and 1440px;
- keyboard walkthrough for shell, dialogs, sheets, forms, local tabs, and capture;
- automated accessibility checks where supported plus manual focus/contrast review;
- reduced-motion verification;
- Capacitor sync and Gradle tests;
- final screenshots created from the implementation and compared against the approved visual direction for hierarchy, density, color discipline, and perceived quality.

## Explicit exclusions

- no backend data-model redesign unrelated to presentation;
- no fabricated production metrics or testimonials;
- no 3D mascots, fantasy holograms, giant orbs, rainbow page backgrounds, or excessive bloom;
- no replacement of working domain behaviors with visual-only demos;
- no copied reference names, logos, slogans, or proprietary assets;
- no landing-page implementation before the authenticated product surfaces establish the final system.
