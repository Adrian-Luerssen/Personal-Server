# Personal Record

## Register

product

## Users

Personal Record is used on desktop and mobile to keep Gym, Habits, Cash, Spotify, Series, and Assistant records useful. Normal customers use the managed service; technical users may self-host the Personal Server repository. Mobile usage is frequent and task-driven. Desktop is the review, correction, and configuration workspace.

## Product Purpose

The product consolidates personal records in one cache-first system. It must make source, freshness, confidence, and correction visible. Cash supports Cashew imports and fast ledger correction; Gym supports FitNotes-style logging; Series supports MyAnimeList-style status and progress; Spotify presents stats.fm-style listening insight.

## Brand Personality

Precise, warm, private, and calm. The interface feels like a set of well-kept personal instruments, not a generic AI dashboard. Customer promise: **Your records, kept useful.**

## Anti-references

Avoid card walls that only summarize data without control, ambiguous labels such as repeated "Data" buttons, cramped web modals inside the mobile app, hidden filters, horizontal scrolling, decorative dashboard gradients, and any workflow that silently guesses finance categories.

## Design Principles

- Daily actions first: the fastest path to add, edit, filter, and correct data should be visible.
- Native before responsive: Android views should behave like an app, not a narrow desktop page.
- Explicit data control: wallet, category, date, amount, and type should be inspectable and editable without hidden assumptions.
- Summary with drilldown: overview screens should explain the month, but never replace transaction-level control.
- Fit the device: no horizontal overflow, thumb-sized controls, and sticky actions where users make decisions.
- Cache with honesty: cached data should render immediately, with freshness, sync, and invalidation state visible.
- You owns configuration: account, connections, privacy, notifications, sync, appearance, data, updates, and developer access use a list/detail structure.
- Hosted and self-hosted remain compatible: operational convenience is paid; data portability is not.
- Provenance before magic: AI, imports, integrations, and notification capture must identify the records they used or created.

## Commercial posture

The repository is intended to be source-available for personal noncommercial self-hosting. The managed service is the primary customer product. Third-party commercial hosting or resale requires a separate commercial license. The final license and customer brand require counsel and trademark review before launch.

See `docs/product/` for brand, monetization, integration, and legal launch decisions.

## Accessibility & Inclusion

Target WCAG AA contrast where practical, 44px touch targets on mobile, semantic buttons and form controls, visible focus states, reduced-motion-safe transitions, and text that remains readable on narrow Android screens.
