import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AgentKey } from '../agents/entities/agent-key.entity';
import { Account } from '../system/accounts/account.entity';

export enum AppNotificationSource {
  AGENT = 'agent',
  SYSTEM = 'system',
}

export enum AppNotificationCategory {
  ASSISTANT = 'assistant',
  HABITS = 'habits',
  WORKOUT = 'workout',
  FINANCE = 'finance',
  MUSIC = 'music',
  MEDIA = 'media',
  SYSTEM = 'system',
  UPDATES = 'updates',
}

export enum AppNotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

export enum AppNotificationStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  READ = 'read',
  DISMISSED = 'dismissed',
}

@Entity('notifications')
export class AppNotification {
  @ApiProperty({ description: 'Notification ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Owning account ID' })
  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @ApiProperty({ description: 'Agent key that created the notification', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  agentKeyId: string | null;

  @ManyToOne(() => AgentKey, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agentKeyId' })
  agentKey: AgentKey | null;

  @ApiProperty({ description: 'Notification source', enum: AppNotificationSource })
  @Column({ type: 'enum', enum: AppNotificationSource, enumName: 'app_notification_source' })
  source: AppNotificationSource;

  @ApiProperty({ description: 'Notification category', enum: AppNotificationCategory })
  @Column({ type: 'enum', enum: AppNotificationCategory, enumName: 'app_notification_category' })
  category: AppNotificationCategory;

  @ApiProperty({ description: 'Notification priority', enum: AppNotificationPriority })
  @Column({ type: 'enum', enum: AppNotificationPriority, enumName: 'app_notification_priority', default: AppNotificationPriority.NORMAL })
  priority: AppNotificationPriority;

  @ApiProperty({ description: 'Delivery/read status', enum: AppNotificationStatus })
  @Column({ type: 'enum', enum: AppNotificationStatus, enumName: 'app_notification_status', default: AppNotificationStatus.PENDING })
  status: AppNotificationStatus;

  @ApiProperty({ description: 'Short title shown to the user' })
  @Column({ type: 'varchar', length: 120 })
  title: string;

  @ApiProperty({ description: 'Notification body shown to the user' })
  @Column({ type: 'varchar', length: 600 })
  body: string;

  @ApiProperty({ description: 'Optional in-app route to open', nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  actionUrl: string | null;

  @ApiProperty({ description: 'Optional delivery time', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  scheduledFor: Date | null;

  @ApiProperty({ description: 'Native notification delivery timestamp', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @ApiProperty({ description: 'Read timestamp', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @ApiProperty({ description: 'Dismissed timestamp', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  dismissedAt: Date | null;

  @ApiProperty({ description: 'Structured metadata', nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
