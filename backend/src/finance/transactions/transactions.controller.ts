import {
  CacheInterceptor,
  CacheTTL,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { TransactionsService, TransactionFilters } from "./transactions.service";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";

@ApiTags("Finance - Transactions")
@ApiBearerAuth("access-token")
@Controller("finance/transactions")
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get("summary")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  @ApiOperation({ summary: "Get financial summary / analytics" })
  @ApiQuery({ name: "walletId", required: false })
  @ApiQuery({ name: "categoryId", required: false })
  @ApiQuery({ name: "from", required: false, description: "ISO date string" })
  @ApiQuery({ name: "to", required: false, description: "ISO date string" })
  @ApiQuery({ name: "isIncome", required: false, type: Boolean })
  getSummary(
    @ReqUser() account: Account,
    @Query("walletId") walletId?: string,
    @Query("categoryId") categoryId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("isIncome") isIncome?: string
  ) {
    const filters: TransactionFilters = {
      walletId,
      categoryId,
      from,
      to,
      isIncome: isIncome !== undefined ? isIncome === "true" : undefined,
    };
    return this.service.getSummary(account, filters);
  }

  @Get()
  @ApiOperation({ summary: "Get transactions (paginated, filterable)" })
  @ApiQuery({ name: "walletId", required: false })
  @ApiQuery({ name: "categoryId", required: false })
  @ApiQuery({ name: "from", required: false, description: "ISO date string" })
  @ApiQuery({ name: "to", required: false, description: "ISO date string" })
  @ApiQuery({ name: "isIncome", required: false, type: Boolean })
  @ApiQuery({ name: "minAmount", required: false, type: Number })
  @ApiQuery({ name: "maxAmount", required: false, type: Number })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  getAll(
    @ReqUser() account: Account,
    @Query("walletId") walletId?: string,
    @Query("categoryId") categoryId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("isIncome") isIncome?: string,
    @Query("minAmount") minAmount?: string,
    @Query("maxAmount") maxAmount?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const filters: TransactionFilters = {
      walletId,
      categoryId,
      from,
      to,
      isIncome: isIncome !== undefined ? isIncome === "true" : undefined,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    };
    return this.service.findAll(account, filters);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get transaction by ID" })
  getOne(@ReqUser() account: Account, @Param("id") id: string) {
    return this.service.findOne(account, id);
  }

  @Post("transfer")
  @ApiOperation({ summary: "Create a transfer between wallets" })
  createTransfer(@ReqUser() account: Account, @Body() body: any) {
    return this.service.createTransfer(account, body);
  }

  @Post()
  @ApiOperation({ summary: "Create transaction" })
  create(@ReqUser() account: Account, @Body() body: any) {
    return this.service.create(account, body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update transaction" })
  update(@ReqUser() account: Account, @Param("id") id: string, @Body() body: any) {
    return this.service.update(account, id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete transaction" })
  remove(@ReqUser() account: Account, @Param("id") id: string) {
    return this.service.remove(account, id);
  }
}
