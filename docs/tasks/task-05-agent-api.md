# Task: Agent API Implementation

**Agent**: Development Agent 5
**Priority**: HIGH
**Estimated Effort**: 11h

## Objective
Create an API layer for AI agents to access personal data, with API key authentication and MCP support.

## Repository
- **Path**: `/home/clawdia/.openclaw/workspace/Personal-Server`
- **Backend**: `backend/src/`

## Tasks

### 1. Agent Key Entity + Migrations (1h)

```typescript
// src/agents/entities/agent-key.entity.ts
@Entity('agent_keys')
export class AgentKey extends AbstractAccountOwnedEntity {
  @Column() name: string; // "Claudia", "Home Assistant"
  
  @Column() keyHash: string; // bcrypt hash
  
  @Column() keyPrefix: string; // "ps_live_abc12345" (first 12 chars)
  
  @Column('simple-array') scopes: string[];
  // ['workout:read', 'finance:read', 'habits:read', 'music:read', 'dashboard:read']
  
  @Column({ default: true }) isActive: boolean;
  
  @Column({ nullable: true }) lastUsedAt: Date;
  
  @Column({ nullable: true }) expiresAt: Date;
  
  @Column('jsonb', { nullable: true }) 
  metadata: Record<string, any>; // { agentType: 'ai', version: '1.0' }
  
  @Column({ default: 0 }) requestCount: number;
}
```

### 2. API Key Service (2h)

```typescript
// src/agents/agent-keys.service.ts
@Injectable()
export class AgentKeysService {
  // Generate a new API key
  async createKey(
    account: Account, 
    dto: CreateAgentKeyDto
  ): Promise<{ key: string; agentKey: AgentKey }> {
    // Generate: ps_live_ + 32 random chars
    const rawKey = `ps_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = await bcrypt.hash(rawKey, 10);
    const keyPrefix = rawKey.slice(0, 16);
    
    const agentKey = await this.repo.save({
      accountId: account.id,
      name: dto.name,
      keyHash,
      keyPrefix,
      scopes: dto.scopes,
      metadata: dto.metadata,
    });
    
    // Return raw key ONLY ONCE
    return { key: rawKey, agentKey };
  }
  
  // Validate API key
  async validateKey(rawKey: string): Promise<AgentKey | null> {
    const prefix = rawKey.slice(0, 16);
    const candidates = await this.repo.find({ where: { keyPrefix: prefix, isActive: true } });
    
    for (const candidate of candidates) {
      if (await bcrypt.compare(rawKey, candidate.keyHash)) {
        // Update last used
        await this.repo.update(candidate.id, { 
          lastUsedAt: new Date(),
          requestCount: () => 'requestCount + 1',
        });
        return candidate;
      }
    }
    return null;
  }
  
  // List keys (masked)
  async listKeys(accountId: string): Promise<AgentKey[]> {
    return this.repo.find({ 
      where: { accountId },
      select: ['id', 'name', 'keyPrefix', 'scopes', 'isActive', 'lastUsedAt', 'createdAt'],
    });
  }
  
  // Revoke key
  async revokeKey(accountId: string, keyId: string): Promise<void> {
    await this.repo.update({ id: keyId, accountId }, { isActive: false });
  }
}
```

### 3. Agent Auth Guard (1h)

```typescript
// src/agents/guards/agent-key.guard.ts
@Injectable()
export class AgentKeyGuard implements CanActivate {
  constructor(private agentKeysService: AgentKeysService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    
    if (!apiKey) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }
    
    const agentKey = await this.agentKeysService.validateKey(apiKey);
    if (!agentKey) {
      throw new UnauthorizedException('Invalid API key');
    }
    
    if (agentKey.expiresAt && agentKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired');
    }
    
    // Attach to request for scope checking
    request.agentKey = agentKey;
    request.accountId = agentKey.accountId;
    return true;
  }
}

// src/agents/decorators/require-scope.decorator.ts
export const RequireScope = (...scopes: string[]) => SetMetadata('scopes', scopes);

// src/agents/guards/scope.guard.ts
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.get<string[]>('scopes', context.getHandler());
    if (!requiredScopes) return true;
    
    const request = context.switchToHttp().getRequest();
    const agentKey = request.agentKey;
    
    return requiredScopes.every(scope => agentKey.scopes.includes(scope));
  }
}
```

### 4. REST API v1 Endpoints (4h)

Create versioned API endpoints for agents:

```typescript
// src/api/v1/api-v1.module.ts
@Module({
  imports: [WorkoutModule, FinanceModule, HabitsModule, DashboardModule],
  controllers: [
    AgentWorkoutController,
    AgentFinanceController,
    AgentHabitsController,
    AgentDashboardController,
  ],
})
export class ApiV1Module {}

// src/api/v1/workout.controller.ts
@Controller('api/v1/workout')
@UseGuards(AgentKeyGuard, ScopeGuard)
export class AgentWorkoutController {
  @Get('sessions')
  @RequireScope('workout:read')
  async getSessions(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit = 10,
  ): Promise<WorkoutSessionDto[]> {}
  
  @Get('sessions/:id')
  @RequireScope('workout:read')
  async getSession(@Param('id') id: string): Promise<WorkoutSessionDto> {}
  
  @Get('stats')
  @RequireScope('workout:read')
  async getStats(
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
  ): Promise<WorkoutStatsDto> {}
  
  @Get('exercises')
  @RequireScope('workout:read')
  async getExercises(): Promise<ExerciseDto[]> {}
  
  @Post('sessions')
  @RequireScope('workout:write')
  async logWorkout(@Body() dto: CreateWorkoutDto): Promise<WorkoutSessionDto> {}
}

// Similar controllers for:
// - AgentFinanceController (/api/v1/finance/*)
// - AgentHabitsController (/api/v1/habits/*)
// - AgentDashboardController (/api/v1/dashboard/*)
```

### 5. Agent Key Management UI Endpoints (1h)

```typescript
// src/agents/agent-keys.controller.ts
@Controller('agents/keys')
@UseGuards(AuthGuard) // Regular JWT auth for managing keys
export class AgentKeysController {
  @Post()
  async createKey(@ReqUser() account: Account, @Body() dto: CreateAgentKeyDto) {
    return this.service.createKey(account, dto);
  }
  
  @Get()
  async listKeys(@ReqUser() account: Account) {
    return this.service.listKeys(account.id);
  }
  
  @Delete(':id')
  async revokeKey(@ReqUser() account: Account, @Param('id') id: string) {
    return this.service.revokeKey(account.id, id);
  }
  
  @Patch(':id')
  async updateKey(
    @ReqUser() account: Account, 
    @Param('id') id: string,
    @Body() dto: UpdateAgentKeyDto,
  ) {
    return this.service.updateKey(account.id, id, dto);
  }
}
```

### 6. MCP Server (Optional, 2h if time permits)

```typescript
// src/mcp/mcp.server.ts
// Can be run as separate process

import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({
  name: 'personal-server',
  version: '1.0.0',
}, {
  capabilities: { tools: {}, resources: {} },
});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_workouts',
      description: 'Get recent workout sessions',
      inputSchema: { ... },
    },
    {
      name: 'get_spending',
      description: 'Get spending summary',
      inputSchema: { ... },
    },
    // ...
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  // Call internal API
});
```

## Available Scopes

```typescript
const SCOPES = {
  'workout:read': 'Read workout sessions, exercises, bodyweight',
  'workout:write': 'Create/update workout data',
  'finance:read': 'Read transactions, wallets, categories',
  'finance:write': 'Create/update financial data',
  'habits:read': 'Read habits and entries',
  'habits:write': 'Create/update habit data',
  'music:read': 'Read Spotify listening history',
  'dashboard:read': 'Read cross-domain analytics',
  'profile:read': 'Read basic profile info',
};
```

## Security Notes

1. Never log full API keys, only prefixes
2. Use constant-time comparison for key validation (bcrypt does this)
3. Rate limit per key (implement later if needed)
4. Audit log all API access (implement later if needed)

## Testing

```bash
# Create key via UI/API
curl -X POST /agents/keys -d '{"name":"Test","scopes":["workout:read"]}'
# Returns: { "key": "ps_live_xxx...", "agentKey": {...} }

# Use key
curl -H "X-API-Key: ps_live_xxx..." /api/v1/workout/sessions
```

## Deliverables
1. AgentKey entity + migration
2. AgentKeysService with create/validate/revoke
3. AgentKeyGuard + ScopeGuard
4. REST API v1 module with all endpoints
5. Key management endpoints
6. (Optional) MCP server
