import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from "@nestjs/common";
import { CrudController } from "@nestjsx/crud";
import { ApiBearerAuth } from "@nestjs/swagger";
import { BodyWeightEntry } from "./bodyweight.entity";
import { BodyWeightService } from "./bodyweight.service";
import { CrudAccountOwnedEntity } from "../../system/common/CrudEntity.decorator";

@CrudAccountOwnedEntity({
  model: { type: BodyWeightEntry },
})
@ApiBearerAuth("access-token")
@Controller("workout/bodyweight")
export class BodyWeightController implements CrudController<BodyWeightEntry> {
  constructor(public service: BodyWeightService) {}
  @Get()
  async getAll() {
    return this.service.getAllEntries();
  }

  @Post()
  async create(@Body() body: { date: string; weight: number }) {
    return this.service.createEntry(body);
  }

  @Put(":entryId")
  async update(
    @Param("entryId") entryId: string,
    @Body() body: { date: string; weight: number }
  ) {
    return this.service.updateEntry(entryId, body);
  }

  @Delete(":entryId")
  async delete(@Param("entryId") entryId: string) {
    return this.service.deleteEntry(entryId);
  }
}
