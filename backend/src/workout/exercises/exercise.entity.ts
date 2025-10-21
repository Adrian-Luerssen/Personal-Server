import { Column, Entity, Index, ManyToOne, OneToMany } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { ApiProperty } from "@nestjs/swagger";
import { WorkoutCategory } from "../categories/category.entity";
import { WorkoutSet } from "../sets/set.entity";

@Entity()
@Index(["accountId", "name"], { unique: true })
export class WorkoutExercise extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Exercise name" })
  @Column({ type: "varchar", length: 200 })
  name: string;

  @ApiProperty({ description: "Optional primary muscle group" })
  @Column({ nullable: true })
  muscleGroup?: string;

  @ApiProperty({ description: "Exercise category" })
  @ManyToOne(() => WorkoutCategory, (c) => c.exercises, {
    onDelete: "SET NULL",
    nullable: true,
  })
  category?: WorkoutCategory | null;
  @Column({ nullable: true })
  categoryId?: string | null;

  @ApiProperty({ description: "Optional notes" })
  @Column({ type: "text", nullable: true })
  notes?: string;

  @OneToMany(() => WorkoutSet, (s) => s.exercise)
  sets?: WorkoutSet[];
}
