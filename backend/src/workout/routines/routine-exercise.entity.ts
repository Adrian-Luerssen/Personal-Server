import { Column, Entity, Index, ManyToOne } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { ApiProperty } from "@nestjs/swagger";
import { Routine } from "./routine.entity";
import { WorkoutExercise } from "../exercises/exercise.entity";

@Entity()
@Index(["accountId", "routineId", "order"], { unique: true })
export class RoutineExercise extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Owning routine" })
  @ManyToOne(() => Routine, (r) => r.exercises, {
    onDelete: "CASCADE",
  })
  routine: Routine;
  @Column({ nullable: false })
  routineId: string;

  @ApiProperty({ description: "Exercise referenced by the routine" })
  @ManyToOne(() => WorkoutExercise, {
    onDelete: "SET NULL",
    nullable: true,
  })
  exercise?: WorkoutExercise | null;
  @Column({ nullable: true })
  exerciseId?: string | null;

  @ApiProperty({ description: "Order within routine" })
  @Column({ type: "int", default: 0 })
  order: number;

  @ApiProperty({ description: "Prescription text, e.g., 3x5 @75%" })
  @Column({ type: "varchar", length: 200, nullable: true })
  prescription?: string | null;
}
