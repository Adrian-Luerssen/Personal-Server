import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sync_client_mutations')
@Index(['accountId', 'clientMutationId'], { unique: true })
export class SyncClientMutation {
  @ApiProperty({ description: 'Server-side mutation receipt id' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Owning account' })
  @Column({ type: 'uuid' })
  accountId: string;

  @ApiProperty({ description: 'Client-generated idempotency key' })
  @Column({ type: 'varchar', length: 120 })
  clientMutationId: string;

  @ApiProperty({ description: 'Stored result returned for duplicate submissions' })
  @Column({ type: 'jsonb' })
  result: Record<string, any>;

  @ApiProperty({ description: 'Server time when the mutation was first applied' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
