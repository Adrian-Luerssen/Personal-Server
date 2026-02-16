# Personal Server - Data Integration Plan

**Author**: Claudia (PM Agent)  
**Date**: 2026-02-17  
**Status**: Draft

---

## Executive Summary

This plan outlines the integration of Adrian's personal data sources into the Personal Server NestJS backend. The server already has a solid foundation with authentication, accounts, music tracking (Spotify), and a **fully functional workout module with FitNotes import**. 

We need to add two new modules (Finance, Habits) and enhance the Dashboard for cross-domain analytics.

---

## Current State Analysis

### Existing Infrastructure ✅

| Component | Status | Notes |
|-----------|--------|-------|
| NestJS Backend | ✅ Complete | TypeORM, PostgreSQL, JWT auth |
| Account System | ✅ Complete | Multi-user support, MFA |
| Music Module | ✅ Complete | Spotify streams, tracks |
| **Workout Module** | ✅ **Complete** | Categories, exercises, sessions, sets, routines, bodyweight |
| **FitNotes Import** | ✅ **Complete** | Full SQLite import service exists |
| Dashboard | 🔶 Partial | Only Spotify + workout cross-analysis |

### Data Sources to Integrate

| Source | Format | Records | Status |
|--------|--------|---------|--------|
| FitNotes (Gym) | SQLite | 11,304 sets | ✅ Import exists |
| Cashew (Finance) | SQLite | 793 transactions | ❌ Needs module |
| HabitShare (Habits) | CSV | 5,130 entries | ❌ Needs module |

---

## Data Source Schemas

### 1. Cashew (Finance App) - SQLite

#### Tables
- **transactions**: `transaction_pk`, `name`, `amount`, `note`, `category_fk`, `wallet_fk`, `date_created`, `income` (bool), `paid`, `type`
- **wallets**: `wallet_pk`, `name`, `colour`, `icon_name`, `currency`, `order`
- **categories**: `category_pk`, `name`, `colour`, `icon_name`, `income` (bool), `main_category_pk` (for subcategories)

#### Sample Wallets
- BBVA, Bankinter, Revolut, Santander

#### Sample Categories
- Dining, Shopping, Transit, Night Out, Groceries, Entertainment, Bills & Fees, Health, Travel, Weed, Tobacco, Beer, Hard Drinks, Coffee, Glovo, etc.

### 2. FitNotes (Gym App) - SQLite ✅ ALREADY IMPORTED

#### Tables (already mapped)
- **training_log**: `exercise_id`, `date`, `metric_weight`, `reps`, `distance`, `duration_seconds`
- **exercise**: `name`, `category_id`, `notes`
- **Category**: `name`, `colour`
- **BodyWeight/MeasurementRecord**: `date`, `value`
- **WorkoutTime**: `start_date_time`, `end_date_time`

### 3. HabitShare (Habits App) - CSV

#### Columns
- `Habit`, `Date`, `Status` (success/fail/skip), `Comment`

#### Tracked Habits
- 🍇 (grapes emoji)
- 🍍 (pineapple emoji)
- gym
- Medicine
- No 🔞 (no adult content)
- No Alcohol
- No Smoking
- Wake Up Early (< 8:00 am)

---

## Implementation Plan

### Phase 1: Finance Module (Priority: HIGH)

Create a new `finance` module for Cashew data.

#### 1.1 Entities

```typescript
// src/finance/entities/wallet.entity.ts
@Entity('finance_wallets')
export class FinanceWallet extends AbstractAccountOwnedEntity {
  @Column() name: string;
  @Column({ nullable: true }) colour: string;
  @Column({ nullable: true }) iconName: string;
  @Column({ default: 'EUR' }) currency: string;
  @Column({ default: 0 }) order: number;
  @Column({ nullable: true }) externalId: string; // Cashew wallet_pk
}

// src/finance/entities/category.entity.ts
@Entity('finance_categories')
export class FinanceCategory extends AbstractAccountOwnedEntity {
  @Column() name: string;
  @Column({ nullable: true }) colour: string;
  @Column({ nullable: true }) iconName: string;
  @Column({ default: false }) isIncome: boolean;
  @ManyToOne(() => FinanceCategory, { nullable: true })
  parentCategory: FinanceCategory;
  @Column({ nullable: true }) externalId: string;
}

// src/finance/entities/transaction.entity.ts
@Entity('finance_transactions')
export class FinanceTransaction extends AbstractAccountOwnedEntity {
  @Column() name: string;
  @Column('decimal', { precision: 12, scale: 2 }) amount: number;
  @Column({ nullable: true }) note: string;
  @ManyToOne(() => FinanceCategory)
  category: FinanceCategory;
  @ManyToOne(() => FinanceCategory, { nullable: true })
  subCategory: FinanceCategory;
  @ManyToOne(() => FinanceWallet)
  wallet: FinanceWallet;
  @Column() transactionDate: Date;
  @Column({ default: false }) isIncome: boolean;
  @Column({ default: true }) isPaid: boolean;
  @Column({ nullable: true }) externalId: string;
}
```

#### 1.2 Import Service

```typescript
// src/finance/import/cashew-import.service.ts
@Injectable()
export class CashewImportService {
  async importFromSqlite(account: Account, file: Express.Multer.File) {
    // 1. Import wallets first
    // 2. Import categories (with parent relationships)
    // 3. Import transactions (map wallet_fk, category_fk)
  }
}
```

#### 1.3 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /finance/wallets | List all wallets |
| GET | /finance/categories | List all categories |
| GET | /finance/transactions | List transactions (paginated, filterable) |
| GET | /finance/transactions/summary | Spending summary by category/period |
| POST | /finance/import/cashew | Import Cashew SQLite file |

#### 1.4 Analytics Queries

- **Spending by category** (monthly/yearly)
- **Spending by wallet**
- **Income vs expenses trend**
- **Top spending categories**
- **Daily/weekly/monthly averages**

---

### Phase 2: Habits Module (Priority: MEDIUM)

Create a new `habits` module for HabitShare data.

#### 2.1 Entities

```typescript
// src/habits/entities/habit.entity.ts
@Entity('habits')
export class Habit extends AbstractAccountOwnedEntity {
  @Column() name: string;
  @Column({ nullable: true }) description: string;
  @Column({ nullable: true }) emoji: string;
  @Column({ default: true }) isActive: boolean;
}

// src/habits/entities/habit-entry.entity.ts
@Entity('habit_entries')
export class HabitEntry extends AbstractAccountOwnedEntity {
  @ManyToOne(() => Habit)
  habit: Habit;
  @Column() date: string; // YYYY-MM-DD
  @Column({ type: 'enum', enum: ['success', 'fail', 'skip'] })
  status: 'success' | 'fail' | 'skip';
  @Column({ nullable: true }) comment: string;
}
```

#### 2.2 Import Service

```typescript
// src/habits/import/habitshare-import.service.ts
@Injectable()
export class HabitShareImportService {
  async importFromCsv(account: Account, file: Express.Multer.File) {
    // Parse CSV
    // Create habits (unique by name)
    // Create entries
  }
}
```

#### 2.3 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /habits | List all habits |
| GET | /habits/:id/entries | Get entries for a habit |
| GET | /habits/:id/streak | Get current/longest streak |
| GET | /habits/summary | Overall habit statistics |
| POST | /habits/import/habitshare | Import HabitShare CSV |

#### 2.4 Analytics Queries

- **Current streak** per habit
- **Longest streak** per habit
- **Success rate** (weekly/monthly/all-time)
- **Day-of-week analysis** (which days succeed/fail most)
- **Trends over time**

---

### Phase 3: Enhanced Dashboard (Priority: HIGH)

Expand the dashboard service for cross-domain analytics.

#### 3.1 New Dashboard Endpoints

```typescript
// src/dashboard/dashboard.controller.ts

// Overall stats summary
GET /dashboard/summary
{
  finance: { totalSpent, totalIncome, topCategory },
  workout: { sessionsThisMonth, totalVolume, streak },
  habits: { overallSuccessRate, activeStreaks },
  music: { totalStreams, topArtist }
}

// Correlations
GET /dashboard/correlations
{
  workoutDaysVsHabits: { ... }, // Do gym days correlate with "No Alcohol" success?
  spendingVsHabits: { ... },    // Spending on nights out vs "No Alcohol" fails
  workoutVsMusic: { ... }       // Already exists
}

// Timeline view
GET /dashboard/timeline?from=&to=
{
  dates: [
    { date: '2024-03-08', workout: true, habits: { noAlcohol: 'success' }, spending: 45.50 },
    ...
  ]
}
```

#### 3.2 Interesting Cross-Domain Insights

1. **Spending on "Night Out" + "Beer" + "Hard Drinks"** vs **"No Alcohol" habit failures**
2. **Gym attendance** (from workout sessions) vs **"gym" habit** (validation)
3. **Workout intensity** (volume) vs **sleep habits** (if tracked)
4. **Weekend spending patterns** vs **weekday patterns**
5. **Music during workouts** (already exists)

---

## Database Migrations

### Migration 1: Finance Tables
```sql
CREATE TABLE finance_wallets (
  id UUID PRIMARY KEY,
  "accountId" UUID NOT NULL REFERENCES accounts(id),
  name VARCHAR NOT NULL,
  colour VARCHAR,
  icon_name VARCHAR,
  currency VARCHAR DEFAULT 'EUR',
  "order" INTEGER DEFAULT 0,
  external_id VARCHAR,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE finance_categories (
  id UUID PRIMARY KEY,
  "accountId" UUID NOT NULL REFERENCES accounts(id),
  name VARCHAR NOT NULL,
  colour VARCHAR,
  icon_name VARCHAR,
  is_income BOOLEAN DEFAULT false,
  parent_category_id UUID REFERENCES finance_categories(id),
  external_id VARCHAR,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE finance_transactions (
  id UUID PRIMARY KEY,
  "accountId" UUID NOT NULL REFERENCES accounts(id),
  name VARCHAR NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  note TEXT,
  category_id UUID REFERENCES finance_categories(id),
  sub_category_id UUID REFERENCES finance_categories(id),
  wallet_id UUID REFERENCES finance_wallets(id),
  transaction_date TIMESTAMPTZ NOT NULL,
  is_income BOOLEAN DEFAULT false,
  is_paid BOOLEAN DEFAULT true,
  external_id VARCHAR,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
);

CREATE INDEX idx_finance_transactions_date ON finance_transactions(transaction_date);
CREATE INDEX idx_finance_transactions_category ON finance_transactions(category_id);
```

### Migration 2: Habits Tables
```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY,
  "accountId" UUID NOT NULL REFERENCES accounts(id),
  name VARCHAR NOT NULL,
  description TEXT,
  emoji VARCHAR,
  is_active BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE habit_entries (
  id UUID PRIMARY KEY,
  "accountId" UUID NOT NULL REFERENCES accounts(id),
  habit_id UUID NOT NULL REFERENCES habits(id),
  date DATE NOT NULL,
  status VARCHAR NOT NULL CHECK (status IN ('success', 'fail', 'skip')),
  comment TEXT,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ,
  UNIQUE(habit_id, date)
);

CREATE INDEX idx_habit_entries_date ON habit_entries(date);
CREATE INDEX idx_habit_entries_habit ON habit_entries(habit_id);
```

---

## File Structure

```
src/
├── finance/
│   ├── finance.module.ts
│   ├── entities/
│   │   ├── wallet.entity.ts
│   │   ├── category.entity.ts
│   │   └── transaction.entity.ts
│   ├── wallets/
│   │   ├── wallets.controller.ts
│   │   └── wallets.service.ts
│   ├── categories/
│   │   ├── categories.controller.ts
│   │   └── categories.service.ts
│   ├── transactions/
│   │   ├── transactions.controller.ts
│   │   └── transactions.service.ts
│   └── import/
│       ├── import.controller.ts
│       └── cashew-import.service.ts
├── habits/
│   ├── habits.module.ts
│   ├── entities/
│   │   ├── habit.entity.ts
│   │   └── habit-entry.entity.ts
│   ├── habits/
│   │   ├── habits.controller.ts
│   │   └── habits.service.ts
│   ├── entries/
│   │   ├── entries.controller.ts
│   │   └── entries.service.ts
│   └── import/
│       ├── import.controller.ts
│       └── habitshare-import.service.ts
└── dashboard/
    ├── dashboard.module.ts
    ├── dashboard.controller.ts
    └── dashboard.service.ts (enhanced)
```

---

## Implementation Timeline

| Phase | Task | Estimated Effort | Dependencies |
|-------|------|------------------|--------------|
| 1.1 | Finance entities + migrations | 2h | - |
| 1.2 | Cashew import service | 3h | 1.1 |
| 1.3 | Finance CRUD endpoints | 2h | 1.1 |
| 1.4 | Finance analytics queries | 2h | 1.3 |
| 2.1 | Habits entities + migrations | 1h | - |
| 2.2 | HabitShare import service | 2h | 2.1 |
| 2.3 | Habits CRUD + streak endpoints | 2h | 2.1 |
| 3.1 | Dashboard enhancements | 3h | 1.4, 2.3 |
| 3.2 | Cross-domain correlations | 4h | 3.1 |

**Total**: ~21 hours of development

---

## Notes for Development Agents

### Existing Patterns to Follow

1. **Entity base class**: Extend `AbstractAccountOwnedEntity` for account segregation
2. **Import pattern**: See `src/workout/import/fitnotes-import.service.ts` for SQLite handling
3. **Service pattern**: Use TypeORM repositories, inject with `@InjectRepository`
4. **Controller pattern**: Use `@Auth()` decorator for protected routes
5. **Account context**: Access via `RequestContext.getCurrentAccount()`

### Testing Data

- Cashew SQLite: `/home/clawdia/.openclaw/media/references/cashew-db-v46-SM_S928B2026-02-16-22-48-28-784Z.sql`
- FitNotes SQLite: `/home/clawdia/.openclaw/media/references/FitNotes_Backup.fitnotes`
- HabitShare CSV: `/home/clawdia/.openclaw/media/references/HabitShareData.csv`

### Important Considerations

1. **Decimal precision**: Use `decimal(12,2)` for money, not float
2. **Timezone handling**: Store all dates in UTC, convert on display
3. **External IDs**: Store original Cashew/HabitShare IDs for deduplication on re-import
4. **Batch inserts**: Use `save([...])` for bulk operations
5. **CSV parsing**: Use `csv-parse` or `papaparse` library

---

## Next Steps

1. ✅ Review and approve this plan
2. ⏳ Create GitHub issues for each phase
3. ⏳ Spawn development agents for implementation
4. ⏳ Test with real data imports
5. ⏳ Build frontend dashboard components

---

*This document will be updated as implementation progresses.*
