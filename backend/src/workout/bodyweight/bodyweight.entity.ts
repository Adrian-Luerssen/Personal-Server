import { Column, Entity, Index } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { ApiProperty } from "@nestjs/swagger";
import { bigInt } from "../../shared/typeormDataTypes";

@Entity()
@Index(["accountId", "date"], { unique: true })
export class BodyWeightEntry extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Entry date (local)" })
  @Column({ type: "date" })
  date: string; // YYYY-MM-DD

  @ApiProperty({ description: "Body weight in kg" })
  @Column(bigInt())
  weightKg: number;

  @ApiProperty({ description: "Optional note" })
  @Column({ type: "text", nullable: true })
  note?: string;
}
