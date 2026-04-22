import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { FinanceBudget } from '../entities/budget.entity';
import { FinanceTransaction } from '../entities/transaction.entity';
import { Account } from '../../system/accounts/account.entity';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let budgetRepo: Record<string, jest.Mock>;
  let txRepo: Record<string, jest.Mock>;

  const mockAccount = { id: 'account-1' } as Account;

  const makeBudget = (overrides: Partial<FinanceBudget> = {}): FinanceBudget => ({
    id: 'budget-1',
    accountId: 'account-1',
    amount: 500,
    period: 'monthly',
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Food', colour: '#ff0000', iconName: 'utensils' } as any,
    createdAt: new Date('2026-01-15'),
    ...overrides,
  } as FinanceBudget);

  beforeEach(async () => {
    budgetRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'budget-1', ...entity })),
      remove: jest.fn(),
    };

    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ spent: '0' }),
    };

    txRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      _qb: mockQueryBuilder as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: getRepositoryToken(FinanceBudget), useValue: budgetRepo },
        { provide: getRepositoryToken(FinanceTransaction), useValue: txRepo },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('findAll', () => {
    it('should query budgets filtered by account with category relation and ASC order', async () => {
      const budgets = [makeBudget(), makeBudget({ id: 'budget-2' })];
      budgetRepo.find.mockResolvedValue(budgets);

      const result = await service.findAll(mockAccount);

      expect(result).toEqual(budgets);
      expect(budgetRepo.find).toHaveBeenCalledWith({
        where: { accountId: 'account-1' },
        relations: ['category'],
        order: { createdAt: 'ASC' },
      });
    });

    it('should return empty array when account has no budgets', async () => {
      budgetRepo.find.mockResolvedValue([]);

      const result = await service.findAll(mockAccount);

      expect(result).toEqual([]);
    });

    it('should not return budgets belonging to a different account', async () => {
      budgetRepo.find.mockResolvedValue([]);
      const otherAccount = { id: 'other-account' } as Account;

      await service.findAll(otherAccount);

      expect(budgetRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { accountId: 'other-account' } }),
      );
    });
  });

  describe('create', () => {
    it('should create a budget with amount, period, and categoryId', async () => {
      const dto = { amount: 1000, period: 'monthly', categoryId: 'cat-1' };

      await service.create(mockAccount, dto);

      expect(budgetRepo.create).toHaveBeenCalledWith({
        amount: 1000,
        period: 'monthly',
        categoryId: 'cat-1',
        accountId: 'account-1',
        account: mockAccount,
      });
      expect(budgetRepo.save).toHaveBeenCalled();
    });

    it('should create a budget without optional period and categoryId', async () => {
      const dto = { amount: 250 };

      await service.create(mockAccount, dto);

      expect(budgetRepo.create).toHaveBeenCalledWith({
        amount: 250,
        accountId: 'account-1',
        account: mockAccount,
      });
    });

    it('should return the saved budget entity', async () => {
      const dto = { amount: 750 };
      budgetRepo.save.mockResolvedValue({ id: 'new-id', amount: 750, accountId: 'account-1' });

      const result = await service.create(mockAccount, dto);

      expect(result).toEqual({ id: 'new-id', amount: 750, accountId: 'account-1' });
    });
  });

  describe('update', () => {
    it('should update an existing budget and return the saved result', async () => {
      const existing = makeBudget();
      budgetRepo.findOne.mockResolvedValue(existing);
      budgetRepo.save.mockResolvedValue({ ...existing, amount: 800 });

      const result = await service.update(mockAccount, 'budget-1', { amount: 800 });

      expect(budgetRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'budget-1', accountId: 'account-1' },
      });
      expect(result.amount).toBe(800);
    });

    it('should throw NotFoundException when budget does not exist', async () => {
      budgetRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(mockAccount, 'nonexistent', { amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when budget belongs to different account', async () => {
      budgetRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(mockAccount, 'budget-1', { amount: 100 }),
      ).rejects.toThrow('Budget not found');
    });

    it('should apply partial updates without overwriting unrelated fields', async () => {
      const existing = makeBudget({ amount: 500, period: 'monthly', categoryId: 'cat-1' });
      budgetRepo.findOne.mockResolvedValue(existing);

      await service.update(mockAccount, 'budget-1', { amount: 999 });

      // The entity passed to save should retain period and categoryId
      const savedEntity = budgetRepo.save.mock.calls[0][0];
      expect(savedEntity.amount).toBe(999);
      expect(savedEntity.period).toBe('monthly');
      expect(savedEntity.categoryId).toBe('cat-1');
    });
  });

  describe('remove', () => {
    it('should remove the budget and return success', async () => {
      const existing = makeBudget();
      budgetRepo.findOne.mockResolvedValue(existing);

      const result = await service.remove(mockAccount, 'budget-1');

      expect(budgetRepo.remove).toHaveBeenCalledWith(existing);
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when budget does not exist', async () => {
      budgetRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove(mockAccount, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should look up by both id and accountId to prevent cross-account deletion', async () => {
      budgetRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(mockAccount, 'budget-1')).rejects.toThrow();

      expect(budgetRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'budget-1', accountId: 'account-1' },
      });
    });
  });

  describe('getStatus', () => {
    let mockQb: Record<string, jest.Mock>;

    beforeEach(() => {
      mockQb = txRepo._qb as any;
    });

    it('should return budget status with spending calculations', async () => {
      const budget = makeBudget({ amount: 500 });
      budgetRepo.find.mockResolvedValue([budget]);
      mockQb.getRawOne.mockResolvedValue({ spent: '200' });

      const result = await service.getStatus(mockAccount);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'budget-1',
        amount: 500,
        period: 'monthly',
        categoryId: 'cat-1',
        categoryName: 'Food',
        categoryColour: '#ff0000',
        categoryIcon: 'utensils',
        spent: 200,
        remaining: 300,
        percentage: 40,
        isOver: false,
      });
    });

    it('should mark budget as over when spent exceeds amount', async () => {
      const budget = makeBudget({ amount: 100 });
      budgetRepo.find.mockResolvedValue([budget]);
      mockQb.getRawOne.mockResolvedValue({ spent: '150' });

      const result = await service.getStatus(mockAccount);

      expect(result[0].spent).toBe(150);
      expect(result[0].remaining).toBe(-50);
      expect(result[0].isOver).toBe(true);
      expect(result[0].percentage).toBe(150);
    });

    it('should handle zero spending', async () => {
      const budget = makeBudget({ amount: 1000 });
      budgetRepo.find.mockResolvedValue([budget]);
      mockQb.getRawOne.mockResolvedValue({ spent: '0' });

      const result = await service.getStatus(mockAccount);

      expect(result[0].spent).toBe(0);
      expect(result[0].remaining).toBe(1000);
      expect(result[0].percentage).toBe(0);
      expect(result[0].isOver).toBe(false);
    });

    it('should handle null spent result gracefully', async () => {
      const budget = makeBudget({ amount: 500 });
      budgetRepo.find.mockResolvedValue([budget]);
      mockQb.getRawOne.mockResolvedValue({ spent: null });

      const result = await service.getStatus(mockAccount);

      expect(result[0].spent).toBe(0);
      expect(result[0].remaining).toBe(500);
    });

    it('should handle undefined getRawOne result', async () => {
      const budget = makeBudget({ amount: 500 });
      budgetRepo.find.mockResolvedValue([budget]);
      mockQb.getRawOne.mockResolvedValue(undefined);

      const result = await service.getStatus(mockAccount);

      expect(result[0].spent).toBe(0);
    });

    it('should return "Total" as categoryName when category is null', async () => {
      const budget = makeBudget({ category: null, categoryId: null });
      budgetRepo.find.mockResolvedValue([budget]);
      mockQb.getRawOne.mockResolvedValue({ spent: '0' });

      const result = await service.getStatus(mockAccount);

      expect(result[0].categoryName).toBe('Total');
      expect(result[0].categoryColour).toBeUndefined();
      expect(result[0].categoryIcon).toBeUndefined();
    });

    it('should handle zero budget amount without division error', async () => {
      const budget = makeBudget({ amount: 0 });
      budgetRepo.find.mockResolvedValue([budget]);
      mockQb.getRawOne.mockResolvedValue({ spent: '50' });

      const result = await service.getStatus(mockAccount);

      expect(result[0].percentage).toBe(0);
      expect(result[0].amount).toBe(0);
    });

    it('should add category filter when budget has categoryId', async () => {
      const budget = makeBudget({ categoryId: 'cat-1' });
      budgetRepo.find.mockResolvedValue([budget]);
      mockQb.getRawOne.mockResolvedValue({ spent: '100' });

      await service.getStatus(mockAccount);

      // andWhere is called multiple times; one call should contain the categoryId subquery
      const andWhereCalls = mockQb.andWhere.mock.calls;
      const categoryCall = andWhereCalls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('categoryId'),
      );
      expect(categoryCall).toBeDefined();
      expect(categoryCall[1]).toEqual({ catId: 'cat-1' });
    });

    it('should not add category filter when budget has no categoryId', async () => {
      const budget = makeBudget({ categoryId: null });
      budgetRepo.find.mockResolvedValue([budget]);
      mockQb.getRawOne.mockResolvedValue({ spent: '100' });

      await service.getStatus(mockAccount);

      const andWhereCalls = mockQb.andWhere.mock.calls;
      const categoryCall = andWhereCalls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('catId'),
      );
      expect(categoryCall).toBeUndefined();
    });

    it('should return empty array when account has no budgets', async () => {
      budgetRepo.find.mockResolvedValue([]);

      const result = await service.getStatus(mockAccount);

      expect(result).toEqual([]);
    });

    it('should process multiple budgets independently', async () => {
      const budgets = [
        makeBudget({ id: 'b1', amount: 500 }),
        makeBudget({ id: 'b2', amount: 200 }),
      ];
      budgetRepo.find.mockResolvedValue(budgets);
      mockQb.getRawOne
        .mockResolvedValueOnce({ spent: '100' })
        .mockResolvedValueOnce({ spent: '250' });

      const result = await service.getStatus(mockAccount);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('b1');
      expect(result[0].isOver).toBe(false);
      expect(result[1].id).toBe('b2');
      expect(result[1].isOver).toBe(true);
    });

    it('should filter transactions by isIncome = false', async () => {
      const budget = makeBudget();
      budgetRepo.find.mockResolvedValue([budget]);
      mockQb.getRawOne.mockResolvedValue({ spent: '0' });

      await service.getStatus(mockAccount);

      const whereCalls = mockQb.andWhere.mock.calls;
      const incomeFilter = whereCalls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('isIncome'),
      );
      expect(incomeFilter).toBeDefined();
    });

    it('should query transactions scoped to the correct account', async () => {
      const budget = makeBudget();
      budgetRepo.find.mockResolvedValue([budget]);
      mockQb.getRawOne.mockResolvedValue({ spent: '0' });

      await service.getStatus(mockAccount);

      expect(mockQb.where).toHaveBeenCalledWith('t."accountId" = :aid', { aid: 'account-1' });
    });

    it('should scope category rollups to the app_finance_categories table with quoted category ids', async () => {
      const budget = makeBudget({ categoryId: 'cat-1' });
      budgetRepo.find.mockResolvedValue([budget]);
      mockQb.getRawOne.mockResolvedValue({ spent: '100' });

      await service.getStatus(mockAccount);

      const categoryCall = mockQb.andWhere.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('app_finance_categories'),
      );
      expect(categoryCall).toEqual([
        '(t."categoryId" = :catId OR t."categoryId" IN (SELECT id FROM app_finance_categories WHERE "parentCategoryId" = :catId))',
        { catId: 'cat-1' },
      ]);
    });

    it('should round percentage to nearest integer', async () => {
      const budget = makeBudget({ amount: 300 });
      budgetRepo.find.mockResolvedValue([budget]);
      // 100/300 = 33.333...% should round to 33
      mockQb.getRawOne.mockResolvedValue({ spent: '100' });

      const result = await service.getStatus(mockAccount);

      expect(result[0].percentage).toBe(33);
    });
  });

  describe('getPeriodRange (tested through getStatus)', () => {
    let mockQb: Record<string, jest.Mock>;

    beforeEach(() => {
      mockQb = txRepo._qb as any;
    });

    it('should use monthly period range by default', async () => {
      const budget = makeBudget({ period: 'monthly' });
      budgetRepo.find.mockResolvedValue([budget]);
      mockQb.getRawOne.mockResolvedValue({ spent: '0' });

      await service.getStatus(mockAccount);

      // Verify date range parameters were passed to andWhere
      const fromCall = mockQb.andWhere.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes(':from'),
      );
      const toCall = mockQb.andWhere.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes(':to'),
      );
      expect(fromCall).toBeDefined();
      expect(toCall).toBeDefined();

      // from should be the 1st of the current month
      const fromDate: Date = fromCall[1].from;
      expect(fromDate.getDate()).toBe(1);

      // to should be the last day of the current month
      const toDate: Date = toCall[1].to;
      expect(toDate.getHours()).toBe(23);
      expect(toDate.getMinutes()).toBe(59);
    });

    it('should use weekly period range when period is weekly', async () => {
      const budget = makeBudget({ period: 'weekly' });
      budgetRepo.find.mockResolvedValue([budget]);
      mockQb.getRawOne.mockResolvedValue({ spent: '0' });

      await service.getStatus(mockAccount);

      const fromCall = mockQb.andWhere.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes(':from'),
      );
      const toCall = mockQb.andWhere.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes(':to'),
      );
      expect(fromCall).toBeDefined();
      expect(toCall).toBeDefined();

      const fromDate: Date = fromCall[1].from;
      const toDate: Date = toCall[1].to;

      // from should be Monday (day 1), to should be Sunday (day 0)
      expect(fromDate.getDay()).toBe(1);
      expect(toDate.getDay()).toBe(0);
      expect(fromDate.getHours()).toBe(0);
      expect(fromDate.getMinutes()).toBe(0);
      expect(toDate.getHours()).toBe(23);
      expect(toDate.getMinutes()).toBe(59);
    });
  });
});
