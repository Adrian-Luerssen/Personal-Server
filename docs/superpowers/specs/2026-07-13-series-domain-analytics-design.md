# Series Domain and Analytics Design

## Purpose

Replace the flat episode counter with a catalog-aware Series experience that understands traditional television seasons, individual episodes, and anime continuities. Add privacy-conscious Vercel Web Analytics to the shared React root used by the hosted site and Capacitor app.

## Product rules

- A traditional TV show remains one library item with many seasons and episodes.
- A MAL anime entry remains an independently trackable library item because cours, sequel seasons, OVAs, and films have their own status, progress, and rating.
- Anime entries may be connected by typed relations such as prequel, sequel, side story, spin-off, alternative, and parent story.
- Progress is recorded against a concrete episode whenever episode catalog data exists.
- Existing `metadata.episodesWatched` data remains valid. It is used as a fallback and sequentially backfilled when episodes are first synchronized.
- Specials are represented as season zero and do not distort regular-season progress totals.
- User ratings and statuses remain attached to the library item, not to the shared provider catalog.

## Persistence

Keep `MediaItem` as the user-owned release/title record and add three account-owned tables:

1. `MediaSeason`
   - Belongs to one `MediaItem`.
   - Stores provider identity, season number, name, overview, poster, air date, and episode count.
2. `MediaEpisode`
   - Belongs to one season and `MediaItem`.
   - Stores provider identity, season/episode numbers, title, overview, air date, runtime, image, watched state, and watched timestamp.
3. `MediaRelation`
   - Belongs to a source `MediaItem`.
   - Stores relation type and target provider identity/title/image/year.
   - Optionally links to another library `MediaItem` when the related MAL entry is already tracked.

Unique indexes make provider synchronization idempotent. All records retain `accountId` so authorization and deletion follow existing account ownership.

## Provider synchronization

`MediaCatalogService` owns synchronization and presentation queries.

- TMDB television: fetch show details and every returned season. Fetch each season's episodes, upsert seasons/episodes, preserve watched state, and derive aggregate progress.
- Jikan anime: fetch the MAL entry plus its relations. Upsert relation targets and connect them to matching local MAL IDs.
- Provider failures return an actionable API error without deleting existing catalog records.
- A catalog sync endpoint supports explicit refresh. The frontend invokes it after adding a provider-backed title and exposes refresh from the detail view.

## API

- `GET /media/:id/catalog` returns the library item, seasons with episodes, anime relations, derived progress, next episode, and provider sync state.
- `POST /media/:id/catalog/sync` refreshes TMDB or Jikan catalog data and returns the updated catalog view.
- `PATCH /media/:id/episodes/:episodeId` changes watched state. Marking an episode watched records `watchedAt`; unwatching clears it. Aggregate metadata is updated for compatibility.
- Existing CRUD and import endpoints remain compatible.

## Series experience

The library remains status-first but becomes informative:

- Rows show year, format, studio, provider score, airing state, season-aware progress, and the concrete next episode when known.
- TV progress reads `Season 3, Episode 7` rather than a global episode number.
- Anime progress remains per MAL release and displays its continuity position when relations exist.
- Selecting a title opens a dedicated information-first detail sheet instead of an edit form.
- TV details provide season navigation and episode checklists.
- Anime details provide a continuity rail ordered around prequel/current/sequel relationships.
- Editing metadata remains available as a secondary action.
- The primary action records the next concrete episode.

## Compatibility and migration

- The schema migration only adds tables and indexes; it does not mutate existing media rows.
- Titles without provider IDs continue using aggregate progress.
- During first TV synchronization, the first `episodesWatched` regular episodes are marked watched in air order.
- MAL imports remain separate items and are linked by provider relations when synchronized.

## Analytics

- Install `@vercel/analytics` and render `Analytics` once in the React application root using `@vercel/analytics/react`.
- Hosted Vercel builds use dynamic Web Analytics configuration supplied by Vercel.
- Capacitor builds use optional `VITE_VERCEL_ANALYTICS_SCRIPT_SRC`, `VITE_VERCEL_ANALYTICS_VIEW_ENDPOINT`, and `VITE_VERCEL_ANALYTICS_EVENT_ENDPOINT` values so the WebView can report to the deployed Vercel project instead of `capacitor://localhost`.
- `beforeSend` removes query strings and fragments so tokens or user-entered values cannot be included in page-view URLs.
- No media titles, account IDs, notes, payment data, or other personal content are sent as custom analytics properties.

## Failure states

- Missing provider configuration explains that synchronization is unavailable while retaining manual tracking.
- Catalog sync failure leaves the last successful catalog visible.
- Episode updates are optimistic in the UI and roll back on API failure.
- Empty season and relation states explain whether the provider returned no structure or has not been synchronized.

## Verification

- Entity and migration tests cover constraints and cascade behavior.
- Catalog service tests cover TV season ingestion, anime relations, idempotent refresh, existing-progress backfill, specials, and provider errors.
- API/service tests cover account scoping and episode progress transitions.
- Frontend unit tests cover season-aware progress, next-episode selection, and anime continuity ordering.
- Playwright covers TV season navigation, episode completion, anime continuity, responsive layout, and catalog failure messaging.
- Frontend/backend builds and Android sync/build must remain green.

## Out of scope

- Cross-user shared catalog tables.
- Streaming-provider availability and deep links.
- Automatic scrobbling from streaming applications.
- Arbitrary franchise graphs beyond provider-supplied relations.
