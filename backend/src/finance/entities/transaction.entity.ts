import { Column, Entity, Index, ManyToOne, JoinColumn } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { FinanceCategory } from "./category.entity";
import { FinanceSubscription } from "./subscription.entity";
import { FinanceWallet } from "./wallet.entity";
import { ApiProperty } from "@nestjs/swagger";

@Entity("finance_transactions")
@Index(["accountId", "transactionDate"])
@Index(["accountId", "externalId"], { unique: true, where: '"externalId" IS NOT NULL' })
export class FinanceTransaction extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Transaction name/title" })
  @Column({ type: "varchar", length: 500 })
  name: string;

  @ApiProperty({ description: "Amount (positive value)" })
  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @ApiProperty({ description: "Optional note", required: false })
  @Column({ type: "text", nullable: true })
  note?: string;

  @ApiProperty({ description: "Category", required: false })
  @ManyToOne(() => FinanceCategory, { nullable: true, onDelete: "SET NULL", eager: false })
  @JoinColumn({ name: "categoryId" })
  category?: FinanceCategory | null;

  @Column({ nullable: true })
  categoryId?: string | null;

  @ApiProperty({ description: "Wallet" })
  @ManyToOne(() => FinanceWallet, { nullable: true, onDelete: "SET NULL", eager: false })
  @JoinColumn({ name: "walletId" })
  wallet?: FinanceWallet | null;

  @Column({ nullable: true })
  walletId?: string | null;

  @ApiProperty({ description: "Transaction date" })
  @Column({ type: "timestamptz" })
  transactionDate: Date;

  @ApiProperty({ description: "True = income, false = expense" })
  @Column({ default: false })
  isIncome: boolean;

  @ApiProperty({ description: "Whether the transaction is paid/settled" })
  @Column({ default: true })
  isPaid: boolean;

  @ApiProperty({ description: "Cashew transaction type code", required: false })
  @Column({ nullable: true })
  type?: number;

  @ApiProperty({ description: "Cashew transaction_pk", required: false })
  @Column({ nullable: true })
  externalId?: string;

  @ApiProperty({ description: "Linked transfer transaction ID", required: false })
  @Column({ nullable: true })
  linkedTransferId?: string | null;

  @ApiProperty({ description: "Subscription", required: false })
  @ManyToOne(() => FinanceSubscription, { nullable: true, onDelete: "SET NULL", eager: false })
  @JoinColumn({ name: "subscriptionId" })
  subscription?: FinanceSubscription | null;

  @Column({ nullable: true })
  subscriptionId?: string | null;
}
