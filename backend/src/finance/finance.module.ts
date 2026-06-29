import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { FinanceWallet } from "./entities/wallet.entity";
import { FinanceCategory } from "./entities/category.entity";
import { FinanceTransaction } from "./entities/transaction.entity";
import { FinanceSubscription } from "./entities/subscription.entity";
import { FinanceBudget } from "./entities/budget.entity";
import { FinanceTransactionSuggestion } from "./entities/transaction-suggestion.entity";

import { WalletsService } from "./wallets/wallets.service";
import { CategoriesService } from "./categories/categories.service";
import { TransactionsService } from "./transactions/transactions.service";
import { TransactionSuggestionsService } from "./transaction-suggestions/transaction-suggestions.service";
import { SubscriptionsService } from "./subscriptions/subscriptions.service";
import { CashewImportService } from "./import/cashew-import.service";
import { BudgetsService } from "./budgets/budgets.service";

import { WalletsController } from "./wallets/wallets.controller";
import { CategoriesController } from "./categories/categories.controller";
import { TransactionsController } from "./transactions/transactions.controller";
import { TransactionSuggestionsController } from "./transaction-suggestions/transaction-suggestions.controller";
import { SubscriptionsController } from "./subscriptions/subscriptions.controller";
import { FinanceImportController } from "./import/import.controller";
import { BudgetsController } from "./budgets/budgets.controller";
import { SyncModule } from "../sync/sync.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinanceWallet,
      FinanceCategory,
      FinanceTransaction,
      FinanceSubscription,
      FinanceBudget,
      FinanceTransactionSuggestion,
    ]),
    SyncModule,
  ],
  providers: [
    WalletsService,
    CategoriesService,
    TransactionsService,
    TransactionSuggestionsService,
    SubscriptionsService,
    CashewImportService,
    BudgetsService,
  ],
  controllers: [
    WalletsController,
    CategoriesController,
    TransactionsController,
    TransactionSuggestionsController,
    SubscriptionsController,
    FinanceImportController,
    BudgetsController,
  ],
})
export class FinanceModule {}
