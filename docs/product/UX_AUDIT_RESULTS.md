# Record interface audit

Audit date: 2026-07-13

This is the current interface source of truth. The customer product is **Record**; **Personal Server** remains the repository and self-host distribution name.

## Direction

Record is one private record system, not a collection of themed mini-apps. Every route uses the same graphite canvas, Sora and JetBrains Mono type system, Bookplate R mark, violet action color, register rows, explicit source states, and restrained semantic colors.

The reference products informed interaction decisions rather than surface imitation:

- Cashew: period-ledger navigation, visible wallet/category context, and correction-first transactions.
- FitNotes: an active workout workbench with previous values, direct set entry, rest context, and undo.
- MyAnimeList: status ownership and progress that remains tied to the correct season or anime release.
- stats.fm: one listening period shared by ranked, temporal, and listening-pattern insights.

## Route audit

| Surface | Primary job | Implemented interaction contract |
|---|---|---|
| Landing | Explain the system and ownership model | Real Record preview, managed/self-hosted comparison, one conversion path |
| Authentication | Enter the same record on web and Android | Shared identity, native mode switch, 56 px mobile fields and actions |
| Today | Resolve what needs attention | Open records first, source register second, no fabricated life score |
| Cash | Capture and correct money records | Month ledger, quick filters, grouped rows, explicit transaction editor, cache-freshness fallback |
| Contactless capture | Turn a device suggestion into a trustworthy record | Local normalization, provenance, confidence, duplicate acknowledgement, editable wallet/category, confirm-only commit |
| Gym | Start or continue training | Active session is primary; set logging, rest context, optimistic completion, and undo stay together |
| Habits | Record a daily decision | Neutral boolean state, direct numeric stepper, visible cadence and history |
| Music | Understand listening behavior | Shared timeframe, ranked registers, listening clock, sound profile, movement evidence |
| Series | Continue at an exact position | TV is season-addressed; anime is release-addressed with explicit continuity |
| Assistant | Ask across records | Dedicated workspace, conversation history, source/date provenance, visible failures |
| Records index | Reach every mobile destination | Two-column area index, grouped management destinations, live search |
| Settings | Control identity, data, sync, and integrations | Stable index/detail workspace with URL-persisted section state |

## Interaction and accessibility findings

- Shared dialogs and custom sheets trap focus, close with Escape, restore the opener, and preserve body scroll state.
- Browser alerts and confirmations have been replaced with inline, reversible confirmation states.
- Empty, loading, offline, and error states remain inside the relevant register instead of replacing the whole product shell.
- Mobile global navigation is stable: Today, Records, Capture, Assistant, You. Domain tabs may scroll horizontally at 320 px; document and body overflow are not allowed.
- Android authentication, bottom navigation, route headers, and principal actions meet the mobile touch-target contract.
- Contactless capture never uploads raw notification text and does not create a transaction before explicit confirmation.

## Verification evidence

- Browser review at 1440 px, 1024 px, and 390 px.
- Desktop route matrix checked for document and accidental local overflow.
- Native route matrix checked at 320 px and 486 px, including Cash, Gym, Habits, Music, Series, Assistant, Records, Settings, and authentication.
- Web Playwright matrix: 91 passing task, responsive, authentication, and visual-regression scenarios.
- Native Playwright matrix: 28 passing Android-shell, capture, navigation, settings, and overflow scenarios.
- Node test suite: 174 passing tests.
- Public landing, login, and registration visual baselines reviewed and recorded.
- Production Vite build: passing.
- Capacitor Android sync: passing.
- Android `assembleDebug`: passing.

## External launch work

The interface is implementation-ready, but public launch still requires trademark and store-name clearance, production secrets, signed release credentials, billing and tax setup, legal review, independent security review, backup restoration drills, and physical-device coverage for supported bank notification formats.
