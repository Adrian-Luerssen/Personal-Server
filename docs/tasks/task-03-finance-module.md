# Task: Finance Module Implementation

**Agent**: Development Agent 3
**Priority**: HIGH
**Estimated Effort**: 7h

## Objective
Create a complete finance module to import and manage Cashew app data.

## Repository
- **Path**: `/home/clawdia/.openclaw/workspace/Personal-Server`
- **Backend**: `backend/src/`

## Data Source
- **File**: `/home/clawdia/.openclaw/media/references/cashew-db-v46-SM_S928B2026-02-16-22-48-28-784Z.sql`
- **Format**: SQLite database (exported as SQL file)

### Schema
```sql
-- Wallets
wallet_pk, name, colour, icon_name, currency, order

-- Categories (with subcategories)
category_pk, name, colour, icon_name, income, main_category_pk

-- Transactions
transaction_pk, name, amount, note, category_fk, wallet_fk, date_created, income, paid, type
```

## Tasks

### 1. Entities + Migrations (2h)

Create entities following existing patterns:

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
  @ManyToOne(() => FinanceWallet)
  wallet: FinanceWallet;
  @Column() transactionDate: Date;
  @Column({ default: false }) isIncome: boolean;
  @Column({ default: true }) isPaid: boolean;
  @Column({ nullable: true }) type: number;
  @Column({ nullable: true }) externalId: string;
}
```

Create migration file in `backend/src/migrations/`.

### 2. Module Structure (1h)

```
src/finance/
├── finance.module.ts
├── entities/
│   ├── wallet.entity.ts
│   ├── category.entity.ts
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
    ├── import.controller.ts
    └── cashew-import.service.ts
```

### 3. Cashew Import Service (3h)

Follow the FitNotes import pattern but with improvements:
- Preview endpoint
- Progress streaming (if large)
- Transaction safety

```typescript
@Injectable()
export class CashewImportService {
  async previewImport(account: Account, file: Express.Multer.File): Promise<CashewPreview> {
    // 1. Open SQLite file
    // 2. Count wallets, categories, transactions
    // 3. Check for existing records
    // 4. Return preview
  }
  
  async executeImport(
    account: Account, 
    previewId: string,
    options: CashewImportOptions
  ): Observable<CashewProgress> {
    // 1. Import wallets
    // 2. Import categories (with parent relationships)
    // 3. Import transactions (map wallet_fk, category_fk)
    // Wrap in transaction
  }
}
```

**Note**: The file is a SQL dump, not raw SQLite. Parse the INSERT statements or convert to SQLite first.

### 4. CRUD Endpoints (1h)

```typescript
// Wallets
GET    /finance/wallets
GET    /finance/wallets/:id
POST   /finance/wallets
PATCH  /finance/wallets/:id
DELETE /finance/wallets/:id

// Categories  
GET    /finance/categories
GET    /finance/categories/:id
POST   /finance/categories
PATCH  /finance/categories/:id
DELETE /finance/categories/:id

// Transactions
GET    /finance/transactions          // Paginated, filterable
GET    /finance/transactions/:id
POST   /finance/transactions
PATCH  /finance/transactions/:id
DELETE /finance/transactions/:id
GET    /finance/transactions/summary  // Analytics
```

**Filters for transactions**:
- `walletId` - Filter by wallet
- `categoryId` - Filter by category
- `from`, `to` - Date range
- `isIncome` - Income/expense filter
- `minAmount`, `maxAmount` - Amount range

## Testing
- Import the Cashew data file
- Verify transaction amounts are correct (decimal precision)
- Test category hierarchy (parent categories)
- Test filters and pagination

## Deliverables
1. Complete finance module with all entities
2. Migration file
3. Cashew import service (with preview)
4. CRUD endpoints
5. Update `app.module.ts` to include FinanceModule
