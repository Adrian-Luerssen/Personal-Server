import { Column, Entity, Index, ManyToOne } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { ApiProperty, ApiHideProperty } from "@nestjs/swagger";
import { WorkoutSession } from "../sessions/session.entity";
import { WorkoutExercise } from "../exercises/exercise.entity";
import { bigInt } from "../../shared/typeormDataTypes";

@Entity()
@Index(["accountId", "sessionId"], { unique: false })
export class WorkoutSet extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Owning session" })
  @ManyToOne(() => WorkoutSession, (s) => s.sets, {
    onDelete: "CASCADE",
  })
  session: WorkoutSession;
  @Column({ nullable: false })
  sessionId: string;

  @ApiProperty({ description: "Exercise performed" })
  @ManyToOne(() => WorkoutExercise, (e) => e.sets, {
    onDelete: "SET NULL",
    nullable: true,
  })
  exercise?: WorkoutExercise | null;
  @Column({ nullable: true })
  exerciseId?: string | null;

  @ApiProperty({ description: "Set order within session" })
  @Column({ type: "int", default: 0 })
  order: number;

  @ApiProperty({ description: "Number of reps (nullable)" })
  @Column({ type: "int", nullable: true })
  reps?: number | null;

  @ApiProperty({ description: "Weight used (kg). Uses decimal transformer." })
  @Column(bigInt({ nullable: true }))
  weight?: number | null;

  @ApiProperty({ description: "Distance value (meters)" })
  @Column(bigInt({ nullable: true }))
  distance?: number | null;

  @ApiProperty({ description: "Duration in seconds" })
  @Column({ type: "int", nullable: true })
  durationSec?: number | null;

  @ApiProperty({ description: "RPE or intensity" })
  @Column({ type: "float", nullable: true })
  rpe?: number | null;

  @ApiProperty({ description: "User notes" })
  @Column({ type: "text", nullable: true })
  notes?: string | null;
}
