import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AgentKeyGuard } from '../../agents/guards/agent-key.guard';
import { ScopeGuard } from '../../agents/guards/scope.guard';
import { RequireScope } from '../../agents/decorators/require-scope.decorator';
import { ApiKey } from '../../system/auth/auth.decorator';

/**
 * Agent-accessible finance endpoints.
 * Authenticated via X-API-Key header (AgentKeyGuard).
 * Scope required: finance:read
 *
 * NOTE: Finance module is being implemented in parallel (task-06).
 * These are placeholder endpoints that will be wired to FinanceService
 * once that module is merged.
 */
@ApiTags('API v1 - Finance')
@ApiSecurity('api-key')
@UseGuards(AgentKeyGuard, ScopeGuard)
@Controller('api/v1/finance')
export class AgentFinanceController {
  // TODO: inject FinanceService once task-06 is merged

  @ApiOperation({ summary: 'Get transactions (coming soon)' })
  @Get('transactions')
  @RequireScope('finance:read')
  @ApiKey()
  async getTransactions() {
    return { message: 'Finance module coming soon', data: [] };
  }

  @ApiOperation({ summary: 'Get wallets (coming soon)' })
  @Get('wallets')
  @RequireScope('finance:read')
  @ApiKey()
  async getWallets() {
    return { message: 'Finance module coming soon', data: [] };
  }

  @ApiOperation({ summary: 'Get spending categories (coming soon)' })
  @Get('categories')
  @RequireScope('finance:read')
  @ApiKey()
  async getCategories() {
    return { message: 'Finance module coming soon', data: [] };
  }
}
