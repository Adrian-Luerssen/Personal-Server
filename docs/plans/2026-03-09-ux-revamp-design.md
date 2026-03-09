# UX Revamp & Platform Enhancement Design

Date: 2026-03-09

## Overview

Full platform refresh covering: UI/UX redesign with personalization, Spotify OAuth frontend, agent chat copilot, landing page, icon system migration, and comprehensive Playwright testing with visual regression.

---

## 1. Personalization System

### Database Schema

New `app_account_preferences` table:

| Column          | Type         | Default      | Notes                                      |
|-----------------|--------------|--------------|--------------------------------------------|
| id              | UUID PK      | generated    |                                            |
| accountId       | FK -> Account| required     | one-to-one                                 |
| accentColor     | varchar(7)   | '#7dd3fc'    | hex color                                  |
| themeMode       | enum         | 'dark'       | 'dark', 'light', 'auto'                   |
| background      | jsonb        | null         | { type: 'solid'|'gradient'|'image', value} |
| sidebarPosition | enum         | 'left'       | 'left', 'right'                            |
| density         | enum         | 'comfortable'| 'compact', 'comfortable', 'spacious'      |
| customCss       | text         | null         | raw CSS override                           |
| createdAt       | timestamptz  | now()        |                                            |
| updatedAt       | timestamptz  | now()        |                                            |

### Data Flow

1. On login/app load: fetch preferences from API, write to localStorage
2. On page render: read localStorage first (instant, no flash), then hydrate from API if stale
3. On preference change: update localStorage immediately, then POST to API
4. CSS variable injection: `<style>` tag in `<head>` overrides defaults with user choices

### API Endpoints

- `GET /accounts/preferences` - fetch current preferences
- `PATCH /accounts/preferences` - partial update
- `POST /accounts/preferences/background` - upload background image (multipart)

### Settings UI - Appearance Tab

- Color picker for accent color (with preset swatches)
- Theme mode toggle (dark/light/auto with system detection)
- Background selector (solid color, gradient builder, image upload)
- Sidebar position toggle
- Density radio buttons with live preview
- Custom CSS textarea (advanced, collapsible)
- "Reset to defaults" button

---

## 2. Icon System & UI Refresh

### Icon Migration

**Base library**: Lucide React (`lucide-react`) - tree-shakeable, 1400+ icons.

**Custom SVGs** in `components/icons/` for domain-specific icons:
- Workout: dumbbell variants, muscle groups, exercise types
- Finance: wallet types, Cashew category icons
- Habits: streak flame, check variations
- Spotify: waveform, vinyl, headphones

**Icon wrapper component**:
```jsx
<Icon name="dumbbell" size={20} />
```
Resolves Lucide icons by name, falls back to custom SVGs. Respects density setting. Inherits color via CSS currentColor.

### UI Refresh Principles

- Remove all emojis from code, UI labels, settings
- Tighten spacing with density-aware padding
- Consistent card elevation (standardize shadow/blur)
- Type scale as CSS variables (heading, body, caption, overline)
- Micro-interactions (hover transitions, focus rings, button press)
- Consistent skeleton loading across all pages

### Complete Page Inventory (all refreshed)

**Auth**: Landing, Login, Register

**Dashboard**: Home

**Spotify**: SpotifyPersonal, SpotifyGlobal

**Workout**: Overview, Active, History, Exercises, Bodyweight, Import

**Finance**: Overview, Transactions, Wallets, Import

**Habits**: Habits, Import

**Settings**: All tabs (Agent Keys, Connections, Preferences, Appearance)

**Profile**: Account info, password, MFA

**Shared**: All modals, StatCard, AnimatedNumber, LoadingSpinner/Line/Dot, SkeletonCard, SessionCard, SetRow, PodiumCard, HistoryItem, StepIndicator, ProgressBar, alerts, tabs, forms, buttons

~35+ distinct views/components.

---

## 3. Spotify OAuth Frontend

### Two Connection Methods (Settings > Connections tab)

**Tab A: OAuth Redirect**
1. User clicks "Connect with Spotify"
2. Frontend calls `GET /api/auth/spotify/link` -> gets authorization URL
3. Redirect to Spotify auth page
4. Spotify redirects back to `/spotify/callback?code=...`
5. Frontend captures code, calls `POST /api/auth/spotify/callback/:accountId`
6. Backend exchanges code for tokens, stores them
7. Success state, redirect to Spotify page

**Tab B: Manual Token Entry**
- Two fields: Access Token, Refresh Token
- "Save Tokens" button -> `POST /api/spotify/tokens`

### Backend Changes
- Ensure `GET /auth/spotify/link` returns URL to frontend (not server redirect)
- Add frontend callback route `/spotify/callback`
- Production `SPOTIFY_REDIRECT_URI` points to frontend callback URL

### UI States
- Not connected: show both methods
- Connected: profile info, disconnect button, re-authenticate option
- Error: clear messages for expired/revoked tokens

---

## 4. Agent Chat Copilot

### Architecture

```
User (browser)                    Backend (NestJS)                  Agent (external)
     |                                  |                                  |
     |-- POST /chat/messages ---------->| store message, status: 'sent'    |
     |   {text, pageContext}            |                                  |
     |                                  |<-- GET /v1/chat/unread ----------|
     |                                  |    return unread messages         |
     |                                  |<-- PATCH /v1/chat/messages/:id --|
     |                                  |    {status: 'read'}              |
     |                                  |<-- PATCH /v1/chat/messages/:id --|
     |                                  |    {status: 'thinking'}          |
     |                                  |<-- POST /v1/chat/messages -------|
     |                                  |    {text, replyTo}               |
     |<-- poll (3s open / 30s closed) --|    status: 'delivered'           |
```

### Database Schema

**chat_conversation**

| Column     | Type         | Notes                        |
|------------|--------------|------------------------------|
| id         | UUID PK      |                              |
| accountId  | FK -> Account|                              |
| title      | varchar(200) | nullable, auto or user-set   |
| createdAt  | timestamptz  |                              |
| updatedAt  | timestamptz  |                              |

**chat_message**

| Column         | Type         | Notes                                    |
|----------------|--------------|------------------------------------------|
| id             | UUID PK      |                                          |
| conversationId | FK -> conversation |                                    |
| accountId      | FK -> Account|                                          |
| sender         | enum         | 'user', 'agent'                         |
| agentKeyId     | FK -> AgentKey| nullable, which agent sent it           |
| text           | text         |                                          |
| status         | enum         | 'sent', 'read', 'thinking', 'delivered', 'error' |
| pageContext    | jsonb        | nullable, auto-captured page state       |
| replyToId      | FK -> chat_message | nullable                           |
| createdAt      | timestamptz  |                                          |
| updatedAt      | timestamptz  |                                          |

### Page Context Auto-Capture

Each page provides structured metadata via a hook:

```js
// /workout/history with session selected:
{
  route: '/workout/history',
  pageType: 'workout-history',
  filters: { timeframe: '30d' },
  selectedItem: { type: 'session', id: 'abc-123', date: '2026-03-05', title: 'Push Day' }
}
```

Attached automatically to every user message.

### API Endpoints

**User-facing (JWT auth):**
- `GET /chat/conversations` - list conversations
- `POST /chat/conversations` - create new
- `GET /chat/conversations/:id/messages` - get messages (paginated)
- `POST /chat/conversations/:id/messages` - send user message
- `DELETE /chat/conversations/:id` - delete conversation

**Agent-facing (API key, scopes: chat:read, chat:write):**
- `GET /v1/chat/unread` - unread messages for this account
- `GET /v1/chat/conversations/:id/messages` - read conversation
- `PATCH /v1/chat/messages/:id` - update status (read, thinking)
- `POST /v1/chat/conversations/:id/messages` - post reply

### Frontend UI

- Sliding drawer on right side (~350px)
- Fixed toggle button (bottom-right) with unread badge
- Conversation list view -> individual conversation
- Message bubbles with status: single check (sent), double check (read), animated dots (thinking), delivered, red (error)
- Page context chip above input
- Polling: 3s when open, 30s when closed
- Notification badge on toggle button when new messages arrive while closed

---

## 5. Agent Skill Document

### Location
- File: `docs/agent-skill.md`
- Endpoint: `GET /api/agent-skill` (unauthenticated, returns raw markdown)

### Content
- Authentication: X-API-Key header, key format
- Available scopes with descriptions
- All v1 endpoints with request/response examples
- Chat protocol: polling, status updates, reply flow
- Data domains: workout, finance, habits, music relationships
- Behavioral guidelines: polling intervals, rate limits, pageContext interpretation

---

## 6. Landing Page

### Vibe
Dark, cinematic, high-contrast. Linear.app meets Raycast aesthetic.

### Sections (single-page scroll)

**Hero**: Full viewport, animated gradient mesh/particles, bold headline, two CTAs (Get Started, Login), floating dashboard mockup with glow + 3D tilt

**Feature Showcase**: Staggered cards per domain (Workouts, Finance, Habits, Music, Agent Copilot), glassmorphism with domain accent color glow, custom icons, one-liner descriptions

**Live Data Feel**: Animated counters, mock dashboard widget that "updates", subtle grid/particle background

**Agent/Copilot Section**: Split layout - chat mockup + explanation, fake conversation with context chips and status indicators

**Personalization Section**: Theme switching animation, grid of dashboard in different color schemes

**Footer**: Minimal - GitHub link, tech stack badges, version, login/register links

### Technical
- Pure CSS animations, Intersection Observer for scroll triggers
- No extra dependencies
- Responsive: stacks on mobile, still dramatic

---

## 7. Playwright Testing

### Setup
- Config: `frontend/playwright.config.ts`
- Tests: `frontend/tests/`
- Baselines: `frontend/tests/__screenshots__/`

### Test Structure (~65 files, ~200+ cases)

```
frontend/tests/
  auth/           landing, login, register
  dashboard/      home
  spotify/        connection, personal, currently-playing
  workout/        overview, exercises, history, bodyweight, import
  finance/        overview, transactions, wallets, import
  habits/         habits, import
  settings/       appearance, agent-keys, connections
  profile/        profile
  chat/           panel, messaging, notifications
  personalization/ theme-switching, accent-color, density, sidebar
  responsive/     mobile, tablet, desktop
  visual-regression/ pages, modals, density, landing
```

### Visual Regression
- `toHaveScreenshot()` with 0.1% pixel diff threshold
- Baselines committed to repo
- Dark + light mode for every screenshot
- Separate baselines per density
- `--update-snapshots` to regenerate after intentional changes

### Test Utilities
- `fixtures/auth.ts` - login helper, authenticated context
- `fixtures/mock-data.ts` - seed data for consistent state
- `fixtures/api.ts` - API helpers for test setup
