import { Column, Entity, Index, OneToMany } from "typeorm";
import { AbstractAccountOwnedEntity } from "../../system/common/AbstractAccountOwnedEntity";
import { ApiProperty } from "@nestjs/swagger";
import { WorkoutExercise } from "../exercises/exercise.entity";

@Entity()
@Index(["accountId", "name"], { unique: true })
export class WorkoutCategory extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: "Category name" })
  @Column({ type: "varchar", length: 200 })
  name: string;

  @ApiProperty({ description: "Optional description", required: false })
  @Column({ type: "text", nullable: true })
  description?: string;

  @ApiProperty({ description: "Category color in HEX format" })
  @Column({ type: "varchar", length: 7, default: "#FFFFFF" })
  color: string;

  @OneToMany(() => WorkoutExercise, (ex) => ex.category)
  exercises?: WorkoutExercise[];
}
