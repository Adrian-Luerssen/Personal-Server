# Corrective UX audit

Date: 2026-07-13
Status: implementation blocker

## Why the previous release failed

The shipped dark redesign changed tokens, fonts, the public landing page, and a small set of shared primitives, but it did not replace the product's underlying page structures. The strongest evidence is `frontend/src/styles/premium-overrides.css`: it applies a second visual skin to legacy selectors such as `.card`, `.btn`, `[class*='finance-']`, `[class*='workout-']`, and `[class*='series-']`. That preserved the old information architecture and created specificity conflicts between domain CSS, legacy CSS, and the new theme.

The result is a reskin rather than the approved suite of purpose-built personal instruments.

## Critical findings

| Area | Finding | User impact | Required correction |
|---|---|---|---|
| Visual architecture | A global override file restyles unrelated legacy markup through broad selectors. | Similar controls change appearance by route and small CSS changes cause regressions elsewhere. | Remove the override layer and give shared primitives and each domain an explicit stylesheet contract. |
| Today | The page introduces a synthetic “daily signal” derived from hard-coded habit and step weights. | It presents unsupported precision and displaces the records that need action. | Replace it with an action-first daily brief, unresolved record queue, active states, and source-backed summaries. |
| Desktop shell | The command bar, floating Assistant, sidebar accordions, and route-local navigation compete for hierarchy. | Users cannot quickly tell which navigation is global, local, or contextual. | Establish one global rail, one route header, one local navigation row, and one contextual action area. |
| Mobile shell | The app header includes an app switcher while the bottom bar also includes Apps; settings is exposed as a separate header action while You is already global. | Redundant paths consume scarce space and make location unclear. | Use a compact title/action header, keep Apps and You in the stable bottom bar, and move domain switching into Apps. |
| Component grammar | New `InstrumentPanel` primitives coexist with old `card`, `section`, `StatCard`, and route-specific native cards. | The same information has different spacing, radii, states, and interaction feedback. | Consolidate working-surface primitives and migrate route markup instead of styling old containers indirectly. |
| Cash | Ledger behavior exists, but summary cards, native cards, dialogs, and payment review use different interaction and density rules. | Adding, reviewing, correcting, and scanning transactions feel like separate products. | Make the date-grouped ledger the root surface; use one transaction sheet and one explicit review state across web and native. |
| Gym | Overview analytics and navigation still compete with starting or continuing a workout. | Logging sets requires more orientation than a dedicated training app. | Make current routine/session the root; move analysis to history/progress and build the active logger as a focused workbench. |
| Series | Structured season and anime data exists, but the library and detail views retain generic media-card conventions. | Season/episode hierarchy and anime continuity are technically present but visually hard to scan. | Use status lanes and dense title rows in the library, then season navigation and episode rows in detail. |
| Habits | The underlying direct logging model is sound, but it is wrapped in multiple card and modal patterns. | Quick completion is visually noisy and secondary status choices receive too much weight. | Keep one selected-day register with dominant Done, deliberate secondary actions, inline numeric controls, and immediate undo. |
| Music | Artwork and ranking logic are stronger than other domains, but shared generic surfaces flatten the Stats.fm-inspired hierarchy. | Identity, time range, rank movement, and listening patterns do not read as one listening story. | Preserve the data model while rebuilding the presentation around artwork-led ranks, one timeframe control, and readable movement. |
| Assistant and settings | Assistant is both a floating desktop utility and a primary mobile destination; settings is a very large multi-pattern surface. | Ownership and navigation differ by platform and complex settings are hard to scan. | Make Assistant a full workspace on both platforms and use a stable settings index/detail hierarchy. |
| Landing | The landing was rebuilt before the authenticated product was truly rebuilt and embeds another simplified dashboard composition. | Marketing promises a product that the app does not actually resemble. | Rebuild landing last using verified live product components and screenshots. |
| Tests | Several older E2E tests assert generic implementation details such as stat-card grids and quick-action cards. | Tests protect the legacy dashboard instead of the approved task flows. | Replace them with intent-based flow, navigation, state, responsive, and accessibility assertions. |
| Documentation | `BRAND_PROFILE.md` still specifies warm paper, oxide red, and an editorial serif while `DESIGN.md` specifies graphite, Sora, and a constellation mark. | Contributors have two incompatible sources of truth. | Reconcile brand documentation with the approved dark instrument system. |

## Reference translation

The four boards in `reference/` consistently show the useful direction: strong product identity, disciplined dark surfaces, clear domain ownership, dense but readable data, stable global navigation, and mobile layouts that prioritize the current day. They are visual concepts, not interaction specifications. The approved dedicated-app references remain authoritative for behavior: Cashew for Cash, FitNotes for Gym, MyAnimeList for Series, and stats.fm for Music.

The corrective implementation will not copy the boards' generic bento-dashboard layouts, synthetic life scores, names, logos, or decorative sci-fi effects. It will use their hierarchy and finish while following the approved domain-specific workflows.

## Acceptance standard

The redesign is not complete when colors and tokens match. It is complete only when:

- each domain has a purpose-built root workflow;
- global, local, and contextual navigation are unambiguous;
- mobile actions are thumb-reachable and desktop review remains dense;
- loading, empty, partial, error, offline, success, undo, and destructive states share one grammar;
- core interactions work with pointer, keyboard, Android back, and screen readers;
- every major route is inspected at 320, 390, 768, 1024, and 1440 pixels;
- the landing page is built from the finished authenticated product.
