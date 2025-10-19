import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Tool } from './tool.entity';

@Injectable()
export class ToolService extends TypeOrmCrudService<Tool> {
  constructor(@InjectRepository(Tool) repo) {
    super(repo);
  }

  async getLevel2Latest() {
    return this.repo.findOne({
      where: {
        program: 'LEVEL_2_AUTO',
      },
      order: {
        createdAt: 'DESC',
        updatedAt: 'DESC',
      },
    });
  }
}
