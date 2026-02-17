import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AgentKeyGuard } from '../../agents/guards/agent-key.guard';
import { ScopeGuard } from '../../agents/guards/scope.guard';
import { RequireScope } from '../../agents/decorators/require-scope.decorator';
import { ReqAgentKey } from '../../agents/decorators/req-agent-key.decorator';
import { AgentKey } from '../../agents/entities/agent-key.entity';
import { WorkoutSessionsService } from '../../workout/sessions/sessions.service';
import { WorkoutExercisesService } from '../../workout/exercises/exercises.service';
import { BodyWeightService } from '../../workout/bodyweight/bodyweight.service';
import { ApiKey } from '../../system/auth/auth.decorator';

/**
 * Agent-accessible workout endpoints.
 * Authenticated via X-API-Key header (AgentKeyGuard).
 * Scope required: workout:read
 */
@ApiTags('API v1 - Workout')
@ApiSecurity('api-key')
@UseGuards(AgentKeyGuard, ScopeGuard)
@Controller('api/v1/workout')
export class AgentWorkoutController {
  constructor(
    private readonly sessionsService: WorkoutSessionsService,
    private readonly exercisesService: WorkoutExercisesService,
    private readonly bodyweightService: BodyWeightService,
  ) {}

  @ApiOperation({ summary: 'Get paginated workout sessions' })
  @Get('sessions')
  @RequireScope('workout:read')
  @ApiKey()
  async getSessions(
    @ReqAgentKey() key: AgentKey,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    // Build a minimal Account-like object from the key's accountId
    const fakeAccount = { id: key.accountId } as any;
    return this.sessionsService.getPaginatedSessions(fakeAccount, page, limit);
  }

  @ApiOperation({ summary: 'Get recent workout sessions (last N)' })
  @Get('sessions/recent')
  @RequireScope('workout:read')
  @ApiKey()
  async getRecentSessions(
    @ReqAgentKey() key: AgentKey,
    @Query('limit') limit: number = 5,
  ) {
    const fakeAccount = { id: key.accountId } as any;
    return this.sessionsService.getRecentSessions(fakeAccount, limit);
  }

  @ApiOperation({ summary: 'Get the current active session (if any)' })
  @Get('sessions/active')
  @RequireScope('workout:read')
  @ApiKey()
  async getActiveSession(@ReqAgentKey() key: AgentKey) {
    const fakeAccount = { id: key.accountId } as any;
    return this.sessionsService.getActiveSession(fakeAccount);
  }

  @ApiOperation({ summary: 'Get a workout session by ID' })
  @Get('sessions/:id')
  @RequireScope('workout:read')
  @ApiKey()
  async getSession(
    @ReqAgentKey() key: AgentKey,
    @Param('id') id: string,
  ) {
    // Use paginated which also returns all sessions; alternatively find directly
    const fakeAccount = { id: key.accountId } as any;
    const { sessions } = await this.sessionsService.getPaginatedSessions(
      fakeAccount,
      1,
      1000,
    );
    const session = sessions.find((s: any) => s.id === id);
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  @ApiOperation({ summary: 'Get workout stats summary' })
  @Get('stats')
  @RequireScope('workout:read')
  @ApiKey()
  async getStats(@ReqAgentKey() key: AgentKey) {
    const fakeAccount = { id: key.accountId } as any;
    const {
      totalWorkouts,
      totalSets,
      totalReps,
      totalVolume,
      totalTimeSeconds,
    } = await this.sessionsService.getPaginatedSessions(fakeAccount, 1, 1);
    return { totalWorkouts, totalSets, totalReps, totalVolume, totalTimeSeconds };
  }

  @ApiOperation({ summary: 'Get all exercises' })
  @Get('exercises')
  @RequireScope('workout:read')
  @ApiKey()
  async getExercises() {
    return this.exercisesService.getAllExercises();
  }

  @ApiOperation({ summary: 'Get bodyweight entries' })
  @Get('bodyweight')
  @RequireScope('workout:read')
  @ApiKey()
  async getBodyweight() {
    return this.bodyweightService.getAllEntries();
  }
}
