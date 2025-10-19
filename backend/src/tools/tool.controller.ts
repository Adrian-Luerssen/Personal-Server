import { Controller, Param, Patch, Get, Query } from '@nestjs/common';
import { CrudController } from '@nestjsx/crud';

import { Tool } from './tool.entity';
import { ToolService } from './tool.service';
import { CrudEntity } from '../system/common/CrudEntity.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@CrudEntity({
  model: {
    type: Tool,
  },
})
@ApiBearerAuth('access-token')
@Controller('tool')
export class ToolController implements CrudController<Tool> {
  constructor(public service: ToolService) {}

  @Get('/level2-latest')
  async getLevel2Latest() {
    return this.service.getLevel2Latest();
  }
}
