# Personal Record Design System

## Design Read

Personal Record is a private suite of personal instruments. It is not a SaaS analytics product and it should not look like one. The visual language is restrained, tactile, and ledger-like: warm paper and charcoal surfaces, oxide red as the house ink, compact controls, ruled sections, clear data provenance, and enough editorial structure to make every record feel deliberately kept.

The core product sentence is:

Your records, kept useful.

## Registers

Personal Server has two registers.

The landing page is the brand register. It should communicate the product idea quickly, use real imagery, and move with intent. It can be more cinematic, but it must preserve route structure and mobile download gating.

The authenticated web app and Android app are the product register. They serve frequent tasks: log a habit, start a workout, add a transaction, review data freshness, ask the assistant, import data, and correct wrong records. Familiar controls beat novelty here.

## Core Principles

1. Task first. Every screen starts with the next useful action, not a decorative summary.
2. Cache is visible. The app can be fast because cached data is shown immediately, but freshness and sync state must be legible.
3. Local control. Users must be able to inspect and correct wallet, category, date, status, source, and sync state without hunting.
4. Density with hierarchy. The interface can be information-rich, but actions, labels, and states need stable placement.
5. No horizontal overflow. Native Android screens must fit 320px to 486px widths with no page or local horizontal scroll.
6. One navigation job per surface. The top app selector chooses the app area. The bottom tabbar navigates within that app area. Settings and import routes belong in Settings and Data.

## Visual Direction

Reference language: a well-kept field journal, an index drawer, and a set of precise daily instruments. Avoid generic dark SaaS cards, purple-blue glow stacks, decorative light blobs, oversized rounded cards, repeated tiny uppercase section labels, fake dashboard screenshots, stock-photo product theater, and blank admin panels.

Use warm paper as the light body, charcoal as the dark body, oxide red as the system action color, and domain colors only as functional status accents:

- System: oxide
- Training: green
- Habits: violet
- Money: amber
- Music: sky
- Media: rose
- Assistant: blue
- Error: red

Domain colors are not decorative backgrounds. They mark selected states, icons, status, and tiny category accents.

## Tokens

The code source of truth is `frontend/src/styles.css`. This document defines the rules behind those tokens so new UI does not invent one-off colors, icon sizes, or animation timings.

Typography:

- Body and UI: `Geist`, `Aptos`, `Segoe UI Variable`, system sans.
- Product headings use fixed rem sizes, not viewport-scaled type.
- Landing display headings may use `clamp`, but max at 5.8rem and must stay under 3 lines.
- Letter spacing is `0` by default. Use mild positive spacing only for short technical labels.

Type scale:

- Native route title: 1.0rem to 1.15rem.
- Native section title: 1.15rem to 1.35rem.
- Product page title: 2.0rem to 2.25rem.
- Product card title: 0.95rem to 1.25rem.
- Body: 0.9rem to 1.0rem.
- Metadata: 0.72rem to 0.82rem.
- Avoid all-caps labels except very short technical states. Prefer sentence case.

Color:

- Base: `#050607`. App background and native shell.
- Surface: `#0a0d10`. Standard panels, cards, sheets.
- Elevated: `#11161b`. Raised controls, active row backgrounds, menus.
- Text primary: `#f2f5f7`.
- Text secondary: `rgba(242, 245, 247, 0.72)`.
- Text muted: `rgba(242, 245, 247, 0.52)`.
- System accent: `#7dd3fc`. Primary actions, links, focus, selected shell controls.
- Success: `#4ade80`.
- Warning: `#fbbf24`.
- Error: `#f87171`.
- Info: `#60a5fa`.

Domain colors:

- Overview/System: cyan `#7dd3fc`.
- Training: green `#4ade80`.
- Habits: violet `#a78bfa`.
- Money: amber `#fbbf24`.
- Music: sky `#7dd3fc`.
- Media: rose `#f472b6`.
- Assistant: blue `#60a5fa`.

Color rules:

- Domain colors are accents only. Use them for icons, selected borders, small status chips, progress, and graph series.
- Do not use full-card domain color fills except for explicit modal headers or critical focused flows.
- Do not mix purple, blue, and cyan as decorative gradients. Violet belongs to Habits only.
- Money amounts use semantic color: income success, expense error, transfer/info neutral.
- Backgrounds stay graphite. If a page needs distinction, use density, layout, or border treatment before adding a new color.
- Light mode mirrors the same hierarchy with white surfaces and cyan as the accent. Do not introduce a separate light-mode brand palette.

Shape:

- Panels and cards: 8px to 12px.
- Inputs and compact controls: 4px to 10px.
- Pills only for segmented controls, chips, and small status indicators.
- No 16px to 40px card radii unless the component is a sheet or modal with a documented reason.

Surface:

- Base: near-black graphite.
- Surface: dark blue graphite.
- Elevated: slightly lighter graphite.
- Borders: 1px hairline with low opacity.
- Shadows are functional and subtle. Do not pair wide soft shadows with borders as decoration.
- Do not use glassmorphism as a visual identity. `--glass-blur` stays `0px` unless a specific modal/backdrop needs temporary separation.
- Use dividers and spacing for hierarchy before wrapping everything in cards.
- Use ruled surfaces for dense record groups: a containing border, divided rows, and semantic left rules beat repeated standalone cards.
- Do not add a card when a row, divider, or section border communicates the hierarchy clearly.

Icons:

- The current project icon family is `lucide-react`. Keep one icon family until there is a deliberate migration.
- Default stroke width follows Lucide default unless a component explicitly sets size only. Do not mix filled and outline icon styles in the same control group.
- Standard sizes:
  - Inline metadata icon: 14px.
  - Button icon: 16px.
  - Native nav icon: 20px to 22px.
  - Card leading icon: 22px to 26px.
  - Empty-state icon: 32px max.
- Icon buttons must be real buttons with an accessible label. Text buttons need icons only when the icon clarifies the action.
- Use familiar icons for common actions: plus for add, check for done/save, x for close/missed, minus for skip/neutral, download for APK/update, database for data, bell for notifications, wallet for money, dumbbell for training, heart-pulse for habits, music for Spotify, message-square for assistant.
- Do not use emoji as icons in product UI. Existing imported data may include emoji in user content, but new interface controls should use icon-library glyphs.
- Do not hand-roll SVG paths unless the icon is a brand mark or native platform asset.

Motion:

- Product UI: 150ms to 250ms for state changes, transform and opacity only.
- Landing: scroll-triggered image scale and reveal may be used, with reduced-motion fallback.
- No decorative infinite motion. No content hidden until animation completes.

Motion tokens:

- Fast feedback: 120ms to 160ms. Use for press, toggle, checkbox, segmented control, row selection.
- Standard transition: 200ms to 260ms. Use for menus, sheets, tab changes, panel entry.
- Slow contextual reveal: 360ms to 520ms. Use only on landing sections and major empty-state reveals.
- Easing: `cubic-bezier(0.32, 0.72, 0, 1)` for product motion.

Motion rules:

- Every animation must explain state, location, or feedback.
- Native Android surfaces must avoid delayed choreography. Immediate response beats visual polish.
- Loading states use skeletons, progress bars, or explicit sync text. Do not spin multiple loaders on one screen.
- Use `prefers-reduced-motion` to disable scroll choreography, long transforms, and decorative looping.
- Do not animate layout width/height for frequently used controls. Use opacity, transform, border-color, and background-color.
- Do not use permanent glow/pulse animations except critical transient feedback after a completed action.

Spacing:

- Base spacing unit: 4px.
- Compact gap: 6px to 8px.
- Standard gap: 12px to 16px.
- Section gap in product UI: 20px to 28px.
- Landing section gap: 72px to 120px depending on viewport.
- Native horizontal padding: 14px to 18px, never fixed wider than the viewport can support.
- Controls in the same row must align to a shared grid. Do not manually offset switches or CTAs.
- Product screens should not contain landing-style vertical reservations. Native hero areas, empty states, and summary cards should size to content unless the screen is a true error or onboarding state.
- Empty states are inline work states. Keep them compact, name the missing data, and provide the next action. Do not place a tall empty box inside another card.

Data visualization:

- Charts use muted graphite grid lines and one dominant series color.
- Multi-series charts use domain colors only when the series maps to domains. Otherwise use one accent and neutral comparison lines.
- Finance charts must use green for income, red for expense, amber for budget pressure, and cyan/blue for transfers or neutral balance.
- Widgets and lock-screen surfaces must be privacy-safe by default: show ratios, counts, and status before exposing titles or transaction details.
- Every chart needs an empty state and a text summary nearby. The user should not have to decode a chart to know the takeaway.

Feedback:

- Success should be calm: state update, inline confirmation, or short toast. Avoid celebration animations.
- Errors must name the failed action and the recovery path.
- Offline/cache states show age and whether the app is retrying.
- Destructive actions require a confirm step and must state exactly what data will be deleted.

## Shared Primitives

Shared UI primitives live in `frontend/src/components/shared/RecordPrimitives.jsx` and their styles live in `frontend/src/styles.css`.

Use them before inventing new page-specific record cards:

- `StatusPill`: compact state such as cached, synced, verified, changed, offline, due, or hidden.
- `MetricCard`: small review metrics with label, value, and source note.
- `EmptyState`: compact, inline missing-data state with the next useful action.
- `ReviewPanel`: one focused review prompt or system state.
- `RecordRow`: dense source-record row for changed data, recent activity, imports, or finance lines.

The goal is not component novelty. The goal is a repeated ledger grammar: status, source, row, value, correction path.

## Landing Page Rules

The landing page is the public expression of the actual app. It should make the product legible within seconds:

- Attention: one identity pill, one strong headline, one concise subheading, one primary CTA, one secondary CTA.
- Interest: a realistic weekly brief/product preview, not abstract SaaS cards.
- Desire: explain what records are kept, how cache-first verification works, and why source rows matter.
- Action: final CTA and footer.

Rules:

- The hero visual is a product preview of records becoming a weekly brief. Do not replace it with generic stock imagery.
- A bento grid is allowed only when each cell maps to a real record type or workflow step.
- Prefer ruled slabs, comparison rows, source records, and status pills over decorative cards.
- No version labels, decorative status dots, repeated uppercase eyebrows, or marketing slogans.
- One primary CTA intent: start or download.
- Copy must describe literal behavior: cached Android app, imports, assistant relay, valid local data, and weekly review.

## Web App Rules

The web app is for review and correction.

- Use a persistent sidebar on desktop.
- Page headers should be compact: title, short subtitle, optional meta. Avoid giant hero-style headers inside the app.
- Cards are for bounded objects only. Do not nest cards inside cards.
- Dashboards should show summary and drilldown controls together.
- Empty states must include the next action.
- Error states must name the failing action and recovery path.
- The authenticated app should feel like a ledger and console, not a pitch deck. Avoid large narrative panels when a table, list, filter row, or action cluster would expose more control.

## Native Android Rules

The Android app must feel like separate small apps under one shell.

Shell:

- Top header: app mark, current route title, app switcher button, optional settings button.
- App switcher: choose app area.
- Bottom tabbar: only tabs within the current app area.
- Settings and imports live inside Settings and Data, not inside feature tabbars.

Touch and layout:

- Minimum touch target: 44px.
- No horizontal scroll. Use fit-to-width cards, wrapped chips, and compact tables converted to rows.
- Avoid fixed-width visualizations on native screens.
- Keep the bottom tabbar clear of content with safe-area padding.
- System bars must share the native shell background.
- Native vertical density matters. A Samsung S24 Ultra viewport should show several actionable rows per screen. If a page shows mostly blank card interiors, reduce fixed minimum heights before changing colors or adding decoration.

Habit UI:

- No status is preselected. Done, skip, and missed stay neutral until the user chooses.
- Numeric habits need direct steppers and editable values.
- Streak copy must match the habit cadence: days, weeks, months, or years.

Finance UI:

- Summary and transaction feed must expose the same period and currency.
- Add, edit, wallet, category, date, and type controls must be one tap from the feed.
- Imported Cashew data must show as real transactions, not only dashboard totals.
- Detected payments must debounce notifications and deduplicate by merchant, amount, timestamp, and source notification id.

## Motion And Three.js Policy

The default motion concept is "a living private ledger": rows appear, changed records settle, cache state verifies, and weekly review becomes clear.

Use CSS or SVG first. Three.js is only allowed when:

- The static page already works without it.
- The animation represents real ledger structure, not decoration.
- The repo has the dependency or the new dependency is justified.
- It respects reduced motion and does not block rendering.
- It uses a restrained orthographic or low-perspective camera, capped device pixel ratio, antialiasing, cleanup, and slow movement.

Do not add Three.js for orbs, floating cubes, particle clouds, holograms, logo spins, or glow demos. Bad WebGL is worse than no WebGL in this product.

## Component States

Every interactive component needs:

- Default
- Hover where pointer exists
- Focus-visible
- Active press state
- Disabled
- Loading
- Empty or no-data state
- Error state

For native mobile, hover is irrelevant, but focus-visible still matters for browser and accessibility testing.

## Accessibility

- Text contrast target: WCAG AA minimum.
- Do not communicate meaning by color alone.
- Use real buttons for actions and links for navigation.
- Inputs use labels, not placeholder-only labels.
- Reduced motion disables scroll choreography and decorative loops.
- Long text truncates only when the full value is available on the detail screen.

## Anti-Slop Checklist

Reject a change if it introduces:

- Purple-blue glow fields or floating decorative lights.
- Repeated same-size icon cards with equal weight.
- Giant rounded cards over 20px radius.
- Gradient text.
- Fake product screenshots.
- Repeated uppercase eyebrows above every section.
- Decorative section numbers.
- Text overflow or horizontal scroll.
- Inconsistent button styles for the same action type.
- Placeholder copy that sounds like generic SaaS marketing.

## Implementation Notes

CSS tokens live in `frontend/src/styles.css`.

Landing-specific layout lives in `frontend/src/pages/Landing.css`.

Native navigation behavior lives in `frontend/src/nativeNavigation.mjs`, `frontend/src/components/Layout.jsx`, and `frontend/src/components/Sidebar.jsx`.

Visual regression and native overflow are validated through Playwright, especially `frontend/tests/auth/native-app.spec.ts`.
