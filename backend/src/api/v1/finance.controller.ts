import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AgentKeyGuard } from '../../agents/guards/agent-key.guard';
import { ScopeGuard } from '../../agents/guards/scope.guard';
import { RequireScope } from '../../agents/decorators/require-scope.decorator';
import { ReqAgentKey } from '../../agents/decorators/req-agent-key.decorator';
import { AgentKey } from '../../agents/entities/agent-key.entity';
import { ApiKey } from '../../system/auth/auth.decorator';
import { TransactionsService } from '../../finance/transactions/transactions.service';
import { WalletsService } from '../../finance/wallets/wallets.service';
import { CategoriesService } from '../../finance/categories/categories.service';
import { SubscriptionsService } from '../../finance/subscriptions/subscriptions.service';

/**
 * Agent-accessible finance endpoints.
 * Authenticated via X-API-Key header (AgentKeyGuard).
 * Scope required: finance:read
 */
@ApiTags('API v1 - Finance')
@ApiSecurity('api-key')
@UseGuards(AgentKeyGuard, ScopeGuard)
@Controller('v1/finance')
export class AgentFinanceController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly walletsService: WalletsService,
    private readonly categoriesService: CategoriesService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @ApiOperation({ summary: 'Get paginated transactions with optional filters' })
  @Get('transactions')
  @RequireScope('finance:read')
  @ApiKey()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'walletId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date start' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date end' })
  @ApiQuery({ name: 'isIncome', required: false, description: 'true or false' })
  @ApiQuery({ name: 'search', required: false })
  async getTransactions(
    @ReqAgentKey() key: AgentKey,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('walletId') walletId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('isIncome') isIncome?: string,
    @Query('search') search?: string,
  ) {
    const account = { id: key.accountId } as any;
    return this.transactionsService.findAll(account, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      walletId,
      categoryId,
      from,
      to,
      isIncome: isIncome === 'true' ? true : isIncome === 'false' ? false : undefined,
      search,
    });
  }

  @ApiOperation({ summary: 'Get financial summary with category breakdown' })
  @Get('transactions/summary')
  @RequireScope('finance:read')
  @ApiKey()
  @ApiQuery({ name: 'walletId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getSummary(
    @ReqAgentKey() key: AgentKey,
    @Query('walletId') walletId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const account = { id: key.accountId } as any;
    return this.transactionsService.getSummary(account, {
      walletId,
      categoryId,
      from,
      to,
    });
  }

  @ApiOperation({ summary: 'Get all wallets with computed balances' })
  @Get('wallets')
  @RequireScope('finance:read')
  @ApiKey()
  async getWallets(@ReqAgentKey() key: AgentKey) {
    const account = { id: key.accountId } as any;
    return this.walletsService.findAll(account);
  }

  @ApiOperation({ summary: 'Get spending categories as a tree' })
  @Get('categories')
  @RequireScope('finance:read')
  @ApiKey()
  async getCategories(@ReqAgentKey() key: AgentKey) {
    const account = { id: key.accountId } as any;
    return this.categoriesService.findTree(account);
  }

  @ApiOperation({ summary: 'Get all subscriptions' })
  @Get('subscriptions')
  @RequireScope('finance:read')
  @ApiKey()
  async getSubscriptions(@ReqAgentKey() key: AgentKey) {
    return this.subscriptionsService.findAll(key.accountId);
  }
}
