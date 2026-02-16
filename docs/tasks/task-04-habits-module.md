# Task: Habits Module Implementation

**Agent**: Development Agent 4
**Priority**: MEDIUM
**Estimated Effort**: 5h

## Objective
Create a habits module to import and manage HabitShare data with streak calculations.

## Repository
- **Path**: `/home/clawdia/.openclaw/workspace/Personal-Server`
- **Backend**: `backend/src/`

## Data Source
- **File**: `/home/clawdia/.openclaw/media/references/HabitShareData.csv`
- **Format**: CSV

### Schema
```csv
Habit,Date,Status,Comment
🍇,2024-01-15,success,
gym,2024-01-15,success,Morning session
No Alcohol,2024-01-15,fail,Party night
```

**Status values**: `success`, `fail`, `skip`

### Tracked Habits
- 🍇 (grapes emoji)
- 🍍 (pineapple emoji)
- gym
- Medicine
- No 🔞 (no adult content)
- No Alcohol
- No Smoking
- Wake Up Early (< 8:00 am)

## Tasks

### 1. Entities + Migrations (1h)

```typescript
// src/habits/entities/habit.entity.ts
@Entity('habits')
export class Habit extends AbstractAccountOwnedEntity {
  @Column() name: string;
  @Column({ nullable: true }) description: string;
  @Column({ nullable: true }) emoji: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ nullable: true }) color: string;
}

// src/habits/entities/habit-entry.entity.ts
@Entity('habit_entries')
@Index(['habitId', 'date'], { unique: true })
export class HabitEntry extends AbstractAccountOwnedEntity {
  @ManyToOne(() => Habit, { onDelete: 'CASCADE' })
  habit: Habit;
  
  @Column() habitId: string;
  
  @Column({ type: 'date' }) date: string; // YYYY-MM-DD
  
  @Column({ 
    type: 'enum', 
    enum: ['success', 'fail', 'skip'],
    enumName: 'habit_status' 
  })
  status: 'success' | 'fail' | 'skip';
  
  @Column({ nullable: true }) comment: string;
}
```

### 2. Module Structure (30min)

```
src/habits/
├── habits.module.ts
├── entities/
│   ├── habit.entity.ts
│   └── habit-entry.entity.ts
├── habits/
│   ├── habits.controller.ts
│   └── habits.service.ts
├── entries/
│   ├── entries.controller.ts
│   └── entries.service.ts
└── import/
    ├── import.controller.ts
    └── habitshare-import.service.ts
```

### 3. HabitShare Import Service (1.5h)

```typescript
import { parse } from 'csv-parse/sync'; // or papaparse

@Injectable()
export class HabitShareImportService {
  async previewImport(account: Account, file: Express.Multer.File): Promise<HabitSharePreview> {
    const content = file.buffer.toString('utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true });
    
    // Group by habit name
    const habitNames = new Set(records.map(r => r.Habit));
    const existingHabits = await this.habitRepo.find({ 
      where: { accountId: account.id } 
    });
    
    return {
      totalRecords: records.length,
      habits: {
        total: habitNames.size,
        new: habitNames.size - existingHabits.length,
        existing: existingHabits.length,
      },
      dateRange: { ... },
    };
  }
  
  async executeImport(account: Account, file: Express.Multer.File): Promise<void> {
    // 1. Parse CSV
    // 2. Create habits (unique by name)
    // 3. Create entries (upsert by habit+date)
  }
}
```

### 4. Streak Calculation Service (1h)

```typescript
@Injectable()
export class HabitsService {
  async getStreak(habitId: string): Promise<{ current: number; longest: number; lastSuccess: string }> {
    // Get all entries ordered by date DESC
    const entries = await this.entryRepo.find({
      where: { habitId },
      order: { date: 'DESC' },
    });
    
    // Current streak: count consecutive successes from today backwards
    let currentStreak = 0;
    let today = new Date().toISOString().slice(0, 10);
    
    for (const entry of entries) {
      if (entry.status === 'success') {
        currentStreak++;
      } else if (entry.status === 'fail') {
        break; // Streak broken
      }
      // 'skip' doesn't break streak
    }
    
    // Longest streak: find max consecutive successes
    // ... similar logic scanning all entries
    
    return { current: currentStreak, longest: longestStreak, lastSuccess };
  }
  
  async getAllStreaks(accountId: string): Promise<Array<{
    habitId: string;
    habitName: string;
    currentStreak: number;
    longestStreak: number;
    successRate: number;
  }>> {
    // Aggregate for all habits
  }
  
  async getSuccessRate(habitId: string, period?: 'week' | 'month' | 'year'): Promise<number> {
    // Count success / (success + fail) * 100
    // Exclude 'skip' entries
  }
}
```

### 5. CRUD + Analytics Endpoints (1h)

```typescript
// Habits
GET    /habits                    // List all habits
GET    /habits/:id                // Get habit details
POST   /habits                    // Create habit
PATCH  /habits/:id                // Update habit
DELETE /habits/:id                // Delete habit

// Entries
GET    /habits/:id/entries        // Get entries for a habit
POST   /habits/:id/entries        // Add entry
PATCH  /habits/:id/entries/:date  // Update entry by date
DELETE /habits/:id/entries/:date  // Delete entry

// Analytics
GET    /habits/:id/streak         // Get current/longest streak
GET    /habits/:id/stats          // Success rate, totals
GET    /habits/summary            // All habits with streaks
GET    /habits/calendar/:month    // Calendar view (all habits for a month)

// Import
POST   /habits/import/habitshare/preview
POST   /habits/import/habitshare/execute
```

## Testing
- Import HabitShare CSV
- Verify emoji habits are handled correctly
- Test streak calculation edge cases:
  - Streak starting from today
  - Gaps in data (skip days)
  - All fails (streak = 0)
- Test date filtering

## Deliverables
1. Complete habits module with entities
2. Migration file
3. HabitShare import service
4. Streak calculation logic
5. CRUD + analytics endpoints
6. Update `app.module.ts`
