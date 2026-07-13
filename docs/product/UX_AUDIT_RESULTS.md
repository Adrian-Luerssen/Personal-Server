# Premium UX audit results

Audit date: 2026-07-13
Product: Personal Record (repository: Personal Server)

## Outcome

This audit is being revalidated. The prior release established graphite tokens and product naming but retained too much legacy page structure through a global override stylesheet. `CORRECTIVE_UX_AUDIT.md` is the current source of truth until every route below has fresh interaction, responsive, and visual evidence. No criterion should be read as complete solely because a token, class name, or component exists.

## Requirement evidence

| Done criterion | Authoritative evidence | Desktop result | Native result | Accessibility result | Remaining external dependency |
|---|---|---|---|---|---|
| Cohesive customer identity | `frontend/src/product/brand.mjs`, `frontend/src/styles/tokens.css`, `docs/product/BRAND_PROFILE.md` | Personal Record naming and mark are applied to landing, auth, shell, metadata, and PWA | Name, mark, manifest, Android strings, and app header are aligned | Text mark has accessible product naming; decorative mark is hidden | Trademark, domain, and store-name clearance |
| Stable global navigation | `MobileGlobalNav.jsx`, `DomainNav.jsx`, `nativeNavigation.mjs` | Persistent desktop sidebar with product hierarchy | Today, Apps, Capture, Assistant, You remain stable while local tabs adapt | Named navigation landmarks, visible labels, 44 px targets | None |
| Today is action-first | `Home.jsx`, `todayViewModel.mjs` | Daily brief and unresolved records precede summaries | Same ordered record logic in a thumb-reachable feed | Source labels and non-color status text | Live production-data observation |
| Gym is workout-first | `Workout.jsx`, `WorkoutActive.jsx`, `workoutActiveModel.mjs` | Start/review/history remain available without card-wall hierarchy | Previous values, direct kg/reps entry, rest timer, optimistic completion, and undo | Inputs are labeled; completion has text and undo | Health-device testing on release devices |
| Habits is calm and explicit | `Habits.jsx`, `habitsViewModel.mjs` | Ruled selected-day register with cadence and compact history | Boolean states start neutral; numeric habits use direct steppers and save | Status is text plus pressed state; no color-only decisions | Notification timing field study |
| Cash behaves like a ledger | `FinanceTransactions.jsx`, `financeViewModel.mjs`, `cash.css` | Month ledger, budgets, analysis, correction, and filters | Native root opens the ledger; feed, quick filters, and editor are direct | Amounts use tabular numerals; rows and controls have accessible names | Real-bank parser fixtures for each supported institution |
| Series is status-first | `Media.jsx`, `seriesViewModel.mjs`, `Media.css` | Status groups and inline episode progress replace media-card browsing | My List presents next actions and completion suggestion | Episode action has a title-specific accessible name; tabs wrap at narrow widths | Optional MAL OAuth/API credentials |
| Spotify is insight-first | `SpotifyPersonal.jsx`, `SpotifyRanking.jsx`, `spotifyRanking.mjs` | Shared timeframes, ranked lists, artwork, and movement replace decorative podiums | Rank movement and listening evidence remain readable on mobile | Movement is expressed in text, not only arrows or color | Spotify production credentials and quota review |
| Assistant states provenance | `ChatPanel.jsx`, `chatProvenance.mjs` | Assistant links answers to contributing records and dates | Dedicated global destination; inline record context | Provenance has a named region; code is readable without a heavy client highlighter | AI provider retention and disclosure approval |
| You consolidates ownership | `Settings.jsx`, `Connections.jsx`, `DataManagement.jsx` | Account, connections, privacy, appearance, data, updates, and developer access use one hierarchy | Same sections use native rows and platform controls | Heading levels and row-contained switches are verified | Live privacy, terms, support, and deletion URLs |
| Payment capture is review-first | `paymentCapture.mjs`, `PaymentCaptureSheet.jsx`, transaction-suggestion service, Android payment package | Pending detections can be reviewed and corrected from Cash | Local normalization, no raw-text upload, stable fingerprint, Confirm/Edit/Ignore actions, deep link, explicit wallet/category, idempotent server confirmation | Modal is named, Escape closes it, fields are labeled, provenance is plain language | Device/bank matrix and notification wording changes |
| Narrow layouts do not leak horizontally | Native Playwright route matrix and responsive CSS | Landing verified at phone, tablet, and desktop sizes | Major native routes verified at 320, 412, and 486 px; local tabs wrap or compress | Labels remain present instead of icon-only collapse | iOS implementation is not part of this repository |
| Offline/self-host posture is credible | cache tests, PWA config, README, commercial model docs | Route code is split; external font blocking was removed | Cache-first shell, native bridges, update gate, and self-contained typography | Reduced-motion rules and visible focus tokens are global | Production restore drill and uptime monitoring |

## Reference-app translation

- Cashew informed Cash's month-ledger clarity, category/wallet visibility, and correction-first model.
- FitNotes informed direct set entry, previous-value defaults, rest timing, and low-friction undo.
- MyAnimeList informed status ownership and progress as the primary Series interaction.
- stats.fm informed timeframe consistency, ranked listening evidence, artwork, and rank movement.

These patterns were translated into the Personal Record system rather than visually copied.

## Audit findings fixed during verification

1. Contactless suggestions previously created too much trust in a rough parse. They now require an explicit review with merchant, amount, wallet, category, date, provenance, and ignore controls.
2. Repeated payment confirmation could create an ambiguous error. It now returns the already-linked transaction.
3. Euro and pound parsing contained corrupted literals. Android uses Unicode-safe currency patterns and normalized minor units.
4. The first web bundle was approximately 2.6 MB. Route-level loading, deferred Assistant code, and domain-local chart registration materially reduced the initial shell.
5. A chart theme assumed every optional element was registered, which could break the Cash redirect. Theme application is now registration-safe and regression-tested.
6. Google Fonts could block local/self-host navigation. Runtime typography no longer depends on an external font request.
7. Gym and Series local navigation overflowed at narrow widths. Both now fit or wrap without local horizontal scrolling.

## Not represented as complete

Legal approval, trademark clearance, store review, production secrets, signed release credentials, billing, tax, independent security review, physical-device bank coverage, and production backup restoration are launch dependencies. They cannot be completed truthfully from source code alone.
