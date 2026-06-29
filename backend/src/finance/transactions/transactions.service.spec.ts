import { CACHE_MANAGER } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { FinanceTransaction } from '../entities/transaction.entity';
import { Account } from '../../system/accounts/account.entity';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repo: { createQueryBuilder: jest.Mock };
  let cacheManager: { reset: jest.Mock };

  const account = { id: 'account-1' } as Account;

  function makeQueryBuilder() {
    return {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
  }

  beforeEach(async () => {
    repo = {
      createQueryBuilder: jest.fn(),
    };
    cacheManager = {
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(FinanceTransaction), useValue: repo },
        { provide: DataSource, useValue: {} },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should use TypeORM property paths for selected columns and quoted SQL filters', async () => {
    const qb = makeQueryBuilder();
    repo.createQueryBuilder.mockReturnValue(qb);

    await service.findAll(account, {
      walletId: 'wallet-1',
      categoryId: 'cat-1',
      from: '2026-04-01',
      to: '2026-04-07',
      isIncome: false,
    });

    expect(qb.where).toHaveBeenCalledWith('t."accountId" = :accountId', {
      accountId: 'account-1',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('t."walletId" = :walletId', {
      walletId: 'wallet-1',
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(t."categoryId" = :categoryId OR t."categoryId" IN (SELECT id FROM app_finance_categories WHERE "parentCategoryId" = :categoryId))',
      { categoryId: 'cat-1' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith('t."transactionDate" >= :from', {
      from: new Date('2026-04-01'),
    });
    expect(qb.andWhere).toHaveBeenCalledWith('t."transactionDate" < :to', {
      to: new Date('2026-04-08T00:00:00.000Z'),
    });
    expect(qb.andWhere).toHaveBeenCalledWith('t."isIncome" = :isIncome', {
      isIncome: false,
    });
    expect(qb.select).toHaveBeenCalledWith(
      expect.arrayContaining([
        't.isIncome',
        't.transactionDate',
        't.createdAt',
        't.linkedTransferId',
        't.subscriptionId',
        'category.iconName',
        'category.parentCategoryId',
        'parentCategory.iconName',
        'wallet.iconName',
      ]),
    );
    expect(qb.select).not.toHaveBeenCalledWith(
      expect.arrayContaining([
        't."isIncome"',
        't."transactionDate"',
        'category."iconName"',
      ]),
    );
    expect(qb.orderBy).toHaveBeenCalledWith('t.transactionDate', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('t.createdAt', 'DESC');
  });

  it('should quote mixed-case finance columns in summary and daily aggregation queries', async () => {
    const summaryQb = makeQueryBuilder();
    const categoryQb = makeQueryBuilder();
    const dailyQb = makeQueryBuilder();
    repo.createQueryBuilder
      .mockReturnValueOnce(summaryQb)
      .mockReturnValueOnce(categoryQb)
      .mockReturnValueOnce(dailyQb);

    await service.getSummary(account, {
      from: '2026-04-01',
      to: '2026-04-07',
    });

    expect(summaryQb.where).toHaveBeenCalledWith('t."accountId" = :accountId', {
      accountId: 'account-1',
    });
    expect(summaryQb.select).toHaveBeenCalledWith('t."isIncome"', 'isIncome');
    expect(summaryQb.groupBy).toHaveBeenCalledWith('t."isIncome"');

    expect(categoryQb.andWhere).toHaveBeenCalledWith('t."isIncome" = :isIncome', {
      isIncome: false,
    });
    expect(dailyQb.select).toHaveBeenCalledWith('DATE(t."transactionDate")', 'date');
  });

  it('should make date-only upper bounds include the whole day', async () => {
    const qb = makeQueryBuilder();
    repo.createQueryBuilder.mockReturnValue(qb);

    await service.findAll(account, {
      from: '2026-06-01',
      to: '2026-06-29',
    });

    expect(qb.andWhere).toHaveBeenCalledWith('t."transactionDate" >= :from', {
      from: new Date('2026-06-01T00:00:00.000Z'),
    });
    expect(qb.andWhere).toHaveBeenCalledWith('t."transactionDate" < :to', {
      to: new Date('2026-06-30T00:00:00.000Z'),
    });
    expect(qb.andWhere).not.toHaveBeenCalledWith(
      't."transactionDate" <= :to',
      expect.anything(),
    );
  });
});
