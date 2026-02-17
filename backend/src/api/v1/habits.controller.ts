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
 * Agent-accessible habits endpoints.
 * Authenticated via X-API-Key header (AgentKeyGuard).
 * Scope required: habits:read
 *
 * NOTE: Habits module is being implemented in parallel (task-07).
 * These are placeholder endpoints that will be wired to HabitsService
 * once that module is merged.
 */
@ApiTags('API v1 - Habits')
@ApiSecurity('api-key')
@UseGuards(AgentKeyGuard, ScopeGuard)
@Controller('api/v1/habits')
export class AgentHabitsController {
  // TODO: inject HabitsService once task-07 is merged

  @ApiOperation({ summary: 'Get habits list (coming soon)' })
  @Get()
  @RequireScope('habits:read')
  @ApiKey()
  async getHabits() {
    return { message: 'Habits module coming soon', data: [] };
  }

  @ApiOperation({ summary: 'Get habit entries (coming soon)' })
  @Get('entries')
  @RequireScope('habits:read')
  @ApiKey()
  async getHabitEntries() {
    return { message: 'Habits module coming soon', data: [] };
  }

  @ApiOperation({ summary: 'Get today\'s habit completions (coming soon)' })
  @Get('today')
  @RequireScope('habits:read')
  @ApiKey()
  async getTodayHabits() {
    return { message: 'Habits module coming soon', data: [] };
  }
}
