# 📡 API Reference

This document provides a complete reference for the Personal Server REST API.

**Base URL:** `http://localhost:3000`  
**Swagger UI:** `http://localhost:3000/api`

---

## Table of Contents

- [Authentication](#authentication)
- [Accounts](#accounts)
- [Music / Streams](#music--streams)
- [Workout](#workout)
- [Habits](#habits)
- [Dashboard](#dashboard)
- [Health](#health)

---

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Register

Create a new user account.

```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** `201 Created`
```json
{
  "message": "Account created successfully",
  "accountId": "uuid-here"
}
```

---

### Login

Authenticate and receive tokens.

```http
POST /auth/access
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "rememberMe": true,
  "mfaCode": "123456"  // Optional, only if MFA enabled
}
```

**Response (Success):** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (MFA Required):** `200 OK`
```json
{
  "mfaRequired": true,
  "tempToken": "temp-token-here"
}
```

---

### Refresh Token

Get new tokens using a refresh token.

```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token"
}
```

---

### MFA Setup

Generate MFA secret and QR code.

```http
POST /auth/mfa/setup
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,..."
}
```

---

### Enable MFA

Enable MFA after verifying setup code.

```http
POST /auth/mfa/enable
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "MFA enabled successfully"
}
```

---

### Disable MFA

Disable MFA for the account.

```http
POST /auth/mfa/disable
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "MFA disabled successfully"
}
```

---

### MFA Status

Check if MFA is enabled.

```http
GET /auth/mfa/status
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "enabled": true
}
```

---

### Spotify Link

Get Spotify OAuth authorization URL.

```http
GET /auth/spotify/link
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "url": "https://accounts.spotify.com/authorize?..."
}
```

---

### Spotify Callback

Complete Spotify OAuth linking.

```http
POST /auth/spotify/callback/:accountId
```

**Request Body:**
```json
{
  "code": "spotify-auth-code"
}
```

**Response:** `200 OK`
```json
{
  "message": "Spotify account linked successfully"
}
```

---

## Accounts

### Get Current Account

```http
GET /accounts/me
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "john.doe",
  "email": "user@example.com",
  "mfaEnabled": false,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

## Music / Streams

### Get Stream Statistics

```http
GET /streams/stats
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `timeframe` | string | `today`, `7d`, `30d`, `90d`, `1y`, `all` |
| `from` | string | ISO date override start |
| `to` | string | ISO date override end |

**Response:** `200 OK`
```json
{
  "totalStreams": 1523,
  "uniqueTracks": 342,
  "uniqueArtists": 128,
  "totalMinutes": 5234,
  "topTrack": {
    "id": "track-id",
    "name": "Song Name",
    "count": 45
  }
}
```

---

### Get Streams Per Day

```http
GET /streams/per-day
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `timeframe` | string | `today`, `7d`, `30d`, `90d`, `1y`, `all` |
| `from` | string | ISO date override start |
| `to` | string | ISO date override end |

**Response:** `200 OK`
```json
[
  { "date": "2024-01-15", "count": 34 },
  { "date": "2024-01-16", "count": 28 }
]
```

---

### Get Streams Per Hour

```http
GET /streams/per-hour
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  { "hour": 0, "count": 12 },
  { "hour": 1, "count": 5 },
  ...
  { "hour": 23, "count": 18 }
]
```

---

### Get Top Tracks

```http
GET /streams/top
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | `spotify`, `appleMusic`, etc. |
| `limit` | number | No | Max results (default: 50) |
| `timeframe` | string | No | Time filter |

**Response:** `200 OK`
```json
[
  {
    "track": {
      "id": "track-id",
      "name": "Track Name",
      "artist": "Artist Name",
      "album": "Album Name",
      "imageUrl": "https://..."
    },
    "count": 45,
    "totalMinutes": 156
  }
]
```

---

### Get Stream History

```http
GET /streams/history
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (1-based) |
| `pageSize` | number | Items per page (default: 10) |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "stream-id",
      "streamedAt": "2024-01-15T14:30:00Z",
      "platform": "spotify",
      "track": {
        "name": "Track Name",
        "artist": "Artist Name"
      }
    }
  ],
  "total": 1523,
  "page": 1,
  "pageSize": 10
}
```

---

### Ingest Stream

Record a new stream.

```http
POST /streams/ingest
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "trackId": "track-uuid",
  "platform": "spotify",
  "streamedAt": "2024-01-15T14:30:00Z",
  "streamType": "play",
  "context": {
    "playlistId": "playlist-id",
    "playlistName": "My Playlist"
  }
}
```

---

### Global Endpoints (No Auth Required)

```http
GET /streams/global-stats
GET /streams/global-top
GET /streams/global-history
GET /streams/global-per-day
GET /streams/global-per-hour
```

These endpoints return aggregated data across all users.

---

## Workout

### Sessions

#### List Sessions

```http
GET /workout/sessions
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |

**Response:** `200 OK`
```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "startAt": "2024-01-15T10:00:00Z",
      "endAt": "2024-01-15T11:30:00Z",
      "date": "2024-01-15",
      "title": "Push Day",
      "notes": "Felt great today"
    }
  ],
  "totalWorkouts": 150,
  "totalSets": 2340,
  "totalReps": 28500,
  "totalVolume": 456000,
  "totalTimeSeconds": 324000
}
```

---

#### Get Active Session

```http
GET /workout/sessions/active
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "session-uuid",
  "startAt": "2024-01-15T10:00:00Z",
  "endAt": null,
  "date": "2024-01-15",
  "sets": [...]
}
```

---

#### Get Recent Sessions

```http
GET /workout/sessions/recent
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "session-uuid",
    "date": "2024-01-15",
    "title": "Push Day",
    "setCount": 24,
    "exercises": ["Bench Press", "Shoulder Press", "Tricep Dips"]
  }
]
```

---

#### Start Session

```http
POST /workout/sessions/start
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "date": "2024-01-15",
  "title": "Push Day",
  "notes": "Focus on chest",
  "startAt": "2024-01-15T10:00:00Z"
}
```

**Response:** `201 Created`
```json
{
  "id": "new-session-uuid",
  "startAt": "2024-01-15T10:00:00Z",
  "date": "2024-01-15",
  "title": "Push Day"
}
```

---

#### End Session

```http
PATCH /workout/sessions/:id/end
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "endAt": "2024-01-15T11:30:00Z",
  "notes": "Great workout!",
  "title": "Push Day - PR on Bench"
}
```

---

#### Delete Session

```http
DELETE /workout/sessions/:id
Authorization: Bearer <token>
```

---

### Exercises

#### List Exercises

```http
GET /workout/exercises
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "exercise-uuid",
    "name": "Bench Press",
    "muscleGroup": "Chest",
    "category": {
      "id": "category-uuid",
      "name": "Push"
    },
    "notes": "Keep elbows at 45 degrees"
  }
]
```

---

#### Create Exercise

```http
POST /workout/exercises
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Bench Press",
  "muscleGroup": "Chest",
  "categoryId": "category-uuid",
  "notes": "Keep elbows at 45 degrees"
}
```

---

### Sets

#### List Sets

```http
GET /workout/sets
Authorization: Bearer <token>
```

---

#### Create Set

```http
POST /workout/sets
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "sessionId": "session-uuid",
  "exerciseId": "exercise-uuid",
  "reps": 10,
  "weight": 80,
  "performedAt": "2024-01-15T10:15:00Z"
}
```

---

### Categories

```http
GET    /workout/categories
POST   /workout/categories
PATCH  /workout/categories/:id
DELETE /workout/categories/:id
```

---

### Bodyweight

#### List Bodyweight Entries

```http
GET /workout/bodyweight
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "entry-uuid",
    "date": "2024-01-15",
    "weight": 75.5
  }
]
```

---

#### Add Bodyweight Entry

```http
POST /workout/bodyweight
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "date": "2024-01-15",
  "weight": 75.5
}
```

---

### Routines

```http
GET    /workout/routines
POST   /workout/routines
PATCH  /workout/routines/:id
DELETE /workout/routines/:id

GET    /workout/routine-exercises
POST   /workout/routine-exercises
DELETE /workout/routine-exercises/:id
```

---

### Import

#### Import FitNotes

```http
POST /workout/import/fitnotes
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: FitNotes SQLite backup file (`.fitnotes`)

**Response:** `200 OK`
```json
{
  "status": "ok",
  "imported": {
    "categories": 5,
    "exercises": 45,
    "sessions": 120,
    "sets": 3400,
    "bodyweight": 90
  }
}
```

---

## Habits

### List Habits

```http
GET /habits
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "habit-uuid",
    "name": "🏋️ Gym",
    "description": "Go to the gym",
    "emoji": "🏋️",
    "isActive": true,
    "color": "#4CAF50"
  }
]
```

---

### Get Habit Summary

Get all habits with streaks and success rates.

```http
GET /habits/summary
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "habit": {
      "id": "habit-uuid",
      "name": "🏋️ Gym"
    },
    "currentStreak": 15,
    "longestStreak": 42,
    "successRate": 0.85,
    "totalSuccess": 180,
    "totalEntries": 212
  }
]
```

---

### Get Habit Calendar

Get calendar view for all habits in a month.

```http
GET /habits/calendar/:month
Authorization: Bearer <token>
```

**Path Parameters:**
- `month`: Month in `YYYY-MM` format

**Response:** `200 OK`
```json
{
  "month": "2024-01",
  "habits": [
    {
      "id": "habit-uuid",
      "name": "🏋️ Gym",
      "entries": [
        { "date": "2024-01-01", "status": "success" },
        { "date": "2024-01-02", "status": "fail" }
      ]
    }
  ]
}
```

---

### Get Habit Streak

```http
GET /habits/:id/streak
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "currentStreak": 15,
  "longestStreak": 42,
  "lastSuccessDate": "2024-01-15"
}
```

---

### Get Habit Stats

```http
GET /habits/:id/stats
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | `week`, `month`, `year` |

**Response:** `200 OK`
```json
{
  "successRate": 0.85,
  "totalSuccess": 25,
  "totalFail": 4,
  "totalSkip": 2,
  "totalEntries": 31
}
```

---

### Create Habit

```http
POST /habits
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "🏋️ Gym",
  "description": "Go to the gym at least 3x per week",
  "emoji": "🏋️",
  "isActive": true,
  "color": "#4CAF50"
}
```

---

### Update Habit

```http
PATCH /habits/:id
Authorization: Bearer <token>
```

---

### Delete Habit

```http
DELETE /habits/:id
Authorization: Bearer <token>
```

---

### Habit Entries

#### List Entries

```http
GET /habits/entries
Authorization: Bearer <token>
```

---

#### Create Entry

```http
POST /habits/entries
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "habitId": "habit-uuid",
  "date": "2024-01-15",
  "status": "success",
  "comment": "Great session!"
}
```

**Status values:** `success`, `fail`, `skip`

---

### Import HabitShare

```http
POST /habits/import/habitshare
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: HabitShare CSV export file

**Response:** `200 OK`
```json
{
  "status": "ok",
  "imported": {
    "habits": 8,
    "entries": 5130
  }
}
```

---

## Dashboard

### Spotify Streams During Workouts

Get Spotify listening data correlated with workout sessions.

```http
GET /dashboard/streams/workout
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `timeframe` | string | `today`, `7d`, `30d`, `1y`, `all` |
| `from` | string | ISO start datetime |
| `to` | string | ISO end datetime |

**Response:** `200 OK`
```json
{
  "workoutsWithMusic": 45,
  "totalWorkouts": 60,
  "topWorkoutTracks": [
    {
      "track": { "name": "Eye of the Tiger", "artist": "Survivor" },
      "workoutCount": 12
    }
  ],
  "averageTracksPerWorkout": 15
}
```

---

## Health

### Health Check

```http
GET /health
```

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00Z",
  "uptime": 86400
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

### Common Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Missing or invalid token |
| `403` | Forbidden - Valid token but insufficient permissions |
| `404` | Not Found - Resource doesn't exist |
| `500` | Internal Server Error |

---

## Rate Limiting

Currently not enforced. Planned for future releases.

---

## Pagination

Endpoints that return lists support pagination:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-based) |
| `limit` / `pageSize` | number | 10-20 | Items per page |

Response includes:
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "pageSize": 20
}
```

---

## Timeframe Parameters

Many analytics endpoints accept timeframe filters:

| Value | Description |
|-------|-------------|
| `today` | Current day |
| `7d` | Last 7 days |
| `30d` | Last 30 days |
| `90d` | Last 90 days |
| `1y` | Last 365 days |
| `all` | All time |

Alternatively, use `from` and `to` with ISO date strings for custom ranges.
