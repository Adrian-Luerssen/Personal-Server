jest.mock('@nestjsx/crud-typeorm', () => ({
  TypeOrmCrudService: class {
    constructor(public repo: any) {}
  },
}));

import { ForbiddenException } from '@nestjs/common';
import { Account } from '../../system/accounts/account.entity';
import { WorkoutSetsService } from './sets.service';

describe('WorkoutSetsService set editing', () => {
  const account = { id: 'account-1' } as Account;
  const existing = { id: 'set-1', accountId: account.id, reps: 8, weight: 50, notes: null };
  const repo = {
    findOne: jest.fn(),
    save: jest.fn(),
  } as any;
  const syncService = { recordEvent: jest.fn() } as any;
  const service = new WorkoutSetsService(repo, {} as any, syncService);

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findOne.mockResolvedValue({ ...existing });
    repo.save.mockImplementation(async (set: any) => set);
  });

  it('updates editable measurements and records an upsert sync event', async () => {
    const result = await service.updateSet(account, existing.id, { reps: 10, weight: 52.5, notes: 'Clean rep' });

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ reps: 10, weight: 52.5, notes: 'Clean rep' }));
    expect(syncService.recordEvent).toHaveBeenCalledWith(account.id, expect.objectContaining({ entityType: 'workout-set', entityId: existing.id }));
    expect(result).toEqual(expect.objectContaining({ reps: 10, weight: 52.5 }));
  });

  it('rejects edits to another account set', async () => {
    repo.findOne.mockResolvedValue({ ...existing, accountId: 'account-2' });
    await expect(service.updateSet(account, existing.id, { reps: 12 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
