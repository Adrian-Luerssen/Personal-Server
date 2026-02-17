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
import { DashboardService } from '../../dashboard/dashboard.service';
import { resolveTimeframe } from '../../utils/utils';
import { ApiKey } from '../../system/auth/auth.decorator';

/**
 * Agent-accessible dashboard/analytics endpoints.
 * Authenticated via X-API-Key header (AgentKeyGuard).
 * Scope required: dashboard:read
 */
@ApiTags('API v1 - Dashboard')
@ApiSecurity('api-key')
@UseGuards(AgentKeyGuard, ScopeGuard)
@Controller('api/v1/dashboard')
export class AgentDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: 'Get Spotify streams that occurred during workout sessions' })
  @ApiQuery({ name: 'timeframe', required: false, description: 'Preset: today, 7d, 30d, 1y, all' })
  @ApiQuery({ name: 'from', required: false, description: 'ISO start datetime' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO end datetime' })
  @Get('streams/workout')
  @RequireScope('dashboard:read')
  @ApiKey()
  async getStreamsDuringWorkouts(
    @ReqAgentKey() key: AgentKey,
    @Query('timeframe') timeframe?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fakeAccount = { id: key.accountId } as any;
    const { start, end } = resolveTimeframe(timeframe, from, to);
    return this.dashboardService.getSpotifyStreamsDuringWorkouts(fakeAccount, {
      from: start,
      to: end,
    });
  }
}
