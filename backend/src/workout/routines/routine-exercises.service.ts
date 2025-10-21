import { Injectable } from "@nestjs/common";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { RoutineExercise } from "./routine-exercise.entity";

@Injectable()
export class RoutineExercisesService extends TypeOrmCrudService<RoutineExercise> {
  constructor(@InjectRepository(RoutineExercise) repo) {
    super(repo);
  }
}
