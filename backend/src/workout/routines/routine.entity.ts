import { Column, Entity, Index, OneToMany } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { ApiProperty } from "@nestjs/swagger";
import { RoutineExercise } from "src/workout/routines/routine-exercise.entity";

@Entity()
@Index(["accountId", "name"], { unique: true })
export class Routine extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Routine name" })
  @Column({ type: "varchar", length: 200 })
  name: string;

  @ApiProperty({ description: "Optional description" })
  @Column({ type: "text", nullable: true })
  description?: string;

  @OneToMany(() => RoutineExercise, (re) => re.routine)
  exercises?: RoutineExercise[];
}
