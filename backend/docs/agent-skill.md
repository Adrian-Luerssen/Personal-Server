# Personal Server - Agent Skill Document

A comprehensive guide for AI agents to interact with the Personal Server API.

## 1. Authentication

All API requests require an API key passed via the `X-API-Key` HTTP header.

- **Header:** `X-API-Key`
- **Key format:** `ps_live_` prefix followed by a random string (e.g., `ps_live_abc12345xyz...`)
- **Key creation:** Users create keys in **Settings > Agent Keys** within the app
- **Scope-limited:** Each key is assigned specific scopes that restrict which endpoints it can access
- **Key metadata:** Keys track `lastUsedAt`, `requestCount`, and can have an optional `expiresAt` date

```bash
curl -H "X-API-Key: ps_live_abc12345xyz..." https://your-server.com/api/v1/workout/sessions
```

---

## 2. Available Scopes

Each agent key is assigned one or more scopes. Requests to endpoints outside the key's scopes will be rejected.

| Scope | Description |
|---|---|
| `workout:read` | Read workout sessions, exercises, bodyweight |
| `workout:write` | Create/update workout data |
| `finance:read` | Read transactions, wallets, categories |
| `finance:write` | Create/update financial data |
| `habits:read` | Read habits and entries |
| `habits:write` | Create/update habit data |
| `music:read` | Read Spotify listening history |
| `dashboard:read` | Read cross-domain analytics |
| `profile:read` | Read basic profile info |
| `chat:read` | Read chat conversations and messages |
| `chat:write` | Send messages and update message status |
| `notifications:read` | Read app notification delivery state |
| `notifications:write` | Create custom notifications for the user |

---

## 3. API v1 Endpoints

Base path: `/api/v1/`

### 3.1 Workout Endpoints

All workout endpoints require the `workout:read` scope.

#### GET /api/v1/workout/sessions

Get paginated workout sessions.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/workout/sessions?page=1&limit=10"
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "startedAt": "2026-03-09T10:00:00.000Z",
      "endedAt": "2026-03-09T11:30:00.000Z",
      "sets": [
        {
          "id": "uuid",
          "exercise": { "id": "uuid", "name": "Bench Press", "category": "Chest" },
          "reps": 10,
          "weight": 80,
          "setOrder": 1
        }
      ]
    }
  ],
  "totalWorkouts": 42,
  "totalSets": 500,
  "totalReps": 5000,
  "totalVolume": 250000,
  "totalTimeSeconds": 180000
}
```

#### GET /api/v1/workout/sessions/recent

Get the most recent workout sessions.

**Query Parameters:**
- `limit` (number, default: 5) - Number of recent sessions to return

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/workout/sessions/recent?limit=3"
```

#### GET /api/v1/workout/sessions/active

Get the current active session (if any). Returns the session if the user is currently working out, or null.

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/workout/sessions/active"
```

#### GET /api/v1/workout/sessions/:id

Get a specific workout session by ID.

**Path Parameters:**
- `id` (UUID) - Session ID

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/workout/sessions/550e8400-e29b-41d4-a716-446655440000"
```

#### GET /api/v1/workout/stats

Get aggregate workout statistics.

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/workout/stats"
```

**Response:**
```json
{
  "totalWorkouts": 42,
  "totalSets": 500,
  "totalReps": 5000,
  "totalVolume": 250000,
  "totalTimeSeconds": 180000
}
```

#### GET /api/v1/workout/exercises

Get all available exercises.

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/workout/exercises"
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Bench Press",
    "category": "Chest"
  }
]
```

#### GET /api/v1/workout/bodyweight

Get all bodyweight entries.

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/workout/bodyweight"
```

**Response:**
```json
[
  {
    "id": "uuid",
    "weight": 75.5,
    "date": "2026-03-09"
  }
]
```

### 3.2 Finance Endpoints

All finance endpoints require the `finance:read` scope.

#### GET /api/v1/finance/transactions

Get paginated transactions with optional filters.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50, max: 200) - Items per page
- `walletId` (UUID, optional) - Filter by wallet
- `categoryId` (UUID, optional) - Filter by category (includes subcategories)
- `from` (ISO date, optional) - Start date
- `to` (ISO date, optional) - End date
- `isIncome` ("true" or "false", optional) - Filter by income/expense
- `search` (string, optional) - Search transaction names

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/finance/transactions?from=2026-02-01&to=2026-02-28&limit=100"
```

#### GET /api/v1/finance/transactions/summary

Get financial summary: income/expense totals, net balance, top expense categories, daily sparkline.

**Query Parameters:**
- `walletId` (UUID, optional) - Filter by wallet
- `categoryId` (UUID, optional) - Filter by category
- `from` (ISO date, optional) - Start date
- `to` (ISO date, optional) - End date

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/finance/transactions/summary?from=2026-02-01&to=2026-02-28"
```

#### GET /api/v1/finance/wallets

Get all wallets with computed balances.

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/finance/wallets"
```

#### GET /api/v1/finance/categories

Get spending categories as a hierarchical tree (parents with subcategories).

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/finance/categories"
```

#### GET /api/v1/finance/subscriptions

Get all subscriptions with wallet and category details.

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/finance/subscriptions"
```

### 3.3 Habits Endpoints

All habits endpoints require the `habits:read` scope.

> **Note:** Habits endpoints are currently stubs returning empty data. They will be fully implemented in an upcoming release.

#### GET /api/v1/habits

Get all habits.

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/habits"
```

**Response:**
```json
{
  "message": "Habits module coming soon",
  "data": []
}
```

#### GET /api/v1/habits/entries

Get habit entries (completion history).

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/habits/entries"
```

#### GET /api/v1/habits/today

Get today's habit completions.

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/habits/today"
```

### 3.4 Dashboard Endpoints

All dashboard endpoints require the `dashboard:read` scope.

#### GET /api/v1/dashboard/streams/workout

Get Spotify streams that occurred during workout sessions. Useful for understanding the user's listening habits while exercising.

**Query Parameters:**
- `timeframe` (string, optional) - Preset: `today`, `7d`, `30d`, `1y`, `all`
- `from` (string, optional) - ISO start datetime
- `to` (string, optional) - ISO end datetime

Use either `timeframe` or `from`/`to`, not both.

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/dashboard/streams/workout?timeframe=30d"
```

### 3.5 Chat Endpoints

Chat endpoints live at `/api/v1/chat/` and require `chat:read` or `chat:write` scopes.

#### GET /api/v1/chat/unread

Get unread messages for the agent to process. This is the primary polling endpoint.

**Scope:** `chat:read`

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/chat/unread"
```

**Response:**
```json
[
  {
    "id": "msg-uuid",
    "conversationId": "conv-uuid",
    "accountId": "account-uuid",
    "sender": "user",
    "text": "How many workouts did I do this week?",
    "status": "sent",
    "pageContext": {
      "pageType": "workout",
      "filters": { "timeframe": "7d" }
    },
    "replyToId": null,
    "createdAt": "2026-03-09T14:30:00.000Z",
    "updatedAt": "2026-03-09T14:30:00.000Z"
  }
]
```

#### GET /api/v1/chat/conversations/:id/messages

Get messages in a specific conversation.

**Scope:** `chat:read`

**Path Parameters:**
- `id` (UUID) - Conversation ID

**Query Parameters:**
- `after` (string, optional) - ISO timestamp; only return messages created after this time

```bash
curl -H "X-API-Key: ps_live_..." "https://your-server.com/api/v1/chat/conversations/conv-uuid/messages?after=2026-03-09T00:00:00Z"
```

#### PATCH /api/v1/chat/messages/:id

Update message status (mark as read, thinking, error, etc.).

**Scope:** `chat:write`

**Path Parameters:**
- `id` (UUID) - Message ID

**Request Body:**
```json
{
  "status": "read"
}
```

Valid status values: `sent`, `read`, `thinking`, `delivered`, `error`

```bash
curl -X PATCH \
  -H "X-API-Key: ps_live_..." \
  -H "Content-Type: application/json" \
  -d '{"status": "read"}' \
  "https://your-server.com/api/v1/chat/messages/msg-uuid"
```

#### POST /api/v1/chat/conversations/:id/messages

Send an agent reply to a conversation.

**Scope:** `chat:write`

**Path Parameters:**
- `id` (UUID) - Conversation ID

**Request Body:**
```json
{
  "text": "You completed 5 workouts this week!",
  "replyToId": "msg-uuid-of-original-question"
}
```

- `text` (string, required) - The reply message content
- `replyToId` (string, optional) - UUID of the message being replied to

```bash
curl -X POST \
  -H "X-API-Key: ps_live_..." \
  -H "Content-Type: application/json" \
  -d '{"text": "You completed 5 workouts this week!", "replyToId": "msg-uuid"}' \
  "https://your-server.com/api/v1/chat/conversations/conv-uuid/messages"
```

**Response:**
```json
{
  "id": "new-msg-uuid",
  "conversationId": "conv-uuid",
  "sender": "agent",
  "text": "You completed 5 workouts this week!",
  "status": "delivered",
  "replyToId": "msg-uuid",
  "createdAt": "2026-03-09T14:30:05.000Z"
}
```

### 3.6 Notification Endpoints

Notification endpoints let the agent write contextual alerts for the user. The backend persists the notification; the mobile app decides whether to deliver it based on notification permission and user settings.

#### POST /api/v1/notifications

Create a custom notification.

**Scope:** `notifications:write`

**Request Body:**
```json
{
  "title": "Workout review",
  "body": "Your weekly workout consistency dropped below target.",
  "category": "workout",
  "priority": "high",
  "actionUrl": "/workout",
  "scheduledFor": "2026-06-25T20:00:00.000Z",
  "metadata": { "reason": "weekly_review" }
}
```

- `title` (string, required) - Short notification title, max 120 characters.
- `body` (string, required) - Notification body, max 600 characters.
- `category` (string, optional) - `assistant`, `habits`, `workout`, `finance`, `music`, `media`, `system`, or `updates`.
- `priority` (string, optional) - `low`, `normal`, or `high`.
- `actionUrl` (string, optional) - In-app route the user should open.
- `scheduledFor` (ISO string, optional) - Defer delivery until this time.
- `metadata` (object, optional) - Structured reason/context for auditability.

```bash
curl -X POST \
  -H "X-API-Key: ps_live_..." \
  -H "Content-Type: application/json" \
  -d '{"title":"Workout review","body":"Your weekly workout consistency dropped below target.","category":"workout","priority":"high","actionUrl":"/workout"}' \
  "https://your-server.com/api/v1/notifications"
```

**Response:**
```json
{
  "id": "notification-uuid",
  "source": "agent",
  "status": "pending",
  "category": "workout",
  "priority": "high",
  "title": "Workout review",
  "body": "Your weekly workout consistency dropped below target.",
  "actionUrl": "/workout",
  "createdAt": "2026-06-25T14:30:00.000Z"
}
```

---

## 4. Chat Protocol

### Message Lifecycle

When a user sends a message, it flows through these statuses:

1. **`sent`** - User sent the message; agent has not yet seen it
2. **`read`** - Agent has acknowledged/read the message
3. **`thinking`** - Agent is processing and preparing a reply
4. **`delivered`** - Agent's reply has been sent back
5. **`error`** - Something went wrong during processing

### Agent Polling Flow

1. **Poll for unread messages** using `GET /api/v1/chat/unread`
2. For each unread message:
   - **Mark as read:** `PATCH /api/v1/chat/messages/:id` with `{"status": "read"}`
   - **Mark as thinking:** `PATCH /api/v1/chat/messages/:id` with `{"status": "thinking"}`
   - **Process** the message (query data, reason, prepare response)
   - **Send reply:** `POST /api/v1/chat/conversations/:conversationId/messages` with the reply text and `replyToId`
   - **Mark original message as delivered:** `PATCH /api/v1/chat/messages/:id` with `{"status": "delivered"}`
3. The reply message is automatically created with status `delivered`.

> **CRITICAL:** You MUST mark the original user message as `delivered` (step 2.5) after sending your reply. If you skip this step, the user will see infinite "thinking" dots and their original message text will be hidden. The complete status flow for the user's message is: `sent → read → thinking → delivered`.

### Polling Schedule

- **Idle polling:** Every **30 seconds**, call `GET /api/v1/chat/unread`
- **Active conversation:** During an active reply flow (after receiving a message, while processing), poll at **5-second intervals** for any follow-up messages
- **Back to idle:** Return to 30-second polling after completing all pending replies

---

## 5. Data Domains

### Workout
- **Sessions:** Timed workout sessions with start/end timestamps
- **Exercises:** Named exercises with categories (e.g., "Bench Press" / "Chest")
- **Sets:** Individual sets within a session, each linked to an exercise, with reps and weight
- **Bodyweight:** Daily bodyweight tracking entries

### Finance
- **Wallets:** Named accounts/wallets for tracking balances
- **Transactions:** Income and expense records with amounts and dates
- **Categories:** Spending categories for organizing transactions

### Habits
- **Habits:** Recurring behaviors to track (e.g., "Meditate", "Read")
- **Entries:** Daily completion records for each habit
- **Streaks:** Consecutive days of completion (derived from entries)

### Music
- **Spotify integration:** Listening history synced from Spotify
- **Currently read-only** for agents (scope: `music:read`)
- Cross-referenced with workouts via the dashboard endpoint

---

## 6. Behavioral Guidelines

### Rate Limiting

- Be mindful of request frequency; avoid making unnecessary API calls
- Cache data when possible; do not re-fetch data that has not changed
- Batch related queries instead of making many small requests

### Page Context Interpretation

When a user sends a message, it **may or may not** include a `pageContext` object. The user has a toggle to control whether their current page context is attached. Always check for its presence before using it — if `pageContext` is `null` or absent, the user chose not to share it. Do not ask about it.

When present, `pageContext` indicates where in the app the user is currently viewing. Use this context to provide more relevant responses.

**pageContext structure:**
```json
{
  "pageType": "string",
  "filters": {},
  "selectedItem": {}
}
```

**Page types and their meaning:**

| pageType | User is viewing | How to use it |
|---|---|---|
| `workout` | Workout page | User is likely asking about workout data. Use filters (e.g., timeframe) to scope queries. |
| `workout-session` | A specific session | `selectedItem` contains the session ID. User may be asking about that specific session. |
| `finance` | Finance overview | User is asking about financial data. Apply any filters present. |
| `habits` | Habits tracker | User wants habit-related information. |
| `music` | Music/Spotify page | User is asking about listening history. |
| `dashboard` | Dashboard/analytics | User wants cross-domain insights. |
| `settings` | Settings page | User may be asking about configuration. |

**Example pageContext objects:**

Workout page with timeframe filter:
```json
{
  "pageType": "workout",
  "filters": { "timeframe": "30d" }
}
```

Viewing a specific workout session:
```json
{
  "pageType": "workout-session",
  "selectedItem": { "id": "session-uuid" }
}
```

Dashboard with date range:
```json
{
  "pageType": "dashboard",
  "filters": { "from": "2026-01-01", "to": "2026-03-09" }
}
```

Habits page:
```json
{
  "pageType": "habits"
}
```

---

## 7. Response Formatting

The chat UI renders agent replies as **Markdown**. Use proper Markdown formatting to make your responses clear and readable.

### Formatting Rules

- Use `##` or `###` headers to separate sections in longer responses
- Use **bold** for key numbers and important terms
- Use bullet lists (`-`) for itemized data
- Use numbered lists (`1.`) for sequential steps
- Use Markdown tables for comparisons (keep to **4 columns max** to fit mobile screens)
- Use `` `inline code` `` for IDs, values, or technical terms
- Use fenced code blocks (` ``` `) for raw data, with language tags for syntax highlighting
- Use `>` blockquotes for notes or caveats
- Use `---` horizontal rules to separate major sections

### Do NOT

- Use ASCII-art tables (pipes and dashes drawn manually) — use proper Markdown tables
- Send walls of unformatted text — break it up with headers and lists
- Overuse emojis — one or two per response is fine as visual anchors, not more
- Use HTML tags — only standard Markdown is supported

### Example Response

```markdown
## February Finance Summary

**Income:** €3,416/month
**Expenses:** €2,041/month
**Net savings:** €1,375/month

### Savings Scenarios

| Scenario | Monthly savings | Time to €60k |
|----------|----------------|--------------|
| Current pace | €1,375 | 44 months |
| Moderate cuts | €1,600 | 38 months |
| Aggressive cuts | €2,000 | 30 months |

### Recommendations

- **Night Out** (€126): could reduce to €50
- **Online Services** (€224): review subscriptions

> Note: Health expenses (€598) include therapy — not recommended to cut.
```

---

## 8. Example Flows

### Flow 1: Poll, Read, Think, Reply

Complete example of an agent processing an incoming user message.

**Step 1: Poll for unread messages**
```bash
curl -H "X-API-Key: ps_live_abc123..." \
  "https://your-server.com/api/v1/chat/unread"
```

Response:
```json
[
  {
    "id": "msg-001",
    "conversationId": "conv-001",
    "sender": "user",
    "text": "How many workouts did I do this week?",
    "status": "sent",
    "pageContext": { "pageType": "workout", "filters": { "timeframe": "7d" } },
    "replyToId": null,
    "createdAt": "2026-03-09T14:30:00.000Z"
  }
]
```

**Step 2: Mark message as read**
```bash
curl -X PATCH \
  -H "X-API-Key: ps_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"status": "read"}' \
  "https://your-server.com/api/v1/chat/messages/msg-001"
```

**Step 3: Mark message as thinking**
```bash
curl -X PATCH \
  -H "X-API-Key: ps_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"status": "thinking"}' \
  "https://your-server.com/api/v1/chat/messages/msg-001"
```

**Step 4: Query relevant data**
```bash
curl -H "X-API-Key: ps_live_abc123..." \
  "https://your-server.com/api/v1/workout/sessions/recent?limit=10"
```

**Step 5: Send reply**
```bash
curl -X POST \
  -H "X-API-Key: ps_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"text": "You completed 5 workouts this week! Your total volume was 12,500 kg across 45 sets.", "replyToId": "msg-001"}' \
  "https://your-server.com/api/v1/chat/conversations/conv-001/messages"
```

**Step 6: Mark original message as delivered (REQUIRED)**
```bash
curl -X PATCH \
  -H "X-API-Key: ps_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"status": "delivered"}' \
  "https://your-server.com/api/v1/chat/messages/msg-001"
```

> This clears the "thinking" indicator and restores the user's original message text in the UI.

### Flow 2: Querying Workout Data to Answer a Question

The user asks: "What's my heaviest bench press?"

**Step 1:** Receive the message via polling (as above).

**Step 2:** Mark as read, then thinking (as above).

**Step 3:** Get recent sessions with full set data:
```bash
curl -H "X-API-Key: ps_live_abc123..." \
  "https://your-server.com/api/v1/workout/sessions?page=1&limit=100"
```

**Step 4:** Parse the response. Iterate through all sessions and their sets to find the maximum weight for sets where the exercise name matches "Bench Press".

**Step 5:** Send the reply:
```bash
curl -X POST \
  -H "X-API-Key: ps_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"text": "Your heaviest bench press was **100 kg** for 3 reps on March 2nd, 2026.", "replyToId": "msg-001"}' \
  "https://your-server.com/api/v1/chat/conversations/conv-001/messages"
```

**Step 6:** Mark original message as delivered:
```bash
curl -X PATCH \
  -H "X-API-Key: ps_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"status": "delivered"}' \
  "https://your-server.com/api/v1/chat/messages/msg-001"
```

---

## Skill Endpoint

This document is also available at runtime:

```
GET /agent-skill
```

No authentication required. Returns this document as `text/markdown`.
