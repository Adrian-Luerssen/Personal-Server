# Cache-First Data Experience Design

## Problem Statement

The hosted API can take 5–20 seconds to wake and respond. The product must therefore treat the backend as an eventually available synchronization service rather than the critical path for ordinary navigation and record editing.

## Requirements

- Cached routes must show their last valid data in the first render without waiting for the API.
- Cached data must revalidate silently and update mounted consumers when fresh data arrives.
- Navigational intent must preload likely route data before the route mounts.
- Ordinary record mutations must update the visible UI immediately and synchronize in the background.
- Pending mutations must survive refreshes and native app restarts, remain isolated per account, retry transient failures, and expose an honest sync state.
- Authentication, account security, imports, provider synchronization, and other command-style operations remain server-confirmed.
- Web receives the contract first. The Capacitor app reuses it and adds resume/online flushing plus compact native sync feedback.
- Cached data must never cross account boundaries.

## Architecture Overview

```text
route intent ──> preload manifest ──> response cache ──> immediate render
                                          │
                                          └──> background revalidation
                                                   │
                                                   └──> path subscribers

user edit ──> optimistic local state/cache ──> durable mutation queue
                                                     │
                            online/focus/app resume ──┤
                                                     └──> authenticated API
                                                            │
                                      success ──> reconcile/revalidate
                                      permanent failure ──> visible retry
```

## Component Design

### Response cache

- Keeps account-scoped last-known-good responses in local storage for synchronous startup.
- Preserves stale data during invalidation instead of deleting it.
- Applies tiered freshness windows and request deduplication.
- Provides path updates and subscriptions so background responses can reach mounted consumers.

### Route preloader

- Maps product routes to their first-screen requests.
- Warms enabled modules during browser idle time with bounded concurrency.
- Starts preloading on pointer, keyboard, and touch navigation intent.
- Never blocks navigation and never surfaces preload failures.

### Mutation queue

- Stores only method, path, JSON body, account identity, retry metadata, and invalidation prefixes.
- Collapses superseded mutations sharing a dedupe key, such as repeated edits to the same habit/date.
- Flushes in creation order for each account.
- Retries offline, timeout, 408, 425, 429, and 5xx failures with bounded exponential backoff.
- Marks other 4xx responses as failed and exposes manual retry rather than retrying forever.
- Never queues tokens, auth headers, passwords, imports, or provider synchronization commands.

### React integration

- High-frequency record interactions apply their local state before enqueuing.
- The returned `committed` promise is used only for server reconciliation, not for closing a form or enabling the next interaction.
- A shared sync indicator reports Saved, Saving, Queued offline, or Needs attention without modal interruption.

### Native integration

- Uses the same response cache and mutation queue because the Capacitor WebView provides persistent local storage.
- Flushes on browser `online`, native focus, and visible/resume transitions.
- Keeps the native header compact while exposing queue state in an accessible status label.

## Failure Handling

- No cache and backend unavailable: show the existing offline/error state.
- Stale cache and backend unavailable: keep stale content and show queued/offline freshness state.
- Transient mutation failure: retain the optimistic record and queue it for retry.
- Permanent validation/authorization failure: mark the mutation failed, keep it visible in sync status, and allow retry after correction.
- Logout/account change: active account cache and pending mutations are cleared or isolated so another account cannot see them.
- Conflict: server truth wins after revalidation; a failed mutation remains reviewable instead of silently disappearing.

## Tradeoffs and Decisions

- Chosen: a small repository-native cache/queue layer. Rejected: adding TanStack Query plus a separate persistence plugin. This avoids a broad rewrite and bundle increase, accepting that endpoint-specific optimistic UI still belongs in page code.
- Chosen: local storage for hot synchronous data. Rejected: IndexedDB-only caching. This meets the first-frame target, accepting a bounded cache size.
- Chosen: stale-while-revalidate. Rejected: cache invalidation by deletion. Users may briefly see old values, but never a 20-second blank screen.
- Chosen: optimistic writes only for normal records. Rejected: fire-and-forget for auth/import/sync commands because those operations require authoritative server results.

## Testing Strategy

- Unit-test account isolation, stale preservation, subscriptions, mutation persistence, deduplication, retry classification, and ordering.
- Contract-test the route preload manifest and navigation intent listeners.
- Test that representative habits, workout, finance, and media edits update local state before their network promise resolves.
- Test native online/resume flushing and sync-state rendering.
- Run focused browser checks with a deliberately delayed API response.

## Success Criteria

- A previously visited route renders cached content without awaiting a mocked 20-second response.
- A normal record edit visibly completes before the request resolves.
- Reloading with a queued mutation retains it and later sends it once connectivity returns.
- Fresh responses update subscribed consumers.
- Account switching cannot expose another account’s cache or pending writes.

