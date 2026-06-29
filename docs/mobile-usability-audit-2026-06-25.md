# Mobile App Usability Audit

Date: 2026-06-25  
Scope: Android/Capacitor app shell, mobile-only platform access, cached-first user flows, and the mobile rendering of Today, Habits, Workout, Finance, Media, Chat, Spotify Ranking, and Settings.

## Evidence Used

- Repository review of `frontend/src/App.jsx`, `frontend/src/components/Layout.jsx`, `frontend/src/components/Sidebar.jsx`, `frontend/src/pages/Home.jsx`, `frontend/src/pages/Habits/Habits.jsx`, `frontend/src/pages/Habits/HabitsSettings.jsx`, `frontend/src/pages/Workout/Workout.jsx`, `frontend/src/pages/Finance/*`, `frontend/src/pages/Media/*`, `frontend/src/pages/Settings/*`, `frontend/src/api.js`, and `frontend/src/notifications.js`.
- Rendered mobile audit at 390 x 844 Android viewport with `window.__NATIVE_APP__ = true`, mocked API responses, and route-by-route DOM inspection.
- Existing app constraints from Android/Capacitor work: mobile web gate, native app header, native bottom tabbar, cached API reads, sync watermarks, import progress streaming, notification permission work, and release/version work.
- Design references:
  - Material Design 2 bottom navigation: bottom navigation is intended for three to five top-level destinations. https://m2.material.io/components/bottom-navigation
  - Material Design 3 navigation bar: compact/medium navigation bars are for a small number of primary destinations. https://m3.material.io/components/navigation-bar/overview
  - Android offline-first architecture: reads should expose local data first and work without network access. https://developer.android.com/topic/architecture/data-layer/offline-first
  - Android data layer guidance: app data should be coordinated through a clear data layer. https://developer.android.com/topic/architecture/data-layer
  - WCAG 2.2 target size minimum: pointer targets need at least 24 x 24 CSS px or adequate spacing. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
  - WCAG 2.2 target size enhanced: 44 x 44 CSS px is the stronger target for comfortable touch. https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html

## Executive Summary

The app now has useful mobile foundations: native app detection, mobile web blocking, a native header, a native bottom tabbar, cached API reads, sync-watermark invalidation, import progress streaming, and local notification primitives. The usability problem is that most product areas are still desktop pages placed inside a phone shell. That creates three systemic issues:

1. The information architecture is wrong for the amount of functionality. Five bottom tabs are already full, but several major sections are not present in the tabbar at all: Media, Spotify, Settings subareas, imports, notification settings, app update state, and sync state.
2. High-frequency workflows are buried in dashboard-style pages. Habits, finance transactions, imports, media matching, and settings require too many taps, too much scanning, or horizontal scrolling.
3. The app does not yet communicate offline/cache/sync state clearly enough. The API cache exists, but users cannot reliably see whether local data is fresh, queued, stale, failed, or overwritten by web-side changes.

The highest priority redesign should not be visual polish. It should be a mobile interaction model: a Main Menu, section-specific subnavigation, resilient offline-first data states, and native-sized controls.

## Severity Definitions

- Critical: blocks core mobile usability, hides major functionality, causes blank screens, or makes data trust unclear.
- High: repeatedly slows core workflows or causes mis-entry on touch devices.
- Medium: creates confusion, inconsistency, or maintenance risk, but does not block the primary task.
- Low: polish, naming, or visual refinement after the workflow is correct.

## Rendered Mobile Audit Snapshot

Viewport: 390 x 844, Android user agent, native app flag enabled.

| Route | Observed issue | Touch target count under 44px | Notes |
| --- | --- | ---: | --- |
| `/home` | Dashboard is usable, but shows "cached/no local snapshot" and several widgets with zero values when data is absent. | 1 | Native dashboard is the most app-like surface, but cache/freshness states are vague. |
| `/habits` | Too many controls on first screen; daily logging, analytics, calendar, heatmap, import, and settings compete. | 13 of 19 | Add, Import, Settings, date controls, and status buttons are below comfortable touch size. |
| `/workout` | Blank page when the PR response contract is malformed. | N/A | `Workout.jsx` assumes `prs.map` after `api.get('/workout/sessions/prs')`; no route-level error boundary catches it. |
| `/finance` | Desktop dashboard layout on mobile; transaction entry competes with period selectors, stats, quick actions, wallet list, and table. | 5 | The transaction table is not mobile-native. |
| `/media` | Filters and library management are small and dense; season/franchise structure is missing. | 9 | Media cards show aggregate progress like `37/73`, which is not meaningful for multi-season anime/TV. |
| `/chat` | Minimal surface; no visible connection/agent status, delivery state, or recovery state. | 1 | Chat is important enough to need a native conversation experience. |
| `/settings` | Horizontal tab strip extends beyond the viewport and hides options. | 11 | Settings contains critical app controls but behaves like a desktop settings page. |
| `/spotify/ranking` | Period segmented control overflows the viewport. | 6 | "All Time" extends beyond the 390px viewport in the rendered audit. |

## Critical Findings

### 1. Bottom Navigation Is Carrying The Wrong Information Architecture

Evidence:

- Native bottom tabs are hard-coded in `frontend/src/components/Sidebar.jsx` with five destinations: Today, Train, Habits, Money, Chat.
- Routes exist for `/spotify`, `/spotify/ranking`, `/media`, `/media/import`, `/media/settings`, `/settings`, `/finance/settings`, `/habits/settings`, and imports in `frontend/src/App.jsx`, but many are not represented as first-class mobile destinations.
- The native header settings button is currently the only obvious escape hatch for global settings.

Why this hurts:

- Five bottom tabs is the practical upper limit. The app already hits that limit while omitting several core product areas.
- Users must remember where hidden pages live. For example, Spotify ranking exists, but Music is not in the tabbar. Media exists, but it is not in the tabbar. Import pages are scattered through section settings.
- The result feels like a web portal inside a phone, not an app with a navigable model.

Recommendation:

- Replace the current tabbar with four stable primary destinations:
  - Today
  - Menu
  - Assistant
  - Settings
- Or use:
  - Today
  - Activity
  - Library
  - Assistant
  - Menu
- Move section entry points into a native Main Menu page with large list rows:
  - Habits
  - Workout
  - Finance
  - Spotify
  - Media
  - Imports
  - Notifications
  - Sync and Offline
  - App Updates
- Inside each section, use a local subnav or segmented header specific to that section. This keeps global navigation stable and prevents the bottom bar from becoming a junk drawer.

### 2. Habits Is Still A Desktop Dashboard, Not A Daily Habit Logger

Evidence:

- `/habits` renders PageHeader actions, day board, date controls, daily progress, Needs Log group, Logged group, stat grid, calendar, and yearly heatmap in one scroll.
- Rendered mobile audit found 13 undersized interactive controls out of 19 visible controls.
- `HabitLogRow` exposes Done, Skip, Missed, progress ring, streak, frequency, success rate, and open/done status in every row.
- Habit reminders live inside `Habits Settings`, not global notification settings.

Why this hurts:

- The primary mobile habit job is fast daily logging. The current page asks users to parse analytics and management UI before or during that task.
- "Done/Skip/Missed" repeats for every habit and is visually dense. This increases mis-taps.
- Frequency and streak semantics are easy to misunderstand. A 4x/week habit showing a raw streak number does not explain whether the streak is days, weeks, or fulfilled periods.
- Import and Settings are visible as generic buttons, but the core "what should I do right now" action is not dominant enough.

Recommendation:

- Split Habits into mobile subpages:
  - `Today`: only habits due now, large swipe/tap actions, undo snackbar, pending sync indicator.
  - `Plan`: active habits, cadence, target, reminders.
  - `History`: calendar and heatmap.
  - `Import`: HabitShare import with streaming progress.
  - `Insights`: streaks, misses, success rate, trends.
- Make a habit row a large one-handed control:
  - Tap row opens details.
  - Primary large action marks Done.
  - Secondary overflow exposes Skip, Missed, Edit.
  - Swipe right Done, swipe left Missed or Skip with undo.
- Show streaks by cadence:
  - Daily: consecutive days.
  - Weekly: consecutive fulfilled weeks.
  - Monthly: consecutive fulfilled months.
  - Yearly: consecutive fulfilled years.
  - Negative streak: consecutive missed periods or number of misses in the current cadence window.
- Keep calendar and heatmap off the daily logging screen.

### 3. Settings Is Not Mobile-Native And Hides Important App Controls

Evidence:

- `frontend/src/pages/Settings/Settings.jsx` uses a horizontal tab set for Account, Connections, Agent API Keys, Appearance, Preferences, and Data.
- The rendered audit found the tab strip extending beyond the viewport. Buttons such as Appearance, Preferences, and Data were positioned beyond the visible width.
- Notification controls are not in Settings. Habit notification controls exist in `frontend/src/pages/Habits/HabitsSettings.jsx` and local notification primitives exist in `frontend/src/notifications.js`.

Why this hurts:

- Settings is where users expect permissions, notifications, app version, update status, account, data, and connected accounts. These are currently spread across unrelated surfaces.
- Horizontal tab scrolling is undiscoverable on mobile and creates a real risk that users never find Data or Preferences.
- App-level notification controls are missing, despite the platform needing notification permission and user preference controls.

Recommendation:

- Replace tabs with a Settings index list:
  - Account and Security
  - Connections
  - Notifications
  - Appearance
  - Data Management
  - Sync and Offline
  - App Version and Updates
  - Developer / Agent API Keys
- Add a dedicated Notifications page with toggles:
  - Habit reminders
  - Missed habit reminders
  - Workout reminders
  - Active workout nudges
  - Finance reminders
  - Spotify/ranking updates
  - Media import completion
  - Assistant replies
  - System/app update notifications
- Show permission status at the top: Granted, Denied, Promptable, Unsupported.
- Add "Send test notification" and "Open Android notification settings".

### 4. Cache Exists, But Offline-First UX Is Not Complete

Evidence:

- `frontend/src/api.js` has SWR-style cached reads, localStorage persistence, request deduplication, cache invalidation on mutations, sync watermarks, and preload paths.
- `Layout.jsx` calls `preloadDashboardData()` and `checkDataValidity()` on native app mount and repeats validity checks.
- The rendered `/home` screen can show "CACHED" and "No local snapshot", but there is no global sync center or clear per-section stale state.

Why this hurts:

- Users asked for no mobile latency and valid data matching the DB. Cache logic alone is not enough.
- The user needs to know when they are seeing local data, stale data, failed refresh data, queued offline changes, or fresh DB-confirmed data.
- Mutations currently invalidate caches, but the app does not present an explicit offline queue or conflict resolution flow when web and app changes overlap.

Recommendation:

- Add a Sync and Offline section:
  - Last successful sync by domain.
  - Pending local writes.
  - Failed writes with retry.
  - Conflicts needing review.
  - Force refresh.
  - Clear local cache.
- Make domain pages show compact data-state banners:
  - Fresh
  - Updating
  - Offline, using local data
  - Saved locally, syncing
  - Sync failed, tap to retry
  - Updated on web, refreshing local data
- Introduce explicit local mutation queue semantics for mobile writes:
  - optimistic local update
  - queued write
  - server acknowledgement
  - conflict check by entity `updatedAt` or sync cursor
  - rollback or merge prompt when needed
- Extend sync watermarks beyond dashboard invalidation into page-level visible state.

### 5. Route-Level Error Recovery Is Missing

Evidence:

- The rendered `/workout` audit produced a blank screen when `/workout/sessions/prs` returned an unexpected object, because `Workout.jsx` uses `prs.map`.
- `Workout.jsx` logs dashboard, PR, and start-workout errors to the console without consistent user-facing recovery.
- There is no obvious route-level error boundary in `App.jsx` wrapping guarded routes.

Why this hurts:

- Mobile users cannot inspect console errors. A blank route is a hard failure.
- API contract drift, transient backend errors, or stale cache shape can turn a whole section unusable.

Recommendation:

- Add route-level error boundaries around each major app section.
- Normalize API responses at the data layer before they reach UI components.
- Replace console-only failures with visible recovery:
  - "Could not load workout records"
  - Retry
  - Use cached data if available
  - Report details in developer diagnostics
- Add schema guards for arrays and object responses in domain loaders.

## High Findings

### 6. Finance Is A Desktop Finance Dashboard On A Phone

Evidence:

- `/finance` loads wallets, categories, summary, and transactions in one dashboard.
- It shows period buttons, stat cards, quick actions, spending chart, wallets, and recent transactions table.
- Rendered audit found undersized period controls and a desktop table on mobile.

Why this hurts:

- The most frequent finance action is adding or reviewing a transaction. The page prioritizes dashboard summary before transaction workflow.
- Tables are hard to scan and interact with on a phone.
- Wallets, categories, subscriptions, budgets, import, and data cleanup are distributed across dashboard quick actions and settings tabs.

Recommendation:

- Make Finance mobile subpages:
  - Today / This Month summary
  - Transactions
  - Add Transaction
  - Wallets
  - Budgets
  - Subscriptions
  - Import
- Replace transaction table with stacked transaction rows.
- Add a persistent floating Add Transaction action on finance routes.
- Add mobile import recovery state for long-running imports and server-side errors.
- Show "data table missing" and "finance data unavailable" as explicit recovery screens, not raw relation errors.

### 7. Media Library Model Does Not Match Anime/TV Reality

Evidence:

- `MediaCard` shows flat items with aggregate progress from `metadata.episodesWatched / metadata.episodes`.
- The item edit modal exposes title, status, rating, dates, episodes watched, description, genres, notes, and external matching.
- User-observed examples such as Blue Exorcist show multiple seasons clumped into one entity with progress like `37/73`.
- Import sources include MAL anime, MAL manga, TVTime, and Goodreads, but the UI does not express source-specific structure well enough.

Why this hurts:

- Aggregate progress is not meaningful when seasons have different names or when an anime franchise has multiple sequel entities.
- Users cannot tell what they completed, what they dropped, or which season is next.
- Imported categories and images can appear wrong because source records are being forced into a flat multi-tag model.

Recommendation:

- Redesign the media model and UI around hierarchy:
  - Franchise / Series group
  - Season / Work entity
  - Episode or volume progress
  - Source records and external IDs
- Treat anime seasons as separate trackable works, grouped under a parent franchise when matched.
- Treat TV shows as series with seasons and episodes.
- Show season cards inside a series detail:
  - Season title
  - Year
  - Episode count
  - User status
  - Watched episodes
  - Source match confidence
- Add a review queue for ambiguous imports:
  - wrong image
  - wrong category
  - duplicate candidate
  - possible season grouping
  - multiple external matches

### 8. Spotify Ranking Needs Mobile-Specific Controls And Beta State

Evidence:

- `/spotify/ranking` has period buttons for Day, Week, Month, 6 Months, Year, All Time.
- Rendered audit found period controls under 44px high and overflowing the viewport.
- The section depends on beta-limited Spotify users and profile picture availability.

Why this hurts:

- Ranking is a social comparison feature. It needs names, avatars, position changes, time period clarity, and empty/error states.
- Horizontal segmented controls with six labels are too wide on mobile.
- If Spotify is beta-limited, users need to understand whether they are eligible, connected, pending approval, or unsupported.

Recommendation:

- Replace period buttons with:
  - horizontally scrollable chips with snap and edge fade, or
  - a compact period dropdown.
- Ranking rows should include:
  - rank
  - profile picture or initials fallback
  - display name
  - stream count
  - listening time
  - position delta when available
- Add Spotify beta status:
  - Connected
  - Beta user allowed
  - Not in beta allowlist
  - Token expired
  - Refresh failed

### 9. Chat Is Too Thin For A Native Assistant

Evidence:

- `/chat` rendered with "New Conversation" and empty state only.
- The planned architecture uses sockets, session persistence, and an external AI agent relay, but the UI does not yet expose enough state.

Why this hurts:

- Users need confidence that a message was sent, saved, read by the agent, being processed, failed, or completed.
- Mobile chat must handle backgrounding, reconnecting, notification of replies, and long-running assistant tasks.

Recommendation:

- Add conversation list and message detail optimized for phone:
  - delivery states: sending, sent, delivered to agent, thinking, failed, complete
  - reconnect banner
  - retry failed message
  - assistant typing/thinking state
  - push notification on assistant reply
  - preserved draft
  - attachments later if needed
- Add a socket status pill:
  - Connected
  - Reconnecting
  - Offline, queued
  - Agent unavailable

### 10. Imports Are Improved Technically But Still Difficult On Mobile

Evidence:

- Habit, finance, and media imports use file accept helpers and `streamImportProgress`.
- Import pages are separate and scattered: Habit import inside Habit Settings, Finance import route, Media import route.
- Mobile file selection is sensitive to MIME and extension support from Android document providers.

Why this hurts:

- Imports are long-running and failure-prone. Users need a single place to see in-progress imports, completed imports, failed imports, and required file types.
- If a file picker hides files, the user has no clear explanation or fallback.
- Long imports need persistence across app backgrounding.

Recommendation:

- Add a global Import Center:
  - Choose source
  - Required file type
  - Last import status
  - Progress stream
  - Retry failed import
  - Cancel import
  - Review warnings
- Persist import jobs server-side and render status by job ID.
- Add "file picker troubleshooting" copy in the import page:
  - supported extensions
  - supported MIME types
  - Android document provider limitations
  - fallback to "show all files" when safe

### 11. Touch Targets Are Too Small Across Major Pages

Evidence:

- `/habits`: 13 visible controls under 44px.
- `/finance`: 5 visible controls under 44px.
- `/media`: 9 visible controls under 44px.
- `/settings`: 11 visible controls under 44px.
- `/spotify/ranking`: 6 visible controls under 44px.

Why this hurts:

- Small touch targets cause mis-taps, especially one-handed.
- Dense controls make the app feel visually complex even when the task is simple.

Recommendation:

- Use 44px minimum height for primary mobile controls.
- Use icon-only controls only when they have 44px tap boxes and accessible labels.
- Convert dense button groups to:
  - segmented controls with fewer options
  - dropdowns
  - bottom sheets
  - swipe actions
  - overflow menus

### 12. The App Has No Global Command/Menu/Search Surface

Evidence:

- Major routes exist but users must navigate by tab, settings button, or section quick action.
- There is no global search or command menu in the native shell.

Why this hurts:

- A personal server app has many domains. Users need a fast way to jump to "import media", "add transaction", "start workout", "habit reminders", "spotify ranking", or "data cleanup".

Recommendation:

- Add a native Main Menu with search at the top.
- Include command rows:
  - Add transaction
  - Log habits
  - Start workout
  - Import data
  - Ask AI
  - Check sync
  - App update
- Use recents and pinned shortcuts.

## Medium Findings

### 13. Header Is Too Static

Evidence:

- `NativeAppHeader` maps route titles and subtitles and always exposes Settings.
- It does not expose section-specific back, search, sync, filter, or overflow actions.

Impact:

- Users lose context when drilling into section pages.
- Important page actions move into page content or are hidden below the fold.

Recommendation:

- Make the header route-aware:
  - back button on nested routes
  - search/filter where relevant
  - sync status icon
  - overflow menu for secondary actions
  - app version/update state in Settings only, not every header

### 14. Loading, Empty, Error, And Stale States Are Inconsistent

Evidence:

- Some pages use skeletons.
- Some errors are console-only.
- Some empty states are generic.
- Cache/stale states are not consistently visible.

Impact:

- Users cannot tell whether they have no data, stale data, failed data, or a broken integration.

Recommendation:

- Standardize mobile states per section:
  - Loading cached data
  - Showing cached data
  - Refreshing
  - Empty
  - Permission needed
  - Integration disconnected
  - Server error
  - Offline
  - Sync conflict

### 15. Status Vocabulary Is Inconsistent

Evidence:

- Habit code uses `success`, `skip`, `fail`, and UI text "Done", "Skip", "Missed".
- Home handles both `fail` and `missed` as active missed state in places.

Impact:

- Users see one vocabulary while the data layer uses another.
- It becomes easy to calculate streaks or cache invalidation incorrectly.

Recommendation:

- Define one domain status contract:
  - `done`
  - `skipped`
  - `missed`
  - `open`
- Map legacy API values at the data layer.
- Make analytics use the normalized contract only.

### 16. Visual System Is Fragmented By Inline Styles

Evidence:

- Finance, settings, media, and habit settings have many inline styles.
- Some mobile behavior is centralized in `styles.css`, while many page-specific controls define their own spacing and sizing.

Impact:

- Fixing touch targets, typography, density, and mobile layouts requires repeated manual edits.
- It increases the chance of inconsistent mobile polish.

Recommendation:

- Create shared mobile primitives:
  - `MobileScreen`
  - `MobileSectionHeader`
  - `MobileListRow`
  - `MobileActionSheet`
  - `MobileSegmentedControl`
  - `MobileSyncBanner`
  - `MobileBottomSheet`
  - `MobileEmptyState`
- Route pages should compose these instead of hand-rolling mobile layout.

### 17. Destructive/Data Management Actions Need Better Recovery UX

Evidence:

- Finance delete/reset issues have surfaced as raw relation errors.
- Data Management currently sits inside Settings tabs.

Impact:

- A failed destructive action feels dangerous and ambiguous.
- Users need strong confirmation and clear recovery after errors.

Recommendation:

- Data Management should show:
  - what will be deleted
  - last backup/export date
  - affected tables/entities
  - dry-run count
  - failure reason in user language
  - retry after migration/setup
- Never show raw database relation names as the main user-facing message.

### 18. Native App Version And Releases Need A User-Facing Update Flow

Evidence:

- Version display exists in the mobile header and Settings version card.
- Release workflow exists, but the app UI still needs clear update availability and installed/released version comparison.

Impact:

- Users do not know whether their APK is outdated or what changed.

Recommendation:

- Add App Updates page:
  - installed version
  - latest release version
  - release date
  - changelog summary
  - APK download/open release button
  - update required vs optional
  - last checked time

## Missing Sections And Interactions

These sections should exist as first-class mobile experiences:

- Main Menu: complete navigation index with search and pinned shortcuts.
- Sync and Offline: freshness, queued writes, conflicts, retries, clear cache.
- Notification Settings: app-level preferences by notification category.
- App Updates: installed version, latest version, changelog, APK link.
- Import Center: job list, source-specific file guidance, streaming progress, retry/cancel.
- Habit Insights: cadence-aware streaks, negative streaks, missed-period count.
- Habit Detail: schedule, reminders, history, notes, edit, archive.
- Finance Quick Add: one-tap expense/income flow with recent wallet/category defaults.
- Finance Review Queue: imported/uncategorized transactions needing user action.
- Media Series Detail: seasons, episodes, external match status, source history.
- Media Import Review: ambiguous matches and wrong category/image corrections.
- Spotify Beta Status: allowed users, token state, missing profile picture state.
- Chat Connection State: socket/agent status, queued messages, retry.
- Diagnostics: API health, cache stats, sync cursor state, notification permission state.

## Section-by-Section Recommendations

### Today

Current issue: This is the best mobile surface, but it mixes overview widgets with action widgets and does not make sync/cache state actionable.

Improve by:

- Keep Today as the primary app launch.
- Make the first card a single action: log habits, resume workout, review transactions, or continue chat.
- Show a compact sync row: "Fresh 2m ago", "Offline", or "2 changes syncing".
- Let users customize Today cards from Settings.
- Avoid zero-value widgets when the connected section is not configured.

### Habits

Current issue: The habit tracker is too dense and manager-like.

Improve by:

- Daily logging screen first.
- Large action rows with undo.
- Separate Manage, History, Insights, Import.
- Cadence-aware streaks and negative streaks.
- Notification controls linked from Habit Detail and global Notification Settings.

### Workout

Current issue: Route resilience is weak and the page is dashboard-first.

Improve by:

- Make "Start workout" or "Resume workout" dominant.
- Add section nav: Active, History, Exercises, Bodyweight.
- Add error boundary and cached fallback.
- Make active workout usable offline, then sync sets afterward.
- Add workout reminder settings under global Notifications.

### Finance

Current issue: Too much dashboard content and a table-based transaction model.

Improve by:

- Make Add Transaction and Transactions first-class.
- Use mobile transaction rows, not tables.
- Add category/wallet defaults and recents.
- Move budgets/subscriptions/wallets into finance subnav.
- Put imports in Import Center and Finance section.

### Media

Current issue: Flat cards cannot model seasons, source records, or ambiguous matching.

Improve by:

- Group by franchise/series.
- Track seasons as separate entities.
- Add episode detail and next episode state.
- Add import review queue.
- Make wrong-image/wrong-category correction a first-class interaction.

### Spotify

Current issue: Ranking is hidden and period controls overflow.

Improve by:

- Add Spotify to Menu or Library section.
- Use avatar ranking rows.
- Add profile picture fallback.
- Add beta/user eligibility state.
- Replace period buttons with compact mobile control.

### Chat

Current issue: The assistant surface lacks message state and connection state.

Improve by:

- Add session list plus conversation detail.
- Show socket connection state.
- Show message persistence states.
- Queue messages offline.
- Notify on assistant replies.

### Settings

Current issue: Desktop tabs hide app-critical controls.

Improve by:

- Replace tabs with settings index.
- Add Notifications, Sync and Offline, App Updates.
- Keep dangerous data actions isolated and strongly explained.
- Make account/security separate from developer agent keys.

## Recommended Roadmap

### P0: Make The App Navigable And Trustworthy

1. Replace bottom-tab IA with a Main Menu based model.
2. Add route-level error boundaries and data shape guards.
3. Add global Sync and Offline state.
4. Add global Notification Settings and permission state.
5. Redesign Habits as a daily mobile logging workflow.

### P1: Convert Core Domains To Mobile Workflows

1. Finance: mobile transactions and quick add.
2. Workout: active/resume-first navigation and offline set queueing.
3. Chat: socket state, message states, retry, notifications.
4. Media: series/season detail and import review.
5. Spotify: ranking avatars, beta state, mobile period selector.

### P2: Polish And Consistency

1. Shared mobile UI primitives.
2. 44px minimum controls across native app routes.
3. Consistent empty/error/loading/stale states.
4. Consistent status vocabulary.
5. Accessibility pass: labels, focus, target size, color contrast, long text.
6. Localization/long-label stress test.

## Acceptance Criteria For The Redesign

- A new user can find every major section from the mobile app without knowing hidden URLs.
- No primary mobile route has horizontal overflow at 360px, 390px, or 430px widths.
- No primary visible touch target is under 44px unless it has adequate spacing and is not essential.
- Habits can be logged one-handed in under 10 seconds for a normal day.
- A missed/offline API request never produces a blank page.
- Every mutation shows one of: saved, queued, syncing, failed, or conflicted.
- Every cached section shows last refresh or stale state.
- Notification permission and notification category preferences are visible from Settings.
- Imports continue to show progress after navigation/backgrounding, or clearly resume by job ID.
- Media detail can distinguish franchise, season/work, and episode progress.
- Chat clearly shows socket/agent/message state.

## Suggested Test Plan

- Add Playwright native viewport tests for:
  - `/home`
  - `/habits`
  - `/workout`
  - `/finance`
  - `/media`
  - `/chat`
  - `/settings`
  - `/spotify/ranking`
- For each route, assert:
  - native header present
  - no horizontal document overflow
  - main heading present
  - no blank screen after malformed API response
  - at least one useful error or empty state
  - critical controls are at least 44px high
- Add API response contract guards in unit tests:
  - arrays stay arrays
  - missing optional fields do not crash route
  - stale cache fallback renders
  - sync-watermark invalidation updates visible state
- Add Android permission flow test:
  - promptable permission
  - granted permission
  - denied permission
  - unsupported web fallback

## Highest-Risk Bad Design Choices To Fix First

1. Treating the bottom nav as both global navigation and feature discovery.
2. Keeping desktop dashboards as the default mobile section pages.
3. Hiding critical settings and imports inside horizontal tab strips or section-specific settings.
4. Showing aggregate media progress instead of season/work-level progress.
5. Relying on cache implementation without exposing freshness, queue, conflict, and retry states.
6. Allowing API contract drift to blank a whole route.
7. Using many small inline-styled buttons instead of shared mobile controls.

## Final Recommendation

The app should be reworked around a native mobile shell rather than continuing to patch individual pages. The correct structure is:

- Today as the launch dashboard.
- Main Menu as the complete app map.
- Assistant as a persistent high-value destination.
- Settings as an index, not tabs.
- Domain sections with their own local navigation and mobile-specific workflows.
- A visible sync/offline contract everywhere user data can change.

This keeps the current backend and web app valuable while making the Android app feel like a fast, reliable companion rather than a compressed website.
