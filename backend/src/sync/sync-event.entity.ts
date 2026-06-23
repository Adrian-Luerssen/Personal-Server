import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum SyncOperation {
  UPSERT = 'upsert',
  DELETE = 'delete',
}

@Entity('sync_events')
@Index(['accountId', 'sequence'])
@Index(['accountId', 'entityType', 'entityId'])
export class SyncEvent {
  @ApiProperty({ description: 'Monotonic change cursor' })
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  sequence: number;

  @ApiProperty({ description: 'Owning account' })
  @Column({ type: 'uuid' })
  accountId: string;

  @ApiProperty({ description: 'Domain entity type, e.g. habit-entry' })
  @Column({ type: 'varchar', length: 80 })
  entityType: string;

  @ApiProperty({ description: 'Domain entity id' })
  @Column({ type: 'uuid' })
  entityId: string;

  @ApiProperty({ description: 'Change operation', enum: SyncOperation })
  @Column({ type: 'enum', enum: SyncOperation, enumName: 'app_sync_operation' })
  operation: SyncOperation;

  @ApiProperty({ description: 'Entity snapshot for upsert or null for delete', nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @ApiProperty({ description: 'Server time when the change was recorded' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
