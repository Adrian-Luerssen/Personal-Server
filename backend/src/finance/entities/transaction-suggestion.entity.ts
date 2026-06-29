import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractAccountOwnedEntity } from '../../system/common/AbstractAccountOwnedEntity';
import { FinanceTransaction } from './transaction.entity';

export enum TransactionSuggestionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('finance_transaction_suggestions')
@Index(['accountId', 'eventHash'], { unique: true })
@Index(['accountId', 'status', 'occurredAt'])
export class FinanceTransactionSuggestion extends AbstractAccountOwnedEntity {
  @Column({ type: 'varchar', length: 40, default: 'notification' })
  sourceType: string;

  @Column({ type: 'varchar', length: 240 })
  eventHash: string;

  @Column({ type: 'varchar', length: 240, nullable: true })
  sourcePackage?: string | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  sourceAppLabel?: string | null;

  @Column({ type: 'varchar', length: 500 })
  merchantRaw: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  merchantNormalized?: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 12, default: 'EUR' })
  currency: string;

  @Column({ type: 'timestamptz' })
  occurredAt: Date;

  @Column({ type: 'float', default: 0.7 })
  confidence: number;

  @Column({ type: 'varchar', length: 40, default: TransactionSuggestionStatus.PENDING })
  status: TransactionSuggestionStatus;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt?: Date | null;

  @ManyToOne(() => FinanceTransaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'matchedTransactionId' })
  matchedTransaction?: FinanceTransaction | null;

  @Column({ nullable: true })
  matchedTransactionId?: string | null;
}
