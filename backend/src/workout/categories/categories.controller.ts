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
import { WorkoutCategory } from "./category.entity";
import { WorkoutCategoriesService } from "./categories.service";
import { CrudAccountOwnedEntity } from "../../system/common/CrudEntity.decorator";

@CrudAccountOwnedEntity({
  model: { type: WorkoutCategory },
})
@ApiBearerAuth("access-token")
@Controller("workout/categories")
export class WorkoutCategoriesController
  implements CrudController<WorkoutCategory>
{
  constructor(public service: WorkoutCategoriesService) {}
  @Get()
  async getAll() {
    return this.service.getAllCategories();
  }

  @Post()
  async create(@Body() body: { name: string }) {
    return this.service.createCategory(body);
  }

  @Put(":categoryId")
  async update(
    @Param("categoryId") categoryId: string,
    @Body() body: { name: string }
  ) {
    return this.service.updateCategory(categoryId, body);
  }

  @Delete(":categoryId")
  async delete(@Param("categoryId") categoryId: string) {
    return this.service.deleteCategory(categoryId);
  }
}
