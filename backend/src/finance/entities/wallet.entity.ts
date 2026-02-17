import { Column, Entity, Index } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { ApiProperty } from "@nestjs/swagger";

@Entity("finance_wallets")
@Index(["accountId", "externalId"], { unique: true, where: '"externalId" IS NOT NULL' })
export class FinanceWallet extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Wallet name" })
  @Column({ type: "varchar", length: 200 })
  name: string;

  @ApiProperty({ description: "Hex color string", required: false })
  @Column({ nullable: true })
  colour?: string;

  @ApiProperty({ description: "Icon name", required: false })
  @Column({ nullable: true })
  iconName?: string;

  @ApiProperty({ description: "Currency code (e.g. EUR)", default: "EUR" })
  @Column({ default: "EUR" })
  currency: string;

  @ApiProperty({ description: "Display order" })
  @Column({ default: 0 })
  order: number;

  @ApiProperty({ description: "Cashew wallet_pk", required: false })
  @Column({ nullable: true })
  externalId?: string;
}
