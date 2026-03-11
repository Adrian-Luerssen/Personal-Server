import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { FinanceCategory } from "./category.entity";
import { FinanceWallet } from "./wallet.entity";
import { ApiProperty } from "@nestjs/swagger";

@Entity("finance_subscriptions")
export class FinanceSubscription extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Subscription name" })
  @Column({ type: "varchar", length: 200 })
  name: string;

  @ApiProperty({ description: "Amount per billing cycle" })
  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @ApiProperty({ description: "True = income, false = expense" })
  @Column({ default: false })
  isIncome: boolean;

  @ApiProperty({ description: "Billing frequency: weekly, monthly, or yearly" })
  @Column({ type: "varchar", length: 20 })
  frequency: "weekly" | "monthly" | "yearly";

  @ApiProperty({ description: "Day of week (1-7) or day of month (1-31)" })
  @Column({ type: "int" })
  billingDay: number;

  @ApiProperty({ description: "Month for yearly subscriptions (1-12)", required: false })
  @Column({ type: "int", nullable: true })
  billingMonth?: number | null;

  @ApiProperty({ description: "Wallet", required: false })
  @ManyToOne(() => FinanceWallet, { nullable: true, onDelete: "SET NULL", eager: false })
  @JoinColumn({ name: "walletId" })
  wallet?: FinanceWallet | null;

  @Column({ nullable: true })
  walletId?: string | null;

  @ApiProperty({ description: "Category", required: false })
  @ManyToOne(() => FinanceCategory, { nullable: true, onDelete: "SET NULL", eager: false })
  @JoinColumn({ name: "categoryId" })
  category?: FinanceCategory | null;

  @Column({ nullable: true })
  categoryId?: string | null;

  @ApiProperty({ description: "Whether the subscription is active" })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: "Last date a transaction was auto-generated", required: false })
  @Column({ type: "date", nullable: true })
  lastGeneratedDate?: Date | null;

  @ApiProperty({ description: "Optional note", required: false })
  @Column({ type: "text", nullable: true })
  note?: string | null;
}
