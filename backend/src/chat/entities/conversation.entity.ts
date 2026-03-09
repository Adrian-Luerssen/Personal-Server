import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Account } from '../../system/accounts/account.entity';
import type { ChatMessage } from './message.entity';

@Entity('chat_conversation')
export class ChatConversation {
  @ApiProperty({ description: 'Conversation ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Account that owns this conversation' })
  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  account: Account;

  @ApiProperty({ description: 'Conversation title', nullable: true })
  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany('ChatMessage', 'conversation')
  messages: ChatMessage[];
}
