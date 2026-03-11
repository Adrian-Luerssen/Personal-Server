# Finance Settings, Transfers & Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unified Finance Settings page, transfer transactions between wallets, and subscription management with auto-generation. Then apply similar settings consolidation to Habits.

**Architecture:** New FinanceSubscription entity with cron-based auto-generation. Transfer transactions create two linked records via linkedTransferId. Frontend consolidates wallets/categories/subscriptions into a tabbed settings page. Habits gets a similar settings page for habit management.

**Tech Stack:** NestJS 9, TypeORM, PostgreSQL, React 18, @nestjs/schedule

**Spec:** `docs/superpowers/specs/2026-03-11-finance-settings-transfers-subscriptions-design.md`

---

## Chunk 1: Backend — Subscription Entity & Migration

### Task 1: Create FinanceSubscription Entity

**Files:**
- Create: `backend/src/finance/entities/subscription.entity.ts`
- Modify: `backend/src/finance/finance.module.ts`

- [ ] **Step 1: Create the entity file**

```typescript
// backend/src/finance/entities/subscription.entity.ts
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractAccountOwnedEntity } from '../../system/abstract.entity';
import { FinanceWallet } from './wallet.entity';
import { FinanceCategory } from './category.entity';

@Entity('finance_subscriptions')
export class FinanceSubscription extends AbstractAccountOwnedEntity {
  @Column({ length: 200 })
  name: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ default: false })
  isIncome: boolean;

  @Column({ length: 20 })
  frequency: 'weekly' | 'monthly' | 'yearly';

  @Column('int')
  billingDay: number;

  @Column('int', { nullable: true })
  billingMonth: number;

  @ManyToOne(() => FinanceWallet, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  wallet: FinanceWallet;

  @Column({ nullable: true })
  walletId: string;

  @ManyToOne(() => FinanceCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  category: FinanceCategory;

  @Column({ nullable: true })
  categoryId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'date', nullable: true })
  lastGeneratedDate: string;

  @Column({ type: 'text', nullable: true })
  note: string;
}
```

- [ ] **Step 2: Register entity in finance module**

In `backend/src/finance/finance.module.ts`, add `FinanceSubscription` to the `TypeOrmModule.forFeature()` array and import it.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add backend/src/finance/entities/subscription.entity.ts backend/src/finance/finance.module.ts
git commit -m "feat(finance): add FinanceSubscription entity"
```

### Task 2: Add linkedTransferId and subscriptionId to Transaction Entity

**Files:**
- Modify: `backend/src/finance/entities/transaction.entity.ts`

- [ ] **Step 1: Add new columns to transaction entity**

Add these fields to `FinanceTransaction`:

```typescript
@Column({ nullable: true })
linkedTransferId: string;

@ManyToOne(() => FinanceSubscription, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn()
subscription: FinanceSubscription;

@Column({ nullable: true })
subscriptionId: string;
```

Import `FinanceSubscription` at the top. The `linkedTransferId` is a plain column (not a formal FK to avoid circular cascade issues).

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add backend/src/finance/entities/transaction.entity.ts
git commit -m "feat(finance): add linkedTransferId and subscriptionId to transactions"
```

### Task 3: Create Migration

**Files:**
- Create: `backend/src/migrations/1762200000000-finance-subscriptions.ts`

- [ ] **Step 1: Create migration file**

```typescript
// backend/src/migrations/1762200000000-finance-subscriptions.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinanceSubscriptions1762200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create subscriptions table
    await queryRunner.query(`
      CREATE TABLE "app_finance_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "accountId" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "isIncome" boolean NOT NULL DEFAULT false,
        "frequency" varchar(20) NOT NULL,
        "billingDay" int NOT NULL,
        "billingMonth" int,
        "walletId" uuid,
        "categoryId" uuid,
        "isActive" boolean NOT NULL DEFAULT true,
        "lastGeneratedDate" date,
        "note" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_finance_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_finance_subscriptions_account" FOREIGN KEY ("accountId") REFERENCES "app_accounts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_finance_subscriptions_wallet" FOREIGN KEY ("walletId") REFERENCES "app_finance_wallets"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_finance_subscriptions_category" FOREIGN KEY ("categoryId") REFERENCES "app_finance_categories"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_finance_subscriptions_account" ON "app_finance_subscriptions" ("accountId")`);
    await queryRunner.query(`CREATE INDEX "IDX_finance_subscriptions_active" ON "app_finance_subscriptions" ("accountId", "isActive")`);

    // Add columns to transactions table
    await queryRunner.query(`ALTER TABLE "app_finance_transactions" ADD "linkedTransferId" uuid`);
    await queryRunner.query(`ALTER TABLE "app_finance_transactions" ADD "subscriptionId" uuid`);
    await queryRunner.query(`ALTER TABLE "app_finance_transactions" ADD CONSTRAINT "FK_finance_transactions_subscription" FOREIGN KEY ("subscriptionId") REFERENCES "app_finance_subscriptions"("id") ON DELETE SET NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_finance_transactions_linked" ON "app_finance_transactions" ("accountId", "linkedTransferId")`);
    await queryRunner.query(`CREATE INDEX "IDX_finance_transactions_subscription" ON "app_finance_transactions" ("subscriptionId", "transactionDate")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_finance_transactions_subscription"`);
    await queryRunner.query(`DROP INDEX "IDX_finance_transactions_linked"`);
    await queryRunner.query(`ALTER TABLE "app_finance_transactions" DROP CONSTRAINT "FK_finance_transactions_subscription"`);
    await queryRunner.query(`ALTER TABLE "app_finance_transactions" DROP COLUMN "subscriptionId"`);
    await queryRunner.query(`ALTER TABLE "app_finance_transactions" DROP COLUMN "linkedTransferId"`);
    await queryRunner.query(`DROP TABLE "app_finance_subscriptions"`);
  }
}
```

- [ ] **Step 2: Register migration in dataSource.ts**

Add the new migration to the migrations array in `backend/src/dataSource.ts`.

- [ ] **Step 3: Run migration**

Run: `cd backend && npm run typeorm:migrate:run`

- [ ] **Step 4: Commit**

```bash
git add backend/src/migrations/1762200000000-finance-subscriptions.ts backend/src/dataSource.ts
git commit -m "feat(finance): add subscriptions migration"
```

---

## Chunk 2: Backend — Subscriptions CRUD & Transfer Logic

### Task 4: Create Subscriptions Service

**Files:**
- Create: `backend/src/finance/subscriptions/subscriptions.service.ts`

- [ ] **Step 1: Create the service**

```typescript
// backend/src/finance/subscriptions/subscriptions.service.ts
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { FinanceSubscription } from '../entities/subscription.entity';
import { FinanceTransaction } from '../entities/transaction.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(FinanceSubscription)
    private subscriptionsRepo: Repository<FinanceSubscription>,
    @InjectRepository(FinanceTransaction)
    private transactionsRepo: Repository<FinanceTransaction>,
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async findAll(accountId: string) {
    return this.subscriptionsRepo.find({
      where: { accountId },
      relations: ['wallet', 'category'],
      order: { isActive: 'DESC', name: 'ASC' },
    });
  }

  async findOne(accountId: string, id: string) {
    const sub = await this.subscriptionsRepo.findOne({
      where: { id, accountId },
      relations: ['wallet', 'category'],
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async create(accountId: string, body: Partial<FinanceSubscription>) {
    const sub = this.subscriptionsRepo.create({ ...body, accountId });
    const saved = await this.subscriptionsRepo.save(sub);
    return this.findOne(accountId, saved.id);
  }

  async update(accountId: string, id: string, body: Partial<FinanceSubscription>) {
    await this.findOne(accountId, id);
    await this.subscriptionsRepo.update({ id, accountId }, body);
    return this.findOne(accountId, id);
  }

  async remove(accountId: string, id: string) {
    await this.findOne(accountId, id);
    await this.subscriptionsRepo.delete({ id, accountId });
  }

  async generate(accountId: string): Promise<number> {
    const subs = await this.subscriptionsRepo.find({
      where: { accountId, isActive: true },
    });

    let totalGenerated = 0;

    for (const sub of subs) {
      if (!sub.walletId) continue;

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Lock the subscription row
        const locked = await queryRunner.manager.findOne(FinanceSubscription, {
          where: { id: sub.id },
          lock: { mode: 'pessimistic_write' },
        });

        const startDate = locked.lastGeneratedDate
          ? new Date(locked.lastGeneratedDate)
          : new Date(locked.createdAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const billingDates = this.calculateBillingDates(locked, startDate, today);

        for (const billingDate of billingDates) {
          const dateStr = billingDate.toISOString().split('T')[0];

          // Idempotency check
          const exists = await queryRunner.manager.findOne(FinanceTransaction, {
            where: { subscriptionId: sub.id, transactionDate: dateStr as any },
          });
          if (exists) continue;

          const tx = queryRunner.manager.create(FinanceTransaction, {
            accountId,
            name: sub.name,
            amount: sub.amount,
            isIncome: sub.isIncome,
            wallet: { id: sub.walletId },
            category: sub.categoryId ? { id: sub.categoryId } : null,
            transactionDate: dateStr,
            isPaid: true,
            type: 0,
            subscription: { id: sub.id },
            note: `Auto-generated from subscription: ${sub.name}`,
          });
          await queryRunner.manager.save(tx);
          totalGenerated++;
        }

        if (billingDates.length > 0) {
          const lastDate = billingDates[billingDates.length - 1];
          await queryRunner.manager.update(FinanceSubscription, sub.id, {
            lastGeneratedDate: lastDate.toISOString().split('T')[0],
          });
        }

        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    }

    if (totalGenerated > 0) {
      await this.cache.reset();
    }

    return totalGenerated;
  }

  private calculateBillingDates(
    sub: FinanceSubscription,
    afterDate: Date,
    upToDate: Date,
  ): Date[] {
    const dates: Date[] = [];
    let current = new Date(afterDate);

    // Move to next billing date after afterDate
    if (sub.frequency === 'weekly') {
      current.setDate(current.getDate() + 1);
      while (current.getDay() !== (sub.billingDay % 7)) {
        current.setDate(current.getDate() + 1);
      }
    } else if (sub.frequency === 'monthly') {
      current.setDate(current.getDate() + 1);
      if (current.getDate() > sub.billingDay) {
        current.setMonth(current.getMonth() + 1);
      }
      current.setDate(Math.min(sub.billingDay, this.daysInMonth(current)));
    } else if (sub.frequency === 'yearly') {
      current.setDate(current.getDate() + 1);
      const targetMonth = (sub.billingMonth || 1) - 1;
      if (current.getMonth() > targetMonth ||
          (current.getMonth() === targetMonth && current.getDate() > sub.billingDay)) {
        current.setFullYear(current.getFullYear() + 1);
      }
      current.setMonth(targetMonth);
      current.setDate(Math.min(sub.billingDay, this.daysInMonth(current)));
    }

    while (current <= upToDate) {
      dates.push(new Date(current));

      if (sub.frequency === 'weekly') {
        current.setDate(current.getDate() + 7);
      } else if (sub.frequency === 'monthly') {
        current.setMonth(current.getMonth() + 1);
        current.setDate(Math.min(sub.billingDay, this.daysInMonth(current)));
      } else if (sub.frequency === 'yearly') {
        current.setFullYear(current.getFullYear() + 1);
        current.setDate(Math.min(sub.billingDay, this.daysInMonth(current)));
      }
    }

    return dates;
  }

  private daysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }
}
```

- [ ] **Step 2: Verify compiles**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add backend/src/finance/subscriptions/subscriptions.service.ts
git commit -m "feat(finance): add subscriptions service with generation logic"
```

### Task 5: Create Subscriptions Controller

**Files:**
- Create: `backend/src/finance/subscriptions/subscriptions.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
// backend/src/finance/subscriptions/subscriptions.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '../../system/auth/auth.guard';
import { SubscriptionsService } from './subscriptions.service';

@Controller('finance/subscriptions')
@UseGuards(AuthGuard)
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.account.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.account.id, id);
  }

  @Post()
  create(@Request() req, @Body() body) {
    return this.service.create(req.account.id, body);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() body) {
    return this.service.update(req.account.id, id, body);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.account.id, id);
  }

  @Post('generate')
  generate(@Request() req) {
    return this.service.generate(req.account.id);
  }
}
```

- [ ] **Step 2: Register in finance module**

In `backend/src/finance/finance.module.ts`, add `SubscriptionsService` to providers and `SubscriptionsController` to controllers. Import both.

- [ ] **Step 3: Verify compiles**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add backend/src/finance/subscriptions/ backend/src/finance/finance.module.ts
git commit -m "feat(finance): add subscriptions controller and register in module"
```

### Task 6: Add Subscription Cron Job

**Files:**
- Modify: `backend/src/finance/subscriptions/subscriptions.service.ts`

- [ ] **Step 1: Add cron method to SubscriptionsService**

Add to `SubscriptionsService`:

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';

// Add class property:
private readonly logger = new Logger(SubscriptionsService.name);

// Add cron method:
@Cron(CronExpression.EVERY_DAY_AT_6AM)
async handleSubscriptionGeneration() {
  this.logger.log('Running subscription generation cron...');
  try {
    const accounts = await this.subscriptionsRepo
      .createQueryBuilder('s')
      .select('DISTINCT s.accountId', 'accountId')
      .where('s.isActive = true')
      .getRawMany();

    let total = 0;
    for (const { accountId } of accounts) {
      const count = await this.generate(accountId);
      total += count;
    }
    this.logger.log(`Subscription cron complete: ${total} transactions generated`);
  } catch (err) {
    this.logger.error('Subscription cron failed', err.stack);
  }
}
```

- [ ] **Step 2: Verify compiles**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add backend/src/finance/subscriptions/subscriptions.service.ts
git commit -m "feat(finance): add daily subscription generation cron job"
```

### Task 7: Add Transfer Support to Transactions Service

**Files:**
- Modify: `backend/src/finance/transactions/transactions.service.ts`
- Modify: `backend/src/finance/transactions/transactions.controller.ts`

- [ ] **Step 1: Add transfer creation method to TransactionsService**

Add to `TransactionsService`:

```typescript
async createTransfer(accountId: string, body: {
  name: string;
  fromWalletId: string;
  toWalletId: string;
  amountSent: number;
  amountReceived: number;
  transactionDate: string;
  note?: string;
}) {
  if (body.fromWalletId === body.toWalletId) {
    throw new BadRequestException('From and To wallets must be different');
  }

  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const txOut = queryRunner.manager.create(FinanceTransaction, {
      accountId,
      name: body.name,
      amount: body.amountSent,
      isIncome: false,
      type: 1,
      wallet: { id: body.fromWalletId },
      transactionDate: body.transactionDate,
      isPaid: true,
      note: body.note,
    });
    const savedOut = await queryRunner.manager.save(txOut);

    const txIn = queryRunner.manager.create(FinanceTransaction, {
      accountId,
      name: body.name,
      amount: body.amountReceived,
      isIncome: true,
      type: 1,
      wallet: { id: body.toWalletId },
      transactionDate: body.transactionDate,
      isPaid: true,
      note: body.note,
    });
    const savedIn = await queryRunner.manager.save(txIn);

    // Link them
    await queryRunner.manager.update(FinanceTransaction, savedOut.id, { linkedTransferId: savedIn.id });
    await queryRunner.manager.update(FinanceTransaction, savedIn.id, { linkedTransferId: savedOut.id });

    await queryRunner.commitTransaction();
    await this.cache.reset();

    return { outgoing: { ...savedOut, linkedTransferId: savedIn.id }, incoming: { ...savedIn, linkedTransferId: savedOut.id } };
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
```

Add `DataSource` and `BadRequestException` imports. Inject `DataSource` in constructor.

- [ ] **Step 2: Add transfer deletion to remove method**

Modify existing `remove()` method to cascade-delete linked transfers:

```typescript
async remove(accountId: string, id: string) {
  const tx = await this.repo.findOne({ where: { id, accountId } });
  if (!tx) throw new NotFoundException();

  if (tx.linkedTransferId) {
    await this.repo.delete({ id: tx.linkedTransferId, accountId });
  }
  await this.repo.delete({ id, accountId });
  await this.cache.reset();
}
```

- [ ] **Step 3: Exclude transfers from summary**

In the `getSummary()` method, add a WHERE clause to exclude type 1 and 3 from income/expense totals:

Add `.andWhere('t.type IS NULL OR t.type = 0')` to the summary query builder.

- [ ] **Step 4: Add linkedTransferId to findAll SELECT**

In the `findAll()` query builder, add `'t.linkedTransferId'` and `'t.subscriptionId'` to the select list.

- [ ] **Step 5: Add transfer endpoint to controller**

Add to `TransactionsController`:

```typescript
@Post('transfer')
createTransfer(@Request() req, @Body() body) {
  return this.service.createTransfer(req.account.id, body);
}
```

- [ ] **Step 6: Verify compiles**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add backend/src/finance/transactions/
git commit -m "feat(finance): add transfer transaction support"
```

---

## Chunk 3: Frontend — Finance Settings Page

### Task 8: Create Finance Settings Page

**Files:**
- Create: `frontend/src/pages/Finance/FinanceSettings.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create the tabbed settings page**

Create `frontend/src/pages/Finance/FinanceSettings.jsx` — a tabbed page with Wallets, Categories, and Subscriptions tabs. Use `useSearchParams` to track active tab via `?tab=` query param.

Structure:
- Tab bar at top (Wallets | Categories | Subscriptions)
- Each tab renders its own section component inline
- Wallets tab: migrated from `FinanceWallets.jsx` — wallet list with balances, add/edit/delete modal
- Categories tab: migrated from `FinanceCategories.jsx` — category tree with add/edit/delete
- Subscriptions tab: new — subscription list with add/edit/delete modal

The Subscriptions tab should:
- Show summary line: "N active · €X/month"
- List subscriptions with: name, category icon, amount, frequency, next billing date, wallet name, active/paused badge
- Add/edit modal with fields: name, income/expense toggle, amount, frequency, billingDay, billingMonth (if yearly), wallet picker, category picker, note, active toggle
- Delete with confirmation

- [ ] **Step 2: Update routes in App.jsx**

- Add import for `FinanceSettings`
- Add route: `/finance/settings` → `FinanceSettings`
- Remove routes: `/finance/wallets`, `/finance/categories`
- Remove imports for `FinanceWallets`, `FinanceCategories`

- [ ] **Step 3: Update Finance dashboard navigation**

In `frontend/src/pages/Finance/Finance.jsx`:
- Change "Manage Wallets" link from `/finance/wallets` to `/finance/settings?tab=wallets`
- Change "Manage Categories" link from `/finance/categories` to `/finance/settings?tab=categories`
- Add navigation to subscriptions: `/finance/settings?tab=subscriptions`
- On mount, call `POST /finance/subscriptions/generate` for catch-up

- [ ] **Step 4: Test manually — navigate to /finance/settings and verify all 3 tabs work**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Finance/FinanceSettings.jsx frontend/src/App.jsx frontend/src/pages/Finance/Finance.jsx
git commit -m "feat(finance): add unified finance settings page with subscriptions"
```

### Task 9: Delete Old Standalone Pages

**Files:**
- Delete: `frontend/src/pages/Finance/FinanceWallets.jsx`
- Delete: `frontend/src/pages/Finance/FinanceCategories.jsx`

- [ ] **Step 1: Delete the files**

Remove `FinanceWallets.jsx` and `FinanceCategories.jsx` since their functionality is now in `FinanceSettings.jsx`.

- [ ] **Step 2: Verify no remaining imports reference them**

Search for `FinanceWallets` and `FinanceCategories` in all frontend files. Fix any remaining references.

- [ ] **Step 3: Verify frontend builds**

Run: `cd frontend && npm run build`

- [ ] **Step 4: Commit**

```bash
git add -A frontend/src/
git commit -m "refactor(finance): remove standalone wallets and categories pages"
```

---

## Chunk 4: Frontend — Transfer Form

### Task 10: Update TransactionForm for Transfers

**Files:**
- Modify: `frontend/src/components/finance/TransactionForm.jsx`

- [ ] **Step 1: Add Transfer type toggle**

Change the Income/Expense toggle to a 3-way toggle: Income | Expense | Transfer.

When Transfer is selected:
- Show "From Wallet" and "To Wallet" dropdowns instead of single wallet
- Show "Amount Sent" and "Amount Received" fields
- Auto-fill currencies from wallet selection
- If both wallets have same currency, lock Amount Received to match Amount Sent
- Hide category picker
- Show info banner about linked transactions

- [ ] **Step 2: Handle transfer submit**

When saving a transfer, call `POST /finance/transactions/transfer` instead of the regular create endpoint. Pass: `name`, `fromWalletId`, `toWalletId`, `amountSent`, `amountReceived`, `transactionDate`, `note`.

- [ ] **Step 3: Handle transfer editing**

When opening a transaction with `linkedTransferId`, fetch the linked transaction and pre-fill the transfer form. On save, update via `PATCH` on the primary transaction (backend handles syncing the pair).

- [ ] **Step 4: Update transaction list display**

In `FinanceTransactions.jsx`, detect transfer transactions (type === 1 or type === 3) and display them with a blue transfer icon and "From → To" wallet label.

- [ ] **Step 5: Verify frontend builds**

Run: `cd frontend && npm run build`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/finance/TransactionForm.jsx frontend/src/pages/Finance/FinanceTransactions.jsx
git commit -m "feat(finance): add transfer transaction type to form"
```

---

## Chunk 5: Frontend — Add Finance Styles

### Task 11: Add CSS for New Components

**Files:**
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add settings tab styles**

Add styles for:
- `.finance-settings-tabs` — tab bar with active indicator
- `.finance-settings-tab` — individual tab button
- `.subscription-row` — subscription list item
- `.subscription-status` — active/paused badge
- `.transfer-form` — transfer-specific form layout
- `.transfer-arrow` — arrow between wallet pickers
- `.transfer-info` — info banner in transfer form

- [ ] **Step 2: Verify frontend builds**

Run: `cd frontend && npm run build`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles.css
git commit -m "style(finance): add settings and transfer form styles"
```

---

## Chunk 6: Habits Settings Page

### Task 12: Create Habits Settings Page

**Files:**
- Create: `frontend/src/pages/Habits/HabitsSettings.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/Habits/Habits.jsx`

- [ ] **Step 1: Create HabitsSettings page**

Create a settings page for habits at `/habits/settings` with two tabs:
- **Habits** tab: List all habits with edit/delete/toggle active. Add new habit form. Shows name, emoji, color, description, active status.
- **Import** tab: Migrate the HabitShare import wizard from HabitsImport.jsx into this tab.

This consolidates habit management and import into one config page, similar to the finance settings pattern.

- [ ] **Step 2: Update routes**

In `App.jsx`:
- Add route: `/habits/settings` → `HabitsSettings`
- Remove route: `/habits/import`
- Remove import for `HabitsImport`

- [ ] **Step 3: Update Habits dashboard navigation**

In `Habits.jsx`, change "Import HabitShare" button to navigate to `/habits/settings?tab=import`. Add a gear icon link to `/habits/settings`.

- [ ] **Step 4: Verify frontend builds**

Run: `cd frontend && npm run build`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Habits/HabitsSettings.jsx frontend/src/App.jsx frontend/src/pages/Habits/Habits.jsx
git commit -m "feat(habits): add unified habits settings page"
```

### Task 13: Delete Old Habits Import Page

**Files:**
- Delete: `frontend/src/pages/Habits/HabitsImport.jsx`

- [ ] **Step 1: Delete HabitsImport.jsx**

- [ ] **Step 2: Verify no remaining imports**

- [ ] **Step 3: Verify frontend builds**

Run: `cd frontend && npm run build`

- [ ] **Step 4: Commit**

```bash
git add -A frontend/src/
git commit -m "refactor(habits): remove standalone import page"
```

---

## Chunk 7: Site-Wide Review & Playwright Testing

### Task 14: Full Site Review with Playwright

**Files:** None (testing only)

- [ ] **Step 1: Start the dev servers**

Start backend and frontend dev servers if not already running.

- [ ] **Step 2: Test login flow**

Navigate to the app, verify login works.

- [ ] **Step 3: Test Finance dashboard**

- Navigate to `/finance`
- Verify stats cards, pie chart, recent transactions render
- Verify navigation links to settings page work

- [ ] **Step 4: Test Finance Settings — Wallets tab**

- Navigate to `/finance/settings?tab=wallets`
- Verify wallet list loads with balances
- Test add/edit/delete wallet

- [ ] **Step 5: Test Finance Settings — Categories tab**

- Navigate to `/finance/settings?tab=categories`
- Verify category tree loads
- Test add/edit/delete category

- [ ] **Step 6: Test Finance Settings — Subscriptions tab**

- Navigate to `/finance/settings?tab=subscriptions`
- Verify subscription list loads
- Test add/edit/delete subscription
- Verify active/paused toggle

- [ ] **Step 7: Test Transfer creation**

- Open new transaction form
- Select Transfer type
- Fill from/to wallets and amounts
- Submit and verify both transactions appear in the list

- [ ] **Step 8: Test Finance Transactions page**

- Navigate to `/finance/transactions`
- Verify transfers display correctly with blue icon
- Test all filters still work
- Verify pagination

- [ ] **Step 9: Test Habits dashboard**

- Navigate to `/habits`
- Verify habits load with streaks and calendar
- Verify settings navigation works

- [ ] **Step 10: Test Habits Settings**

- Navigate to `/habits/settings`
- Verify habits list tab works (add/edit/delete)
- Verify import tab works

- [ ] **Step 11: Test cross-page navigation**

- Navigate between all main sections (Dashboard, Workout, Music, Habits, Finance)
- Verify sidebar navigation works
- Verify no broken links

- [ ] **Step 12: Test mobile responsiveness**

- Resize browser to mobile viewport
- Verify all pages render correctly
- Verify settings tabs are usable on mobile

- [ ] **Step 13: Fix any issues found**

Address all bugs discovered during testing.

- [ ] **Step 14: Final commit**

```bash
git add -A
git commit -m "fix: address issues found during site-wide review"
```

- [ ] **Step 15: Push to remote**

```bash
git push origin main
```
