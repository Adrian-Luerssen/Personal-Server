import { Column, Entity } from 'typeorm';
import { AbstractAccountOwnedEntity } from '../../system/common/AbstractAccountOwnedEntity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('agent_keys')
export class AgentKey extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: 'Human-readable name for this key (e.g. "Claudia")' })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({ description: 'bcrypt hash of the raw API key' })
  @Column({ type: 'varchar', length: 255 })
  keyHash: string;

  @ApiProperty({ description: 'First 16 chars of the raw key for lookup (e.g. "ps_live_abc12345")' })
  @Column({ type: 'varchar', length: 20 })
  keyPrefix: string;

  @ApiProperty({
    description: 'Allowed scopes',
    example: ['workout:read', 'finance:read'],
  })
  @Column('simple-array')
  scopes: string[];

  @ApiProperty({ description: 'Whether the key is active' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Timestamp of last use', nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  lastUsedAt?: Date | null;

  @ApiProperty({ description: 'Expiry timestamp (null = no expiry)', nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  expiresAt?: Date | null;

  @ApiProperty({ description: 'Extra metadata (agentType, version, etc.)', nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @ApiProperty({ description: 'Total request count' })
  @Column({ default: 0 })
  requestCount: number;
}
