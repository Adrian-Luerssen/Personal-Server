# 🏗️ Architecture

This document describes the system architecture of Personal Server, including backend modules, database schema, frontend structure, and integration patterns.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Web Browser  │  │ Mobile App   │  │ AI Agents    │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          └────────────────┼─────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  React 18 + Vite + React Router + Chart.js + Socket.IO      │    │
│  │  Port: 5173 (dev) / 80 (prod via Nginx)                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (NestJS)                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  NestJS 9 + TypeORM + JWT Auth + Swagger                    │    │
│  │  Port: 3000                                                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │    Redis     │  │   Airflow    │
│  Port: 5432  │  │  Port: 6379  │  │  Port: 8080  │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Backend Architecture

### Module Structure

The backend follows NestJS's modular architecture with clear separation of concerns:

```
backend/src/
├── app.module.ts              # Root module
├── main.ts                    # Application entry point
│
├── system/                    # Core system module
│   ├── system.module.ts
│   ├── auth/                  # Authentication
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.token.guard.ts
│   │   ├── refreshToken.entity.ts
│   │   └── RequestContext.middleware.ts
│   ├── accounts/              # User accounts
│   │   ├── accounts.controller.ts
│   │   ├── accounts.service.ts
│   │   └── account.entity.ts
│   ├── spotify/               # Spotify OAuth
│   │   ├── spotify.controller.ts
│   │   ├── spotify.service.ts
│   │   └── spotifyCredentials.entity.ts
│   └── common/                # Shared utilities
│       ├── AbstractEntity.ts
│       ├── AbstractAccountOwnedEntity.ts
│       └── CrudEntity.decorator.ts
│
├── music/                     # Music/streaming module
│   ├── music.module.ts
│   ├── artists/
│   ├── albums/
│   ├── tracks/
│   ├── streams/
│   └── playlists/
│
├── workout/                   # Workout tracking module
│   ├── workout.module.ts
│   ├── categories/
│   ├── exercises/
│   ├── sessions/
│   ├── sets/
│   ├── bodyweight/
│   ├── routines/
│   └── import/                # FitNotes import
│
├── habits/                    # Habits tracking module
│   ├── habits.module.ts
│   ├── entities/
│   ├── habits/
│   ├── entries/
│   └── import/                # HabitShare import
│
├── finance/                   # Finance tracking module
│   ├── finance.module.ts
│   ├── entities/
│   ├── wallets/
│   ├── categories/
│   ├── transactions/
│   └── import/                # Cashew import
│
├── agents/                    # Agent API authentication
│   ├── agents.module.ts
│   ├── entities/
│   ├── guards/
│   ├── decorators/
│   └── constants/
│
├── api/                       # Versioned API for agents
│   └── v1/
│       ├── workout.controller.ts
│       ├── habits.controller.ts
│       └── finance.controller.ts
│
├── dashboard/                 # Cross-domain analytics
│   ├── dashboard.module.ts
│   ├── dashboard.controller.ts
│   └── dashboard.service.ts
│
├── health/                    # Health checks
└── tools/                     # Generic tools/utilities
```

### Module Dependencies

```
                         ┌─────────────────┐
                         │   AppModule     │
                         └────────┬────────┘
                                  │
    ┌─────────────┬───────────────┼───────────────┬─────────────┐
    ▼             ▼               ▼               ▼             ▼
┌─────────┐ ┌───────────┐ ┌───────────────┐ ┌───────────┐ ┌───────────┐
│ System  │ │  Music    │ │   Workout     │ │  Habits   │ │ Finance   │
│ Module  │ │  Module   │ │   Module      │ │  Module   │ │ Module    │
│ - Auth  │ │ - Artists │ │ - Categories  │ │ - Habits  │ │ - Wallets │
│-Accounts│ │ - Albums  │ │ - Exercises   │ │ - Entries │ │-Categories│
│ -Spotify│ │ - Tracks  │ │ - Sessions    │ │ - Import  │ │-Transact. │
└────┬────┘ │ - Streams │ │ - Sets        │ └───────────┘ │ - Import  │
     │      │-Playlists │ │ - Bodyweight  │       │       └───────────┘
     │      └───────────┘ │ - Routines    │       │             │
     │            │       │ - Import      │       │             │
     │            │       └───────────────┘       │             │
     │            │               │               │             │
     │            └───────┬───────┴───────────────┴─────────────┘
     │                    ▼
     │           ┌───────────────┐
     │           │DashboardModule│
     │           │ (Cross-domain)│
     │           └───────────────┘
     │
     │           ┌───────────────┐
     └──────────►│ AgentsModule  │
                 │ - Agent Keys  │
                 │ - API v1      │
                 └───────────────┘
```

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                           SYSTEM                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐      ┌─────────────────────┐                    │
│  │     Account     │      │   RefreshToken      │                    │
│  ├─────────────────┤      ├─────────────────────┤                    │
│  │ id (UUID, PK)   │◄────┤│ accountId (FK)      │                    │
│  │ name            │      │ token               │                    │
│  │ email           │      │ expiresAt           │                    │
│  │ password        │      └─────────────────────┘                    │
│  │ mfaSecret       │                                                 │
│  │ mfaEnabled      │      ┌─────────────────────┐                    │
│  └────────┬────────┘      │ SpotifyCredentials  │                    │
│           │               ├─────────────────────┤                    │
│           └──────────────►│ accountId (FK)      │                    │
│                           │ accessToken         │                    │
│                           │ refreshToken        │                    │
│                           │ spotifyUserId       │                    │
│                           └─────────────────────┘                    │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                           MUSIC                                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │
│  │   Artist    │    │    Album    │    │   Track     │               │
│  ├─────────────┤    ├─────────────┤    ├─────────────┤               │
│  │ id (PK)     │◄──┤│ artistId    │◄──┤│ albumId     │               │
│  │ name        │    │ name        │    │ name        │               │
│  │ spotifyId   │    │ spotifyId   │    │ spotifyId   │               │
│  │ imageUrl    │    │ imageUrl    │    │ durationMs  │               │
│  └─────────────┘    │ releaseDate │    │ trackNumber │               │
│                     └─────────────┘    └──────┬──────┘               │
│                                               │                       │
│                     ┌─────────────┐    ┌──────▼──────┐               │
│                     │  Playlist   │    │   Stream    │               │
│                     ├─────────────┤    ├─────────────┤               │
│                     │ name        │    │ trackId(FK) │               │
│                     │ spotifyId   │    │ accountId   │               │
│                     │ accountId   │    │ platform    │               │
│                     └─────────────┘    │ streamedAt  │               │
│                                        │ streamType  │               │
│                                        └─────────────┘               │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                           WORKOUT                                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐                                                │
│  │ WorkoutCategory  │                                                │
│  ├──────────────────┤    ┌──────────────────┐                        │
│  │ id (PK)          │◄──┤│ WorkoutExercise  │                        │
│  │ accountId        │    ├──────────────────┤                        │
│  │ name             │    │ id (PK)          │                        │
│  │ color            │    │ accountId        │                        │
│  └──────────────────┘    │ categoryId (FK)  │                        │
│                          │ name             │                        │
│                          │ muscleGroup      │                        │
│  ┌──────────────────┐    └────────┬─────────┘                        │
│  │ WorkoutSession   │             │                                  │
│  ├──────────────────┤             │                                  │
│  │ id (PK)          │    ┌────────▼─────────┐                        │
│  │ accountId        │    │   WorkoutSet     │                        │
│  │ startAt          │    ├──────────────────┤                        │
│  │ endAt            │◄──┤│ sessionId (FK)   │                        │
│  │ date             │    │ exerciseId (FK)  │                        │
│  │ title            │    │ reps             │                        │
│  │ notes            │    │ weight           │                        │
│  └──────────────────┘    │ distance         │                        │
│                          │ duration         │                        │
│                          │ performedAt      │                        │
│  ┌──────────────────┐    └──────────────────┘                        │
│  │ BodyWeightEntry  │                                                │
│  ├──────────────────┤    ┌──────────────────┐                        │
│  │ accountId        │    │     Routine      │                        │
│  │ date             │    ├──────────────────┤                        │
│  │ weight           │    │ accountId        │◄──┐                    │
│  └──────────────────┘    │ name             │   │                    │
│                          └──────────────────┘   │                    │
│                                                 │                    │
│                          ┌──────────────────┐   │                    │
│                          │ RoutineExercise  │   │                    │
│                          ├──────────────────┤   │                    │
│                          │ routineId (FK)   │───┘                    │
│                          │ exerciseId (FK)  │                        │
│                          │ order            │                        │
│                          └──────────────────┘                        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                           HABITS                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐    ┌──────────────────┐                        │
│  │      Habit       │    │   HabitEntry     │                        │
│  ├──────────────────┤    ├──────────────────┤                        │
│  │ id (PK)          │◄──┤│ habitId (FK)     │                        │
│  │ accountId        │    │ accountId        │                        │
│  │ name             │    │ date             │                        │
│  │ description      │    │ status           │                        │
│  │ emoji            │    │ comment          │                        │
│  │ isActive         │    └──────────────────┘                        │
│  │ color            │                                                │
│  └──────────────────┘                                                │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Entity: AbstractAccountOwnedEntity

All user-owned data extends this base class for automatic account segregation:

```typescript
export class AbstractAccountOwnedEntity extends AbstractEntity {
  @ManyToOne(() => Account, {
    nullable: false,
    onUpdate: 'RESTRICT',
    onDelete: 'CASCADE',
    eager: true,
  })
  account: Account;

  @Column({ nullable: false })
  accountId: string;
}
```

This ensures:
- All queries are automatically filtered by `accountId`
- Cascade delete when account is removed
- Data isolation between users

---

## Frontend Architecture

### Component Structure

```
frontend/src/
├── main.jsx                   # Entry point
├── App.jsx                    # Root component + routing
├── api.js                     # API client
├── auth.js                    # Auth utilities
├── config.js                  # Configuration
│
├── components/
│   ├── Layout.jsx             # Main layout with navigation
│   ├── AuthGuard.jsx          # Protected route wrapper
│   └── ...
│
├── contexts/
│   └── ThemeContext.jsx       # Theme provider (dark/light)
│
├── pages/
│   ├── Landing.jsx            # Public landing page
│   ├── Home.jsx               # Dashboard home
│   ├── Profile.jsx            # User profile + settings
│   ├── Auth/
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── Spotify/
│   │   ├── SpotifyPersonal.jsx
│   │   └── SpotifyGlobal.jsx
│   └── Workout/
│       ├── Workout.jsx        # Workout overview
│       ├── WorkoutActive.jsx  # Active session
│       ├── WorkoutHistory.jsx # Session history
│       ├── WorkoutExercises.jsx
│       ├── WorkoutBodyweight.jsx
│       └── WorkoutImport.jsx
│
└── styles.css                 # Global styles
```

### Cache-first client contract

The web client and Capacitor app share the same account-scoped local data
layer:

- `apiCache.mjs` persists the most recently usable GET responses and serves
  them synchronously before stale-while-revalidate network work begins.
- `apiPreload.mjs` maps routes to their first-screen requests. `Layout`
  preloads the current route, likely pointer/touch navigation targets, and
  enabled modules during idle time.
- `apiMutationQueue.mjs` persists ordinary record writes per account. UI state
  and matching cached queries update optimistically; the queue commits in
  order, retries transient failures, and exposes permanent validation failures
  for explicit retry.
- Login, MFA, imports, provider synchronization, and catalog rebuild commands
  remain server-confirmed operations because they cannot be represented as a
  safe local record mutation.
- The native shell flushes queued writes on startup, focus, visibility resume,
  and network reconnection. Signing out clears both cached reads and queued
  writes so one account can never inherit another account's local state.

This contract makes repeat navigation and ordinary edits independent of the
hosted API's wake-up latency. A newly authenticated account with no local
snapshot still requires one successful network response before its private
data can be shown.

### Routing Structure

```
/                    → Landing (public)
/login               → Login (public)
/register            → Register (public)

/home                → Dashboard (protected)
/profile             → Profile & Settings (protected)

/spotify             → Spotify Personal (protected)
/spotify/personal    → Spotify Personal (protected)
/spotify/global      → Spotify Global Stats (protected)

/workout             → Workout Overview (protected)
/workout/active      → Active Session (protected)
/workout/history     → Session History (protected)
/workout/exercises   → Exercise Library (protected)
/workout/bodyweight  → Bodyweight Tracking (protected)
/workout/import      → FitNotes Import (protected)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Page       │───►│   api.js     │───►│   Backend    │       │
│  │  Component   │    │  (fetch)     │    │   API        │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                                       │                │
│         │ props                                 │ JSON           │
│         ▼                                       ▼                │
│  ┌──────────────┐                        ┌──────────────┐       │
│  │   Child      │                        │   State      │       │
│  │  Components  │◄───────────────────────│   Update     │       │
│  └──────────────┘                        └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

### JWT Token Flow

```
┌──────────┐     1. Login Request      ┌──────────┐
│  Client  │ ────────────────────────► │  Backend │
│          │   {email, password}       │          │
│          │                           │          │
│          │ ◄──────────────────────── │          │
│          │  {accessToken,            │          │
│          │   refreshToken}           │          │
└──────────┘                           └──────────┘
     │                                      │
     │  2. API Request                      │
     │  Authorization: Bearer <token>       │
     │ ────────────────────────────────────►│
     │                                      │
     │  3. Token expires (1h)               │
     │ ◄────────────────────────────────────│
     │     401 Unauthorized                 │
     │                                      │
     │  4. Refresh Token                    │
     │  POST /auth/refresh                  │
     │  {refreshToken}                      │
     │ ────────────────────────────────────►│
     │                                      │
     │  5. New Tokens                       │
     │  {accessToken, refreshToken}         │
     │ ◄────────────────────────────────────│
```

### MFA Flow (Optional)

```
1. POST /auth/access {email, password}
   → {mfaRequired: true, tempToken: "..."}

2. POST /auth/access {email, password, mfaCode: "123456"}
   → {accessToken, refreshToken}
```

---

## Spotify Integration

### OAuth Flow

```
┌──────────┐     1. Get Auth URL      ┌──────────┐
│ Frontend │ ─────────────────────────► │ Backend  │
│          │  GET /auth/spotify/link   │          │
│          │ ◄───────────────────────── │          │
│          │  {url: spotify_oauth_url}  │          │
└──────────┘                           └──────────┘
     │
     │ 2. Redirect user to Spotify
     ▼
┌───────────────────┐
│     Spotify       │
│   Authorization   │
│      Page         │
└───────────────────┘
     │
     │ 3. Callback with code
     ▼
┌──────────┐     4. Exchange code      ┌──────────┐
│ Frontend │ ─────────────────────────► │ Backend  │
│          │  POST /auth/spotify/      │          │
│          │    callback/:accountId    │          │
│          │  {code}                   │          │
│          │ ◄───────────────────────── │          │
│          │  {message: "linked"}      │          │
└──────────┘                           └──────────┘
```

---

## Airflow Integration

Apache Airflow is used for scheduled data ingestion and background jobs:

```
┌─────────────────────────────────────────────────────────────────┐
│                        AIRFLOW                                   │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │   Webserver      │    │    Scheduler     │                   │
│  │   Port: 8080     │    │   (Celery)       │                   │
│  └──────────────────┘    └────────┬─────────┘                   │
│                                   │                              │
│                          ┌────────▼─────────┐                   │
│                          │     Worker       │                   │
│                          │    (Celery)      │                   │
│                          └────────┬─────────┘                   │
│                                   │                              │
│  DAGs:                            │                              │
│  - spotify_sync: Sync listening history                         │
│  - data_cleanup: Periodic cleanup                               │
│  - analytics_refresh: Refresh materialized views                │
│                                   │                              │
└───────────────────────────────────┼─────────────────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │    PostgreSQL    │
                          │    (shared)      │
                          └──────────────────┘
```

---

## Security Considerations

### Data Isolation
- All entities extend `AbstractAccountOwnedEntity`
- TypeORM subscriber automatically filters by `accountId`
- Request context middleware injects current account

### Authentication
- JWT tokens with 1-hour expiry
- Refresh tokens with longer expiry
- MFA support via TOTP (Google Authenticator compatible)

### API Security
- CORS configuration
- Rate limiting (planned)
- Input validation via class-validator
- Swagger documentation for all endpoints

---

## Deployment Architecture

### Production Stack

```
                     ┌─────────────────┐
                     │   Load Balancer │
                     │    (Optional)   │
                     └────────┬────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
       │   Nginx     │ │   Nginx     │ │   Backend   │
       │  (Frontend) │ │  (Backend)  │ │  (Direct)   │
       │   :80       │ │   :3000     │ │   :3000     │
       └─────────────┘ └─────────────┘ └─────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
       │ PostgreSQL  │ │    Redis    │ │   Airflow   │
       │   :5432     │ │   :6379     │ │   :8080     │
       └─────────────┘ └─────────────┘ └─────────────┘
```

### Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| postgres | postgres:16 | 5432 | Primary database |
| redis | redis:7 | 6379 | Cache, Celery broker |
| backend | custom | 3000 | NestJS API |
| frontend | custom | 80 | React SPA (Nginx) |
| airflow-webserver | apache/airflow:2.6.3 | 8080 | Airflow UI |
| airflow-scheduler | apache/airflow:2.6.3 | - | DAG scheduler |
| airflow-worker | apache/airflow:2.6.3 | - | Task executor |

---

## Agent API Module

The Agent API provides authenticated access for AI assistants and external integrations:

```
backend/src/
├── agents/                    # Agent authentication
│   ├── agents.module.ts
│   ├── agent-keys.controller.ts
│   ├── agent-keys.service.ts
│   ├── entities/
│   │   └── agent-key.entity.ts
│   ├── guards/
│   │   └── agent-key.guard.ts
│   ├── decorators/
│   │   └── require-scope.decorator.ts
│   ├── constants/
│   │   └── scopes.ts
│   └── dto/
│       └── create-agent-key.dto.ts
│
└── api/                       # Versioned API for agents
    └── v1/
        ├── workout.controller.ts
        ├── habits.controller.ts
        └── finance.controller.ts
```

### Agent Key Authentication

```
┌──────────────┐     API Request          ┌──────────────┐
│  AI Agent    │ ────────────────────────► │   Backend    │
│  (OpenClaw)  │   X-Agent-Key: sk_...     │              │
│              │ ◄──────────────────────── │              │
│              │       JSON Response       │              │
└──────────────┘                           └──────────────┘
```

Agent keys support scoped permissions:
- `workout:read` / `workout:write`
- `habits:read` / `habits:write`
- `finance:read` / `finance:write`
- `music:read`

---

## Finance Module

The finance module tracks transactions across multiple wallets:

```
backend/src/finance/
├── finance.module.ts
├── entities/
│   ├── wallet.entity.ts
│   ├── finance-category.entity.ts
│   └── transaction.entity.ts
├── wallets/
│   ├── wallets.controller.ts
│   └── wallets.service.ts
├── categories/
│   ├── categories.controller.ts
│   └── categories.service.ts
├── transactions/
│   ├── transactions.controller.ts
│   └── transactions.service.ts
└── import/
    └── cashew-import.service.ts
```

### Finance Entity Relationships

```
┌──────────────────────────────────────────────────────────────────────┐
│                           FINANCE                                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐    ┌──────────────────┐                        │
│  │     Wallet       │    │ FinanceCategory  │                        │
│  ├──────────────────┤    ├──────────────────┤                        │
│  │ id (PK)          │    │ id (PK)          │                        │
│  │ accountId        │    │ accountId        │                        │
│  │ name             │    │ name             │                        │
│  │ currency         │    │ type (income/    │                        │
│  │ initialBalance   │    │       expense)   │                        │
│  │ color            │    │ color            │                        │
│  │ icon             │    │ icon             │                        │
│  └────────┬─────────┘    └────────┬─────────┘                        │
│           │                       │                                   │
│           └───────────┬───────────┘                                   │
│                       ▼                                               │
│            ┌──────────────────┐                                       │
│            │   Transaction    │                                       │
│            ├──────────────────┤                                       │
│            │ id (PK)          │                                       │
│            │ accountId        │                                       │
│            │ walletId (FK)    │                                       │
│            │ categoryId (FK)  │                                       │
│            │ amount           │                                       │
│            │ date             │                                       │
│            │ description      │                                       │
│            │ notes            │                                       │
│            └──────────────────┘                                       │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```
