import { Column, Entity, Index, ManyToOne, JoinColumn } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { FinanceCategory } from "./category.entity";
import { ApiProperty } from "@nestjs/swagger";

@Entity("finance_budgets")
@Index(["accountId", "categoryId", "period"], { unique: true })
export class FinanceBudget extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Budget limit amount" })
  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @ApiProperty({ description: "Budget period: monthly or weekly" })
  @Column({ type: "varchar", length: 20, default: "monthly" })
  period: string;

  @ApiProperty({ description: "Category this budget applies to (null = total budget)" })
  @ManyToOne(() => FinanceCategory, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "categoryId" })
  category?: FinanceCategory | null;

  @Column({ nullable: true })
  categoryId?: string | null;
}
