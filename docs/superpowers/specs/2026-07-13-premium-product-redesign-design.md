# Premium Product Redesign Design

Date: 2026-07-13
Status: Approved

## Product objective

Transform Personal Server from a self-hosted multi-module dashboard into a premium, commercially viable personal-data product for Android and web. The hosted service is the default experience for mainstream customers; personal self-hosting remains available from the public source. The redesign covers the entire product, gives Gym, Cash, and Series purpose-built interaction models, refines Spotify and Habits, establishes a distinctive brand system, documents commercial opportunities, and finishes with a reliable contactless-payment capture experience.

## Product positioning

The product is a suite of personal instruments for recording, understanding, and correcting everyday life data. It is not a generic life dashboard and it does not reduce every domain to the same cards. Each instrument must feel as comfortable as a strong dedicated app while the shell, data ownership model, and visual language make the suite coherent.

The hosted service removes setup, upgrades, backups, and synchronization work for normal customers. The self-hosted edition remains a credible option for technical users. The product promise is:

> Your records, kept useful.

The internal repository name remains Personal Server until a customer-facing name passes professional trademark and domain clearance. Brand implementation must therefore separate product-name tokens and assets from the repository name so the final rename is mechanical.

## Licensing and commercial protection

The intended public-source model is:

- PolyForm Noncommercial 1.0.0 for the public repository.
- A separate commercial license for business self-hosting, OEM use, redistribution, paid deployment, and other commercial use.
- Trademark registration for the eventual customer-facing name, logo, and app icon.
- A contributor agreement that grants the project owner sufficient rights to maintain dual licensing.
- A lawyer-review checkpoint before changing the public repository license or launching paid service.

The current README statement that the project is MIT licensed and the backend `UNLICENSED` metadata are contradictory because the repository has no license file. They must be replaced together only after legal review confirms the final licensor name and commercial-license terms.

## Experience strategy

Three approaches were evaluated:

1. A unified life dashboard. It is visually consistent but repeats the current card-wall problem.
2. A suite of personal instruments. Each domain gets the interaction model its task requires, joined by one shell and brand.
3. A chronological life journal. It creates a strong reflective narrative but weakens fast logging and correction.

The approved direction is the suite of personal instruments, with a restrained daily timeline on Today.

## Information architecture

### Mobile shell

The native Android shell uses five stable global destinations:

- Today: actions, active states, and recent records.
- Apps: Gym, Habits, Cash, Spotify, Series, and future instruments.
- Capture: a central action that opens contextual capture choices.
- Assistant: record-aware conversation and suggested actions.
- You: account, connections, privacy, sync, appearance, data, and updates.

Domain navigation lives below the global header as compact local tabs or route-level controls. Domain tabs must not replace the global navigation. The active domain and current location remain visible. Android back navigation returns through domain detail, domain root, Apps, and Today in that order.

### Web shell

Desktop is the review and correction workspace. It uses a persistent, collapsible navigation rail with user-pinned instruments, a compact top utility bar, search/command access, sync state, and account controls. List/detail workflows may use two panes. Summary and source records stay adjacent so a user can inspect or correct the records behind a total.

### Today

Today is a daily brief and actionable timeline, not a dashboard. It contains:

- unresolved items and records waiting for confirmation;
- active workout state;
- habits due now;
- the most recent transaction, listening, and series records;
- one short cross-domain observation when evidence supports it;
- honest cache and sync state without a permanent status banner.

No decorative metrics appear unless they change a decision.

## Domain designs

### Gym

Gym follows the directness of FitNotes rather than a fitness analytics dashboard.

Primary routes:

- Today: current date, routine shortcuts, exercises logged today, and start/continue action.
- Active: distraction-free session logging.
- History: calendar and session list with search.
- Exercises: searchable exercise catalog and per-exercise history.
- Progress: bodyweight, personal records, and selected charts.

The active session is a dedicated work surface. Each exercise shows previous-set context and editable set rows for weight, reps, distance, or time. A set can be completed with one tap. The logger supports notes, warm-up state, reorder, exercise replacement, rest timer, undo, and offline writes. Analytics never interrupt set entry.

### Habits

Habits retains its current daily-log foundation but removes competing analytics from the logging surface.

Primary routes:

- Today: due habits and one-handed completion.
- Plan: definitions, cadence, targets, and reminders.
- History: calendar and heatmap.
- Insights: streaks, misses, and trends.

Done is the dominant action. Skip and Missed are available through a secondary action or deliberate swipe. Every status change supports undo. Numeric habits expose direct value controls. Streak language follows the habit cadence.

### Cash

Cash follows the comfort and clarity of Cashew.

Primary routes:

- Ledger: month navigation, balance context, and date-grouped transactions.
- Budgets: budget progress alongside the categories that drive it.
- Analysis: cash flow, category distribution, subscriptions, and comparisons.
- Accounts: wallets, transfers, categories, recurring rules, and import settings.

Adding a transaction is always one tap away. The form starts with amount and type, then merchant/title, category, wallet, date, and optional details. Smart defaults are visible and reversible. Transaction rows support direct edit, duplication, split, delete with undo, and transfer inspection. The selected period and currency remain consistent across totals, charts, and source rows.

### Series

Media is renamed Series in the customer interface and focuses first on anime and episodic television while retaining extensible media types in the data model.

Primary routes:

- Watching: current series with inline progress.
- Planning: saved series not yet started.
- Completed: completed and scored series.
- Library: all statuses with search and filters.
- Discover: external search and seasonal discovery.

Rows use cover art, title, status, episode progress, and score. Episode increment, score, and status edits happen inline or in a compact sheet without losing list position. Detail views preserve the originating filter and scroll position. Import and matching conflicts expose the external source and proposed resolution.

### Spotify

Spotify is refined around the information hierarchy of stats.fm.

Primary views use one shared time-range control and provide:

- top tracks, artists, and albums with artwork;
- streams, minutes, and rank change;
- listening clock and day/hour patterns;
- recent listening timeline;
- period comparison;
- personal, friends/ranking, and global context when data exists.

Generic stat-card grids are removed. Artwork, ranked lists, and readable charts carry the interface. Every statistic links to its records or calculation scope.

### Assistant

The assistant is a product surface, not a floating widget. It remembers conversations, states which records and time ranges informed an answer, distinguishes observation from inference, and requires confirmation before changing data. Suggested actions deep-link to a prefilled review surface.

## Capture system

The central mobile Capture action offers context-aware shortcuts:

- transaction;
- workout or set;
- habit value/status;
- series progress;
- bodyweight;
- note for the assistant.

The sheet remembers recent actions but does not reorder them unpredictably. Each capture surface is optimized for one hand, starts from cached defaults, validates locally, saves optimistically, and exposes queued/synced/error state.

## Contactless payment capture

Contactless capture is the final implementation phase after the product redesign is stable.

The current Android notification listener remains the acquisition mechanism. Raw notification text stays on the device. The premium flow is:

1. A package-specific adapter recognizes a payment-like notification.
2. The adapter normalizes amount, currency, merchant, source package, account/card hint, occurrence time, and source notification identity.
3. The device deduplicates by source identity and a fallback merchant/amount/account/time fingerprint.
4. A local provisional suggestion appears immediately.
5. The notification provides Confirm, Edit, and Ignore actions.
6. Wallet and category defaults come from source/card mapping and corrected merchant history.
7. High-confidence suggestions can be confirmed in one tap; lower-confidence suggestions open a focused sheet.
8. Confirmation creates an optimistic local transaction and queues synchronization.
9. Corrections update local merchant/source rules without sending raw notification content.
10. Capture history exposes confirmed, ignored, duplicate, failed, and pending items with recovery actions.

Permissions, supported apps, parser health, last detection, and troubleshooting live under Cash settings. The product must never imply that it reads NFC payment credentials or bank data directly.

## Visual identity

The brand concept is “personal instruments, carefully kept.” It combines the clarity of a field notebook, the scanability of an index, and the finish of a well-made physical tool.

### Color

- Light base: warm paper, not pure white.
- Dark base: charcoal with a subtle warm cast, not blue-black.
- Primary accent: oxide red.
- Text: ink/bone with WCAG AA contrast.
- Domain accents: moss for Gym, iris for Habits, ochre for Cash, cobalt for Spotify, and mulberry for Series.

Domain colors identify state, selection, and charts. They do not fill whole dashboards. Gradients, neon glows, glass panels, and permanent bloom effects are excluded.

### Typography

- A distinctive, highly legible sans face for product UI.
- An editorial serif used sparingly for brand and reflective summaries.
- Tabular numerals for money, workout sets, time, and rankings.
- Sentence case labels and compact, confident copy.
- Fonts are self-hosted for performance and privacy.

### Shape and composition

- Ruled lists, index tabs, aligned columns, and quiet dividers form the primary grammar.
- Cards are reserved for objects that need containment.
- Radii are modest and vary by hierarchy.
- Occasional clipped corners or registration marks create brand recognition without hurting usability.
- Real media and album artwork provide visual richness where appropriate.
- Utility icons remain consistent but are used less often; text and data carry hierarchy.

### Motion

Motion explains placement, save, undo, sync, and navigation. Product motion lasts 120–260 ms and uses transform or opacity. Reduced motion removes nonessential transitions. There is no decorative infinite motion.

## Shared component architecture

The redesign introduces focused primitives rather than extending the existing 6,000-line stylesheet indefinitely:

- app shell and domain shell;
- global and local navigation;
- capture sheet and form scaffolds;
- record list, record row, and grouped timeline;
- period control and filter bar;
- inline editable values;
- artwork row and ranked row;
- sync indicator and queued mutation state;
- empty, loading, error, and conflict states;
- confirmation and undo feedback.

New styles are organized into token, base, shell, primitive, and domain layers. Oversized pages are split by orchestration, view, and domain component responsibility while preserving existing API contracts unless a documented product requirement needs a contract change.

## Offline and data-validity contract

- Cached data renders immediately.
- A refresh never blanks useful cached content.
- Mutations update the local view optimistically and enter a visible queue.
- Failed mutations retain the user’s input and offer retry or discard.
- Server changes that conflict with queued local changes produce a review state rather than silent overwrite.
- Freshness is visible at the moment it matters and available in a sync center.
- Every derived insight links to its date range and contributing records.

## Commercial model and opportunities

Initial offer:

- one hosted individual plan with a trial and annual discount;
- personal self-hosting under the source-available noncommercial license;
- paid commercial self-hosting and redistribution licenses.

Hosted value includes managed upgrades, encrypted backup, multi-device synchronization, integrations, reliable notification delivery, and assistant processing. Family/household sharing is a later plan once finance permissions and shared-record ownership are designed.

Integration opportunities are prioritized by manual work removed and data validity improved:

1. Health Connect and wearable activity.
2. Open Banking providers appropriate to launch markets.
3. MyAnimeList, AniList, Trakt, and TMDB.
4. Apple Music and Last.fm after Spotify.
5. Calendar and task services for reminders and planning.

No integration ships without a clear permission model, disconnect flow, failure state, and data provenance.

## Accessibility, privacy, and release requirements

- WCAG 2.2 AA contrast target.
- 44px comfortable touch targets for primary mobile controls.
- Semantic landmarks, controls, labels, and live regions.
- Complete keyboard operation and visible focus on web.
- Reduced-motion behavior.
- No meaning conveyed by color alone.
- Privacy policy, terms, account deletion, data export, consent, and retention documentation.
- Accurate App Store privacy and data-safety declarations.
- Payment-capture onboarding that explains notification access and local parsing.
- No release claim of end-to-end encryption until architecture and threat-model verification support it.

## Verification

Verification must cover intended behavior rather than existing markup:

- unit tests for formatting, navigation, ranking, parsing, deduplication, and offline state;
- component tests for capture, editing, undo, loading, error, empty, and conflict states;
- Playwright flows for login, navigation, daily habit logging, workout logging, transaction CRUD, Series progress, Spotify range changes, assistant provenance, settings, and payment confirmation;
- screenshots at 320, 390, 768, 1024, and 1440px;
- keyboard and screen-reader structure review;
- automated accessibility checks plus manual focus review;
- offline, stale-cache, queued-write, sync-failure, conflict, and recovery testing;
- production build, bundle review, native Android build, release workflow, and App Store checklist.

## Implementation sequence

1. Product identity, tokens, CSS architecture, and shared primitives.
2. Global mobile/web shell, navigation, Capture, and sync states.
3. Today and Assistant.
4. Gym.
5. Habits refinement.
6. Cash.
7. Series.
8. Spotify.
9. Settings, onboarding, legal/product pages, and hosted-service presentation.
10. Contactless payment capture.
11. Cross-product accessibility, visual, performance, native, and release verification.

Each phase must leave the product runnable and tested. Contactless capture does not begin until the preceding product surfaces are coherent and verified.

## Done criteria

The goal is complete only when:

- every authenticated route uses the new brand and interaction system;
- mobile and web have coherent, device-appropriate navigation;
- Gym, Cash, and Series support their primary tasks with reference-quality comfort;
- Spotify and Habits are refined without losing their useful existing behavior;
- the brand profile and reusable component rules are documented and implemented;
- commercial, licensing, integration, and monetization opportunities are documented;
- payment capture is reliable, reversible, privacy-honest, and visually integrated;
- key flows pass automated and manual verification across target form factors;
- release, privacy, legal-review, and remaining external-service dependencies are explicitly documented.
