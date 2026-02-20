import { Column, Entity, Index, OneToMany } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { ApiProperty } from "@nestjs/swagger";
import { HabitEntry } from "./habit-entry.entity";

@Entity()
@Index(["accountId", "name"], { unique: true })
export class Habit extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Habit name (can include emoji)" })
  @Column({ type: "varchar", length: 200 })
  name: string;

  @ApiProperty({ description: "Optional description", required: false })
  @Column({ type: "text", nullable: true })
  description?: string;

  @ApiProperty({ description: "Optional emoji icon", required: false })
  @Column({ nullable: true })
  emoji?: string;

  @ApiProperty({ description: "Whether the habit is active", default: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: "Optional display color (hex)", required: false })
  @Column({ nullable: true })
  color?: string;

  @OneToMany(() => HabitEntry, (e) => e.habit)
  entries?: HabitEntry[];
}
