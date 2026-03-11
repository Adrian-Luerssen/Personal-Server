# Habits Enhancement Design Spec

## Goal

Enhance the habits system with custom Lucide icons, flexible tracking types (boolean and numeric with thresholds), configurable frequency goals (daily/weekly/monthly/yearly), a reworked calendar that shows per-habit status with period-scoped sidebars, and a day-detail modal for editing any date.

## Architecture

The existing habit entity gains new columns for tracking configuration. The entry entity gains a numeric value column. The calendar API returns enriched data including habit metadata so the frontend can render icons and colors per entry. The frontend calendar is restructured into a grid with weekly sidebar and monthly header for non-daily goal progress.

## Tech Stack

- Backend: NestJS 9, TypeORM, PostgreSQL (Aiven)
- Frontend: React 18, Lucide icons (via existing Icon component)
- Existing patterns: entity prefix `app_`, cache-manager reset on mutations

---

## 1. Data Model Changes

### Habit Entity (`app_habit`) — New Columns

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `iconName` | `varchar(50)` | `'circle-check'` | Lucide icon name (replaces emoji) |
| `trackingType` | `varchar(10)` | `'boolean'` | `'boolean'` or `'numeric'` |
| `frequencyType` | `varchar(10)` | `'daily'` | `'daily'`, `'weekly'`, `'monthly'`, `'yearly'` |
| `frequencyTarget` | `integer` | `1` | How many times per period (e.g. 3 for "3x/week") |
| `numericPassThreshold` | `decimal(10,2)` | `null` | Pass if value <= this (numeric only) |
| `numericSkipThreshold` | `decimal(10,2)` | `null` | Skip if value <= this but > passThreshold (numeric only) |
| `numericUnit` | `varchar(30)` | `null` | Label for the value (e.g. "cigarettes", "drinks") |

**Numeric tracking is designed for "reduction" habits** — tracking things you want to minimize (cigarettes, drinks, etc.). The threshold logic is always "lower is better":

- `value <= numericPassThreshold` → status = `success`
- `value <= numericSkipThreshold` → status = `skip`
- `value > numericSkipThreshold` → status = `fail`

**Validation rules:**
- `numericPassThreshold` must be set when `trackingType = 'numeric'`
- `numericSkipThreshold` must be >= `numericPassThreshold` (if set)
- If `numericSkipThreshold` is null, any value > `numericPassThreshold` → `fail`
- `frequencyTarget` must be >= 1
- `numericUnit` is optional but recommended for clarity

**Example — No Smoking:**
- `numericPassThreshold = 0`, `numericSkipThreshold = 1`, `numericUnit = "cigarettes"`
- 0 cigarettes → pass, 1 cigarette → skip, 2+ → fail

**Example — No Alcohol:**
- `numericPassThreshold = 0`, `numericSkipThreshold = 2`, `numericUnit = "drinks"`
- 0 drinks → pass, 1-2 drinks → skip, 3+ → fail

### HabitEntry Entity (`app_habit_entry`) — New Column

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `numericValue` | `decimal(10,2)` | `null` | Raw numeric value entered by user |

### Configuration Change Behavior

- **Frequency change** (e.g. daily → weekly): Existing entries are raw data and remain unchanged. Streaks and progress are recalculated dynamically based on the current frequency setting. No data migration needed.
- **Tracking type change** (boolean → numeric): Existing entries keep their `status` as-is. `numericValue` remains null for old entries. The modal shows the numeric input going forward.
- **Tracking type change** (numeric → boolean): Existing entries keep their `status`. The `numericValue` is retained in the database but hidden in the UI. The modal shows boolean buttons going forward.

### Completion Definition

Only entries with `status = 'success'` count toward frequency progress (`completed` count). Skip and fail entries do not count.

### Migration Notes

- The `emoji` column remains for backward compatibility but is no longer used by the frontend
- All new columns have defaults so existing data continues to work
- No data migration needed — existing habits default to `boolean` + `daily`
- The HabitShare import service continues to work unchanged (sets emoji, new habits default to boolean/daily)

---

## 2. Backend API Changes

### Habit CRUD — Updated Fields

`POST /habits` and `PATCH /habits/:id` accept the new fields:

```typescript
{
  name: string;
  iconName?: string;        // Lucide icon name
  color?: string;           // Hex color
  trackingType?: 'boolean' | 'numeric';
  frequencyType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  frequencyTarget?: number;
  numericPassThreshold?: number;
  numericSkipThreshold?: number;
  numericUnit?: string;
  isActive?: boolean;
  description?: string;
}
```

### Entry CRUD — Updated Fields

`POST /habits/:habitId/entries` and `PATCH /habits/:habitId/entries/:date` accept:

```typescript
{
  date: string;        // YYYY-MM-DD
  status: 'success' | 'fail' | 'skip';
  numericValue?: number;
  comment?: string;
}
```

For numeric habits, if `numericValue` is provided and `status` is not explicitly set, the backend auto-evaluates status from thresholds.

`DELETE /habits/:habitId/entries/:date` removes an entry entirely (un-tracks a day). Already implemented.

### Calendar Endpoint — Enhanced Response

`GET /habits/calendar/:month` currently returns:

```typescript
{ habitId, habitName, date, status, comment }[]
```

Enhanced to return habits metadata separately from entries to avoid repetition:

```typescript
{
  habits: {
    [habitId: string]: {
      name: string;
      iconName: string;
      color: string;
      frequencyType: string;
      trackingType: string;
    };
  };
  entries: {
    habitId: string;
    date: string;
    status: 'success' | 'fail' | 'skip';
    numericValue: number | null;
    comment: string | null;
  }[];
}
```

### Frequency Progress Endpoint — New

`GET /habits/progress?month=YYYY-MM`

Returns progress for non-daily habits within their respective periods. Weeks use ISO week numbers and are keyed by the Monday date of each week (e.g. `"2026-03-09"`):

```typescript
{
  weekly: {
    [weekStartDate: string]: {
      habitId: string;
      habitName: string;
      habitIconName: string;
      habitColor: string;
      target: number;
      completed: number;
      passed: boolean;  // only set for completed weeks
    }[];
  };
  monthly: {
    habitId: string;
    habitName: string;
    habitIconName: string;
    habitColor: string;
    target: number;
    completed: number;
    passed: boolean;
  }[];
  yearly: {
    habitId: string;
    habitName: string;
    habitIconName: string;
    habitColor: string;
    target: number;
    completed: number;
  }[];
}
```

### Summary Endpoint — Updated

`GET /habits/summary` includes frequency info in each item:

```typescript
{
  habitId: string;
  habitName: string;
  habitIconName: string;
  habitColor: string;
  frequencyType: string;
  frequencyTarget: number;
  trackingType: string;
  numericUnit: string | null;
  currentStreak: number;
  longestStreak: number;
  successRate: number;
  lastSuccess: string | null;
}
```

### Streak Calculation — Frequency-Aware

- **Daily habits**: Streak logic unchanged (consecutive days)
- **Weekly habits**: Streak counts consecutive weeks where `completed >= target`
- **Monthly habits**: Streak counts consecutive months where `completed >= target`
- **Yearly habits**: No streak (just progress tracking)

---

## 3. Frontend — Calendar Rework

### Calendar Grid Layout

```
[Monthly goals banner — full width]

      SUN  MON  TUE  WED  THU  FRI  SAT  | WEEKLY
W9    [1]  [2]  [3]  [4]  [5]  [6]  [7]  | Exercise 3/3 ✓
                                           | Socialize 1/2
W10   [8]  [9]  [10] [11] [12] [13] [14] | Exercise 1/3
                                           | Socialize 0/2
...
```

**CSS Grid**: `grid-template-columns: auto repeat(7, 1fr) minmax(120px, auto)`

**Mobile**: On screens < 640px, the weekly sidebar moves below each week row (stacks vertically). The monthly banner wraps naturally.

### Day Cells

Each day cell contains:
- Day number
- Small icon tiles for each **daily** habit, colored by status:
  - Green background → pass
  - Yellow background → skip
  - Red background → fail
  - Grey background → not tracked
- Small dots for non-daily habits that were logged on that day
- Today highlighted with accent border
- Future days dimmed
- Click opens day detail modal

### Weekly Sidebar

Right column showing each weekly habit's progress for that week:
- Icon + name + "X/Y" counter
- Green text + checkmark when target met
- Yellow text when in progress
- Red text when period ended and target not met

### Monthly Banner

Full-width bar above the calendar grid:
- Shows each monthly habit with icon + name + "X/Y" counter
- Same color coding as weekly sidebar

### Yearly Goals

Shown in a separate section below the calendar (simple list with progress bars), since they span the entire year and don't map to the calendar grid naturally.

---

## 4. Frontend — Day Detail Modal

Opened by clicking any calendar day. Shows all active habits for that date.

### Layout

```
┌─────────────────────────────────────┐
│  📅 Tuesday, March 11, 2026        │
│─────────────────────────────────────│
│                                     │
│  [icon] Meditate          [✓][~][✗] │
│          Daily                      │
│                                     │
│  [icon] No Smoking    [__0__] PASS  │
│          Daily · cigarettes         │
│                                     │
│  [icon] Exercise          [✓][~][✗] │
│          3x/week · 2/3 this week    │
│                                     │
│                          [Close]    │
└─────────────────────────────────────┘
```

### Behavior

- **Boolean habits**: Three toggle buttons (Pass / Skip / Fail). Click active one to un-track.
- **Numeric habits**: Number input field. Status auto-evaluates and displays as a badge. User can override status manually.
- **Non-daily habits**: Show period progress below the name (e.g. "2/3 this week").
- **Past dates**: Fully editable (same UI as today).
- **Future dates**: Can pre-fill entries but shown with muted styling.
- Changes save immediately (no "Save" button needed). Optimistic UI with rollback on error.

---

## 5. Frontend — Habit Settings Form

### Updated Form Fields

The habit create/edit form in HabitsSettings adds:

- **Icon**: IconPicker component (reuse from finance, Lucide icons)
- **Color**: Color picker (existing)
- **Tracking Type**: Toggle — "Yes/No" | "Numeric Target"
- **Frequency**: Dropdown — "Every day" | "X times per week" | "X times per month" | "X times per year"
- **Frequency Target**: Number input (hidden for "Every day", shown for others)
- **Numeric Thresholds** (shown only when tracking type = numeric):
  - Pass threshold with unit label
  - Skip threshold with unit label
  - Unit name (e.g. "cigarettes")
  - Live preview: "0 → Pass, 1 → Skip, 2+ → Fail"

---

## 6. Migration Strategy

### Database Migration

Single migration file adding all new columns with defaults:
- `iconName varchar(50) DEFAULT 'circle-check'`
- `trackingType varchar(10) DEFAULT 'boolean'`
- `frequencyType varchar(10) DEFAULT 'daily'`
- `frequencyTarget integer DEFAULT 1`
- `numericPassThreshold decimal(10,2) DEFAULT NULL`
- `numericSkipThreshold decimal(10,2) DEFAULT NULL`
- `numericUnit varchar(30) DEFAULT NULL`
- `numericValue decimal(10,2) DEFAULT NULL` (on entry table)

### Backward Compatibility

- Existing habits continue to work as boolean/daily
- Existing entries with null `numericValue` are unaffected
- The `emoji` column is kept but ignored by frontend
- Summary/calendar endpoints return new fields with safe defaults

---

## 7. Component Structure

### New Components

- `HabitDayModal` — Modal showing all habits for a selected date with editing
- `HabitCalendarGrid` — The reworked calendar with weekly/monthly sidebars
- `NumericHabitInput` — Number input with live threshold evaluation badge
- `FrequencyBadge` — Small badge showing "Daily", "3x/week", etc.

### Modified Components

- `Habits.jsx` — Replace current calendar with `HabitCalendarGrid`, add day modal
- `HabitsSettings.jsx` — Add new fields to habit form (icon picker, tracking type, frequency, thresholds)

### Reused Components

- `IconPicker` (from finance) — For Lucide icon selection
- `Modal` (from shared) — For day detail modal
