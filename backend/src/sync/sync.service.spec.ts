import { SyncService } from './sync.service';
import { SyncOperation } from './sync-event.entity';

function createEventRepoMock() {
  const items: any[] = [];
  let sequence = 0;

  return {
    items,
    create: jest.fn((data) => data),
    save: jest.fn(async (event) => {
      const saved = {
        ...event,
        sequence: event.sequence ?? ++sequence,
        createdAt: event.createdAt ?? new Date(),
      };
      items.push(saved);
      return saved;
    }),
    find: jest.fn(async ({ where, order, take }) => {
      const minSequence = where.sequence?._value ?? where.sequence;
      const accountId = where.accountId;
      const result = items
        .filter((event) => event.accountId === accountId)
        .filter((event) => Number(event.sequence) > Number(minSequence ?? 0))
        .sort((a, b) =>
          order?.sequence === 'DESC'
            ? Number(b.sequence) - Number(a.sequence)
            : Number(a.sequence) - Number(b.sequence),
        );
      return typeof take === 'number' ? result.slice(0, take) : result;
    }),
  };
}

function createMutationRepoMock() {
  const items: any[] = [];

  return {
    items,
    create: jest.fn((data) => data),
    save: jest.fn(async (mutation) => {
      items.push(mutation);
      return mutation;
    }),
    findOne: jest.fn(async ({ where }) =>
      items.find(
        (item) =>
          item.accountId === where.accountId &&
          item.clientMutationId === where.clientMutationId,
      ) ?? null,
    ),
  };
}

describe('SyncService change feed', () => {
  it('records account-scoped entity changes and returns them after a cursor', async () => {
    const eventRepo = createEventRepoMock();
    const service = new SyncService(eventRepo as any, createMutationRepoMock() as any);

    await service.recordEvent('account-1', {
      entityType: 'habit-entry',
      entityId: 'entry-1',
      operation: SyncOperation.UPSERT,
      payload: { status: 'success' },
    });
    await service.recordEvent('account-2', {
      entityType: 'habit-entry',
      entityId: 'entry-2',
      operation: SyncOperation.UPSERT,
      payload: { status: 'fail' },
    });
    await service.recordEvent('account-1', {
      entityType: 'habit-entry',
      entityId: 'entry-1',
      operation: SyncOperation.DELETE,
      payload: null,
    });

    const result = await service.getChanges('account-1', 1);

    expect(result.nextCursor).toBe(3);
    expect(result.events).toEqual([
      expect.objectContaining({
        sequence: 3,
        accountId: 'account-1',
        entityType: 'habit-entry',
        entityId: 'entry-1',
        operation: SyncOperation.DELETE,
        payload: null,
      }),
    ]);
  });

  it('deduplicates client mutations by account and client mutation id', async () => {
    const mutationRepo = createMutationRepoMock();
    const service = new SyncService(createEventRepoMock() as any, mutationRepo as any);
    const handler = jest.fn().mockResolvedValue({ id: 'server-row-1' });

    const first = await service.runIdempotentMutation(
      'account-1',
      'mobile-mutation-1',
      handler,
    );
    const second = await service.runIdempotentMutation(
      'account-1',
      'mobile-mutation-1',
      handler,
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ duplicate: false, result: { id: 'server-row-1' } });
    expect(second).toEqual({ duplicate: true, result: { id: 'server-row-1' } });
  });

  it('aggregates watermarks in the database instead of loading every event', async () => {
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { entityType: 'habit-entry', cursor: '7' },
        { entityType: 'stream', cursor: '14' },
      ]),
    };
    const eventRepo = {
      ...createEventRepoMock(),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    const service = new SyncService(eventRepo as any, createMutationRepoMock() as any);

    const result = await service.getWatermarks('account-1');

    expect(result).toEqual({ 'habit-entry': 7, stream: 14 });
    expect(eventRepo.createQueryBuilder).toHaveBeenCalledWith('event');
    expect(qb.select).toHaveBeenCalledWith('event.entityType', 'entityType');
    expect(qb.addSelect).toHaveBeenCalledWith('MAX(event.sequence)', 'cursor');
    expect(qb.where).toHaveBeenCalledWith('event.accountId = :accountId', {
      accountId: 'account-1',
    });
    expect(qb.groupBy).toHaveBeenCalledWith('event.entityType');
    expect(eventRepo.find).not.toHaveBeenCalled();
  });
});
