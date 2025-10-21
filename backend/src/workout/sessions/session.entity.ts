import { Column, Entity, Index, OneToMany } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { ApiProperty, ApiHideProperty } from "@nestjs/swagger";
import { WorkoutSet } from "../sets/set.entity";

@Entity()
@Index(["accountId", "date"], { unique: false })
export class WorkoutSession extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Session start timestamp" })
  @Column({ type: "timestamp" })
  startAt: Date;

  @ApiProperty({ description: "Session end timestamp", required: false })
  @Column({ type: "timestamp", nullable: true })
  endAt?: Date | null;

  @ApiProperty({ description: "Session date (local)" })
  @Column({ type: "date" })
  date: string; // YYYY-MM-DD

  @ApiProperty({ description: "Optional title" })
  @Column({ type: "varchar", length: 200, nullable: true })
  title?: string;

  @ApiProperty({ description: "Optional notes" })
  @Column({ type: "text", nullable: true })
  notes?: string;

  @OneToMany(() => WorkoutSet, (s) => s.session)
  sets?: WorkoutSet[];
}
