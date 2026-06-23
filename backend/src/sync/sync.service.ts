import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { SyncEvent, SyncOperation } from './sync-event.entity';
import { SyncClientMutation } from './sync-client-mutation.entity';

export interface RecordSyncEventInput {
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, any> | null;
}

export interface SyncChangesResult {
  events: SyncEvent[];
  nextCursor: number;
}

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(SyncEvent)
    private readonly eventRepo: Repository<SyncEvent>,
    @InjectRepository(SyncClientMutation)
    private readonly mutationRepo: Repository<SyncClientMutation>,
  ) {}

  async recordEvent(
    accountId: string,
    input: RecordSyncEventInput,
  ): Promise<SyncEvent> {
    const event = this.eventRepo.create({
      accountId,
      entityType: input.entityType,
      entityId: input.entityId,
      operation: input.operation,
      payload: input.payload,
    });
    return this.eventRepo.save(event);
  }

  async getChanges(
    accountId: string,
    since: number = 0,
    limit: number = 500,
  ): Promise<SyncChangesResult> {
    const events = await this.eventRepo.find({
      where: {
        accountId,
        sequence: MoreThan(since) as any,
      },
      order: { sequence: 'ASC' },
      take: Math.min(Math.max(limit, 1), 1000),
    });

    const nextCursor = events.reduce(
      (cursor, event) => Math.max(cursor, Number(event.sequence)),
      since,
    );

    return { events, nextCursor };
  }

  async getWatermarks(accountId: string): Promise<Record<string, number>> {
    const events = await this.eventRepo.find({
      where: { accountId, sequence: MoreThan(0) as any },
      order: { sequence: 'ASC' },
    });

    return events.reduce<Record<string, number>>((watermarks, event) => {
      watermarks[event.entityType] = Math.max(
        watermarks[event.entityType] ?? 0,
        Number(event.sequence),
      );
      return watermarks;
    }, {});
  }

  async runIdempotentMutation<T extends Record<string, any>>(
    accountId: string,
    clientMutationId: string,
    handler: () => Promise<T>,
  ): Promise<{ duplicate: boolean; result: T }> {
    const existing = await this.mutationRepo.findOne({
      where: { accountId, clientMutationId },
    });
    if (existing) {
      return { duplicate: true, result: existing.result as T };
    }

    const result = await handler();
    const mutation = this.mutationRepo.create({
      accountId,
      clientMutationId,
      result,
    });
    await this.mutationRepo.save(mutation);
    return { duplicate: false, result };
  }
}
