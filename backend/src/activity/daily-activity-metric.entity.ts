import { Column, Entity, Index } from 'typeorm';
import { AbstractAccountOwnedEntity } from '../system/common/AbstractAccountOwnedEntity';

@Entity('activity_daily_metrics')
@Index(['accountId', 'date', 'source'], { unique: true })
@Index(['accountId', 'date'])
export class DailyActivityMetric extends AbstractAccountOwnedEntity {
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 80, default: 'health-connect' })
  source: string;

  @Column({ type: 'integer', default: 0 })
  steps: number;

  @Column({ type: 'integer', nullable: true })
  distanceMeters?: number | null;

  @Column({ type: 'integer', nullable: true })
  activeCalories?: number | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  sourcePackage?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  syncedAt?: Date | null;
}
