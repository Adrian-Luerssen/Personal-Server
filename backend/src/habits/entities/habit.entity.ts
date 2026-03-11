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

  @ApiProperty({ description: "Lucide icon name", default: "circle-check" })
  @Column({ type: "varchar", length: 50, default: "circle-check" })
  iconName: string;

  @ApiProperty({
    description: "Tracking type",
    enum: ["boolean", "numeric"],
    default: "boolean",
  })
  @Column({ type: "varchar", length: 10, default: "boolean" })
  trackingType: string;

  @ApiProperty({
    description: "Frequency type",
    enum: ["daily", "weekly", "monthly", "yearly"],
    default: "daily",
  })
  @Column({ type: "varchar", length: 10, default: "daily" })
  frequencyType: string;

  @ApiProperty({ description: "Times per period", default: 1 })
  @Column({ type: "int", default: 1 })
  frequencyTarget: number;

  @ApiProperty({
    description: "Pass if numeric value <= this threshold",
    required: false,
  })
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  numericPassThreshold?: number;

  @ApiProperty({
    description: "Skip if numeric value <= this threshold (above pass)",
    required: false,
  })
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  numericSkipThreshold?: number;

  @ApiProperty({
    description: "Unit label for numeric values (e.g. cigarettes)",
    required: false,
  })
  @Column({ type: "varchar", length: 30, nullable: true })
  numericUnit?: string;

  @OneToMany(() => HabitEntry, (e) => e.habit)
  entries?: HabitEntry[];
}
