import { Column, Entity, Index, ManyToOne } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { ApiProperty } from "@nestjs/swagger";
import { Habit } from "./habit.entity";

export type HabitStatus = "success" | "fail" | "skip";

@Entity()
@Index(["habitId", "date"], { unique: true })
export class HabitEntry extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Parent habit" })
  @ManyToOne(() => Habit, (h) => h.entries, {
    onDelete: "CASCADE",
    nullable: false,
  })
  habit: Habit;

  @Column()
  habitId: string;

  @ApiProperty({ description: "Entry date (YYYY-MM-DD)" })
  @Column({ type: "date" })
  date: string;

  @ApiProperty({
    description: "Result of the habit on this day",
    enum: ["success", "fail", "skip"],
  })
  @Column({
    type: "enum",
    enum: ["success", "fail", "skip"],
    enumName: "habit_status",
  })
  status: HabitStatus;

  @ApiProperty({ description: "Optional comment", required: false })
  @Column({ type: "text", nullable: true })
  comment?: string;

  @ApiProperty({
    description: "Raw numeric value for numeric-type habits",
    required: false,
  })
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  numericValue?: number;
}
