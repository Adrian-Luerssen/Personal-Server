import { Injectable } from "@nestjs/common";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Routine } from "./routine.entity";

@Injectable()
export class RoutinesService extends TypeOrmCrudService<Routine> {
  constructor(@InjectRepository(Routine) repo) {
    super(repo);
  }
}
