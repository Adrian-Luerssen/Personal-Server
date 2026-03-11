import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CategoriesService } from "./categories.service";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";

@ApiTags("Finance - Categories")
@ApiBearerAuth("access-token")
@Controller("finance/categories")
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: "Get all categories" })
  getAll(@ReqUser() account: Account) {
    return this.service.findAll(account);
  }

  @Get("tree")
  @ApiOperation({ summary: "Get categories as tree" })
  findTree(@ReqUser() account: Account) {
    return this.service.findTree(account);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get category by ID" })
  getOne(@ReqUser() account: Account, @Param("id") id: string) {
    return this.service.findOne(account, id);
  }

  @Post()
  @ApiOperation({ summary: "Create category" })
  create(@ReqUser() account: Account, @Body() body: any) {
    return this.service.create(account, body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update category" })
  update(@ReqUser() account: Account, @Param("id") id: string, @Body() body: any) {
    return this.service.update(account, id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete category" })
  remove(@ReqUser() account: Account, @Param("id") id: string) {
    return this.service.remove(account, id);
  }
}
