import {
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Account } from '../../system/accounts/account.entity';
import { AgentKey } from '../../agents/entities/agent-key.entity';
import { ChatConversation } from './conversation.entity';

export enum ChatSender {
  USER = 'user',
  AGENT = 'agent',
}

export enum ChatStatus {
  SENT = 'sent',
  READ = 'read',
  THINKING = 'thinking',
  FINISHED = 'finished',
  DELIVERED = 'delivered',
  ERROR = 'error',
}

export interface ChatTokenUsage {
  input: number;
  output: number;
  cacheWrite?: number;
  cacheRead?: number;
  total: number;
}

@Entity('chat_message')
export class ChatMessage {
  @ApiProperty({ description: 'Message ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Conversation this message belongs to' })
  @Column({ type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => ChatConversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: ChatConversation;

  @ApiProperty({ description: 'Account that owns this message' })
  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  account: Account;

  @ApiProperty({ description: 'Message sender type', enum: ChatSender })
  @Column({ type: 'enum', enum: ChatSender, enumName: 'app_chat_sender' })
  sender: ChatSender;

  @ApiProperty({ description: 'Agent key that sent this message (if sender is agent)', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  agentKeyId: string | null;

  @ManyToOne(() => AgentKey, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agentKeyId' })
  agentKey: AgentKey | null;

  @ApiProperty({ description: 'Message text content' })
  @Column({ type: 'text' })
  text: string;

  @ApiProperty({ description: 'Message delivery status', enum: ChatStatus })
  @Column({ type: 'enum', enum: ChatStatus, enumName: 'app_chat_status', default: ChatStatus.SENT })
  status: ChatStatus;

  @ApiProperty({ description: 'Token usage reported by the external agent', nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  tokenUsage: ChatTokenUsage | null;

  @ApiProperty({ description: 'Timestamp when the agent read a user message', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @ApiProperty({ description: 'Page context metadata', nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  pageContext: Record<string, any> | null;

  @ApiProperty({ description: 'ID of message being replied to', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  replyToId: string | null;

  @ManyToOne(() => ChatMessage, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'replyToId' })
  replyTo: ChatMessage | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
