import { Column, Entity, Index, ManyToOne, JoinColumn } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { ApiProperty } from "@nestjs/swagger";

@Entity("finance_categories")
@Index(["accountId", "externalId"], { unique: true, where: '"externalId" IS NOT NULL' })
export class FinanceCategory extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Category name" })
  @Column({ type: "varchar", length: 200 })
  name: string;

  @ApiProperty({ description: "Hex color string", required: false })
  @Column({ nullable: true })
  colour?: string;

  @ApiProperty({ description: "Icon name", required: false })
  @Column({ nullable: true })
  iconName?: string;

  @ApiProperty({ description: "Whether this is an income category" })
  @Column({ default: false })
  isIncome: boolean;

  @ApiProperty({ description: "Parent category (for subcategories)", required: false })
  @ManyToOne(() => FinanceCategory, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "parentCategoryId" })
  parentCategory?: FinanceCategory | null;

  @Column({ nullable: true })
  parentCategoryId?: string | null;

  @ApiProperty({ description: "Cashew category_pk", required: false })
  @Column({ nullable: true })
  externalId?: string;
}
