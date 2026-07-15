import { CACHE_MANAGER } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionSuggestionsService } from './transaction-suggestions.service';
import {
  FinanceTransactionSuggestion,
  TransactionSuggestionStatus,
} from '../entities/transaction-suggestion.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { Account } from '../../system/accounts/account.entity';
import { SyncOperation } from '../../sync/sync-event.entity';
import { SyncService } from '../../sync/sync.service';

describe('TransactionSuggestionsService', () => {
  let service: TransactionSuggestionsService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let transactionsService: { create: jest.Mock; findOne: jest.Mock };
  let cacheManager: { reset: jest.Mock };
  let syncService: { recordEvent: jest.Mock };

  const account = { id: 'account-1' } as Account;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((input) => ({ id: 'suggestion-new', ...input })),
      save: jest.fn(async (suggestion) => ({ id: suggestion.id || 'suggestion-saved', ...suggestion })),
      find: jest.fn(),
    };
    transactionsService = {
      create: jest.fn(async (_account, payload) => ({
        id: 'transaction-1',
        ...payload,
      })),
      findOne: jest.fn(async () => ({ id: 'transaction-1' })),
    };
    cacheManager = { reset: jest.fn() };
    syncService = { recordEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionSuggestionsService,
        { provide: getRepositoryToken(FinanceTransactionSuggestion), useValue: repo },
        { provide: TransactionsService, useValue: transactionsService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: SyncService, useValue: syncService },
      ],
    }).compile();

    service = module.get<TransactionSuggestionsService>(TransactionSuggestionsService);
  });

  it('stores detected payment suggestions idempotently by account and event hash', async () => {
    repo.findOne.mockResolvedValueOnce(null);

    const result = await service.createFromDetection(account, {
      eventHash: 'hash-1',
      sourcePackage: 'com.bank.app',
      sourceAppLabel: 'Bank',
      merchantRaw: 'Coffee Shop',
      amount: 4.6,
      currency: 'EUR',
      occurredAt: '2026-06-29T10:15:00.000Z',
      confidence: 0.8,
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: account.id,
        eventHash: 'hash-1',
        merchantRaw: 'Coffee Shop',
        merchantNormalized: 'coffee shop',
        amount: 4.6,
        currency: 'EUR',
        status: TransactionSuggestionStatus.PENDING,
      }),
    );
    expect(syncService.recordEvent).toHaveBeenCalledWith(account.id, {
      entityType: 'finance-transaction-suggestion',
      entityId: 'suggestion-new',
      operation: SyncOperation.UPSERT,
      payload: expect.objectContaining({ eventHash: 'hash-1' }),
    });
    expect(result.duplicate).toBe(false);
  });

  it('prefills pending payments from the newest confirmed transaction for the same merchant', async () => {
    repo.find
      .mockResolvedValueOnce([{
        id: 'pending-1', accountId: account.id, merchantNormalized: 'mercadona',
        merchantRaw: 'MERCADONA', status: TransactionSuggestionStatus.PENDING,
      }])
      .mockResolvedValueOnce([{
        id: 'accepted-2', accountId: account.id, merchantNormalized: 'mercadona',
        status: TransactionSuggestionStatus.ACCEPTED,
        matchedTransaction: {
          id: 'transaction-2', name: 'Mercadona', walletId: 'wallet-1',
          categoryId: 'food', note: 'Weekly shop',
        },
      }]);

    const result = await service.findAll(account);

    expect(result[0]).toEqual(expect.objectContaining({
      id: 'pending-1',
      rememberedDefaults: {
        name: 'Mercadona', walletId: 'wallet-1', categoryId: 'food',
        note: 'Weekly shop', source: 'merchant-history',
      },
    }));
    expect(repo.find).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ accountId: account.id, status: TransactionSuggestionStatus.ACCEPTED }),
      relations: ['matchedTransaction'],
      order: { decidedAt: 'DESC', createdAt: 'DESC' },
    }));
  });

  it('does not invent remembered defaults when merchant history has no linked transaction', async () => {
    repo.find
      .mockResolvedValueOnce([{
        id: 'pending-1', accountId: account.id, merchantNormalized: 'coffee shop',
        status: TransactionSuggestionStatus.PENDING,
      }])
      .mockResolvedValueOnce([{
        id: 'accepted-1', accountId: account.id, merchantNormalized: 'coffee shop',
        status: TransactionSuggestionStatus.ACCEPTED, matchedTransaction: null,
      }]);

    const result = await service.findAll(account);

    expect((result[0] as any).rememberedDefaults).toBeUndefined();
  });

  it('returns an existing suggestion instead of duplicating the same notification event', async () => {
    const existing = {
      id: 'suggestion-existing',
      accountId: account.id,
      eventHash: 'hash-1',
      status: TransactionSuggestionStatus.PENDING,
    };
    repo.findOne.mockResolvedValueOnce(existing);

    const result = await service.createFromDetection(account, {
      eventHash: 'hash-1',
      sourcePackage: 'com.bank.app',
      merchantRaw: 'Coffee Shop',
      amount: 4.6,
      currency: 'EUR',
      occurredAt: '2026-06-29T10:15:00.000Z',
    });

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(result).toEqual({ duplicate: true, suggestion: existing });
  });

  it('accepts a pending suggestion by creating an expense transaction and linking it', async () => {
    repo.findOne.mockResolvedValueOnce({
      id: 'suggestion-1',
      accountId: account.id,
      merchantRaw: 'Coffee Shop',
      merchantNormalized: 'coffee shop',
      amount: 4.6,
      currency: 'EUR',
      occurredAt: new Date('2026-06-29T10:15:00.000Z'),
      status: TransactionSuggestionStatus.PENDING,
    });

    const result = await service.accept(account, 'suggestion-1', {
      walletId: 'wallet-1',
      categoryId: 'category-1',
    });

    expect(transactionsService.create).toHaveBeenCalledWith(account, {
      name: 'Coffee Shop',
      amount: 4.6,
      isIncome: false,
      isPaid: true,
      transactionDate: new Date('2026-06-29T10:15:00.000Z'),
      walletId: 'wallet-1',
      categoryId: 'category-1',
      note: 'Detected from payment notification.',
    });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'suggestion-1',
        status: TransactionSuggestionStatus.ACCEPTED,
        matchedTransactionId: 'transaction-1',
      }),
    );
    expect(result.transaction.id).toBe('transaction-1');
  });

  it('returns the linked transaction when an accepted suggestion is confirmed again', async () => {
    const accepted = {
      id: 'suggestion-1',
      accountId: account.id,
      status: TransactionSuggestionStatus.ACCEPTED,
      matchedTransactionId: 'transaction-1',
    };
    repo.findOne.mockResolvedValueOnce(accepted);

    const result = await service.accept(account, 'suggestion-1');

    expect(transactionsService.create).not.toHaveBeenCalled();
    expect(transactionsService.findOne).toHaveBeenCalledWith(account, 'transaction-1');
    expect(result).toEqual({ suggestion: accepted, transaction: { id: 'transaction-1' }, duplicate: true });
  });

  it('applies reviewed amount, date, merchant, wallet, and category corrections before confirming', async () => {
    repo.findOne.mockResolvedValueOnce({
      id: 'suggestion-1',
      accountId: account.id,
      merchantRaw: 'ROUGH BANK LABEL',
      amount: 4.6,
      occurredAt: new Date('2026-06-29T10:15:00.000Z'),
      status: TransactionSuggestionStatus.PENDING,
    });

    await service.accept(account, 'suggestion-1', {
      name: 'Coffee with Ana',
      amount: 5.2,
      occurredAt: '2026-06-29T10:20:00.000Z',
      walletId: 'wallet-1',
      categoryId: 'category-1',
      note: 'Reviewed from Bank notification.',
    });

    expect(transactionsService.create).toHaveBeenCalledWith(account, {
      name: 'Coffee with Ana',
      amount: 5.2,
      isIncome: false,
      isPaid: true,
      transactionDate: new Date('2026-06-29T10:20:00.000Z'),
      walletId: 'wallet-1',
      categoryId: 'category-1',
      note: 'Reviewed from Bank notification.',
    });
  });

  it('rejects suggestions without creating a transaction', async () => {
    repo.findOne.mockResolvedValueOnce({
      id: 'suggestion-1',
      accountId: account.id,
      status: TransactionSuggestionStatus.PENDING,
    });

    await service.reject(account, 'suggestion-1');

    expect(transactionsService.create).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'suggestion-1',
        status: TransactionSuggestionStatus.REJECTED,
      }),
    );
  });

  it('treats repeated rejection as an idempotent decision', async () => {
    const rejected = {
      id: 'suggestion-1',
      accountId: account.id,
      status: TransactionSuggestionStatus.REJECTED,
    };
    repo.findOne.mockResolvedValueOnce(rejected);

    await expect(service.reject(account, 'suggestion-1')).resolves.toBe(rejected);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
