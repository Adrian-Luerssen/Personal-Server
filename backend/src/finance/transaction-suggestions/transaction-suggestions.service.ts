import {
  BadRequestException,
  CACHE_MANAGER,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { Account } from '../../system/accounts/account.entity';
import { SyncOperation } from '../../sync/sync-event.entity';
import { SyncService } from '../../sync/sync.service';
import {
  FinanceTransactionSuggestion,
  TransactionSuggestionStatus,
} from '../entities/transaction-suggestion.entity';
import { TransactionsService } from '../transactions/transactions.service';

interface CreateSuggestionInput {
  eventHash: string;
  sourcePackage?: string;
  sourceAppLabel?: string;
  merchantRaw?: string;
  amount: number | string;
  currency?: string;
  occurredAt: string | Date;
  confidence?: number;
}

interface AcceptSuggestionInput {
  walletId?: string | null;
  categoryId?: string | null;
  name?: string;
  note?: string | null;
}

@Injectable()
export class TransactionSuggestionsService {
  constructor(
    @InjectRepository(FinanceTransactionSuggestion)
    private readonly repo: Repository<FinanceTransactionSuggestion>,
    private readonly transactionsService: TransactionsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Optional() private readonly syncService?: SyncService,
  ) {}

  async findAll(account: Account, status: TransactionSuggestionStatus = TransactionSuggestionStatus.PENDING) {
    return this.repo.find({
      where: { accountId: account.id, status },
      order: { occurredAt: 'DESC', createdAt: 'DESC' },
      take: 50,
    });
  }

  async createFromDetection(account: Account, input: CreateSuggestionInput) {
    const normalized = this.normalizeSuggestion(input);
    const existing = await this.repo.findOne({
      where: {
        accountId: account.id,
        eventHash: normalized.eventHash,
      },
    });
    if (existing) {
      return { duplicate: true, suggestion: existing };
    }

    const suggestion = this.repo.create({
      ...normalized,
      accountId: account.id,
      account,
      sourceType: 'notification',
      status: TransactionSuggestionStatus.PENDING,
    });

    const saved = await this.repo.save(suggestion);
    await this.cacheManager.reset();
    await this.recordSync(account.id, saved, SyncOperation.UPSERT);
    return { duplicate: false, suggestion: saved };
  }

  async accept(account: Account, id: string, input: AcceptSuggestionInput = {}) {
    const suggestion = await this.findOne(account, id);
    if (suggestion.status !== TransactionSuggestionStatus.PENDING) {
      throw new BadRequestException('Only pending suggestions can be accepted');
    }

    const transaction = await this.transactionsService.create(account, {
      name: input.name || this.titleFromMerchant(suggestion.merchantRaw),
      amount: Number(suggestion.amount),
      isIncome: false,
      isPaid: true,
      transactionDate: new Date(suggestion.occurredAt),
      walletId: input.walletId || null,
      categoryId: input.categoryId || null,
      note: input.note === undefined ? 'Detected from payment notification.' : input.note,
    });

    suggestion.status = TransactionSuggestionStatus.ACCEPTED;
    suggestion.decidedAt = new Date();
    suggestion.matchedTransactionId = transaction.id;
    const saved = await this.repo.save(suggestion);
    await this.cacheManager.reset();
    await this.recordSync(account.id, saved, SyncOperation.UPSERT);

    return { suggestion: saved, transaction };
  }

  async reject(account: Account, id: string) {
    const suggestion = await this.findOne(account, id);
    suggestion.status = TransactionSuggestionStatus.REJECTED;
    suggestion.decidedAt = new Date();
    const saved = await this.repo.save(suggestion);
    await this.cacheManager.reset();
    await this.recordSync(account.id, saved, SyncOperation.UPSERT);
    return saved;
  }

  private async findOne(account: Account, id: string) {
    const suggestion = await this.repo.findOne({
      where: { id, accountId: account.id },
    });
    if (!suggestion) throw new NotFoundException('Transaction suggestion not found');
    return suggestion;
  }

  private normalizeSuggestion(input: CreateSuggestionInput) {
    const eventHash = String(input.eventHash || '').trim();
    if (!eventHash) throw new BadRequestException('eventHash is required');

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }

    const occurredAt = new Date(input.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('occurredAt must be a valid date');
    }

    const merchantRaw = String(input.merchantRaw || 'Detected payment').trim() || 'Detected payment';

    return {
      eventHash,
      sourcePackage: input.sourcePackage || null,
      sourceAppLabel: input.sourceAppLabel || null,
      merchantRaw,
      merchantNormalized: merchantRaw.toLowerCase(),
      amount,
      currency: String(input.currency || 'EUR').toUpperCase(),
      occurredAt,
      confidence: Math.max(0, Math.min(1, Number(input.confidence ?? 0.7))),
    };
  }

  private titleFromMerchant(merchantRaw: string) {
    return merchantRaw
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Detected payment';
  }

  private async recordSync(
    accountId: string,
    suggestion: FinanceTransactionSuggestion,
    operation: SyncOperation,
  ) {
    if (!this.syncService) return;
    await this.syncService.recordEvent(accountId, {
      entityType: 'finance-transaction-suggestion',
      entityId: suggestion.id,
      operation,
      payload: suggestion,
    });
  }
}
