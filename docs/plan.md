# Personal Server - Data Integration Plan

**Author**: Claudia (PM Agent)  
**Date**: 2026-02-17  
**Status**: Active Development
**Version**: 2.0

---

## Executive Summary

This plan outlines the integration of Adrian's personal data sources into the Personal Server NestJS backend. The server already has a solid foundation with authentication, accounts, music tracking (Spotify), and a **fully functional workout module with FitNotes import**. 

We need to:
1. Add two new modules (Finance, Habits)
2. Enhance the Dashboard for cross-domain analytics
3. **Improve FitNotes import UX** (existing feature needs polish)
4. **Add Agent API** - Enable AI agents to access personal data via MCP + REST

---

## Current State Analysis

### Existing Infrastructure ✅

| Component | Status | Notes |
|-----------|--------|-------|
| NestJS Backend | ✅ Complete | TypeORM, PostgreSQL, JWT auth |
| Account System | ✅ Complete | Multi-user support, MFA |
| Music Module | ✅ Complete | Spotify streams, tracks |
| **Workout Module** | ✅ **Complete** | Categories, exercises, sessions, sets, routines, bodyweight |
| **FitNotes Import** | 🔶 **Needs Improvement** | Works but UX is poor |
| Dashboard | 🔶 Partial | Only Spotify + workout cross-analysis |

### Data Sources to Integrate

| Source | Format | Records | Status |
|--------|--------|---------|--------|
| FitNotes (Gym) | SQLite | 11,304 sets | ✅ Import exists (needs UX fixes) |
| Cashew (Finance) | SQLite | 793 transactions | ❌ Needs module |
| HabitShare (Habits) | CSV | 5,130 entries | ❌ Needs module |

---

## NEW: Phase 0 - FitNotes Import Improvements (Priority: HIGH)

### Current Issues Identified

#### Backend Problems
1. **No progress feedback** - Import runs synchronously, user sees loading spinner indefinitely
2. **No preview/validation** - User can't see what will be imported before committing
3. **No detailed summary** - Just returns `{ status: "ok" }`, no counts of created/skipped records
4. **No transaction rollback** - If import fails halfway, partial data remains in DB
5. **Fragile deduplication** - Uses order-based matching which can be unreliable
6. **No selective import** - All or nothing, can't import just bodyweight or just exercises

#### Frontend Problems  
1. **No progress indicator** - Just a spinner, no progress bar or stage info
2. **No preview UI** - Can't see what's in the file before importing
3. **No import summary** - Just "success", no details on what was imported
4. **No selective controls** - Can't choose what to import
5. **Basic styling** - Functional but not polished

### Proposed Improvements

#### 0.1 Backend: Two-Phase Import with Preview

```typescript
// New endpoints
POST /workout/import/fitnotes/preview   // Analyze file, return preview
POST /workout/import/fitnotes/execute   // Execute import with options

// Preview response
interface FitNotesPreview {
  file: { name: string; size: number; valid: boolean };
  counts: {
    categories: { total: number; new: number; existing: number };
    exercises: { total: number; new: number; existing: number };
    sessions: { total: number; new: number; existing: number };
    sets: { total: number; new: number; existing: number };
    bodyweight: { total: number; new: number; existing: number };
  };
  dateRange: { earliest: string; latest: string };
  topExercises: Array<{ name: string; count: number }>;
  warnings: string[]; // e.g., "3 sets have invalid dates"
}

// Execute request
interface FitNotesExecuteRequest {
  previewId: string; // Reference to cached preview
  options: {
    importCategories: boolean;
    importExercises: boolean;
    importSessions: boolean;
    importBodyweight: boolean;
    overwriteExisting: boolean;
    dateFrom?: string; // Optional date filter
    dateTo?: string;
  };
}

// Execute response (with progress via SSE)
interface FitNotesExecuteProgress {
  stage: 'categories' | 'exercises' | 'sessions' | 'bodyweight' | 'complete';
  progress: number; // 0-100
  current: number;
  total: number;
  message: string;
}
```

#### 0.2 Backend: Progress Streaming via SSE

```typescript
// Use Server-Sent Events for real-time progress
@Sse('fitnotes/execute/:previewId')
async executeImport(
  @Param('previewId') previewId: string,
  @Body() options: FitNotesExecuteOptions,
): Observable<MessageEvent> {
  return this.importService.executeWithProgress(previewId, options);
}
```

#### 0.3 Backend: Transaction Safety

```typescript
// Wrap entire import in a transaction
async executeImport(account: Account, previewId: string, options: Options) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  
  try {
    // ... import logic using queryRunner.manager instead of repos
    await queryRunner.commitTransaction();
    return { status: 'ok', summary };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

#### 0.4 Frontend: Enhanced Import UI

```jsx
// New import flow:
// 1. File selection → 2. Preview → 3. Options → 4. Progress → 5. Summary

// Preview step shows:
// - File info (name, size, valid)
// - What will be imported (categories, exercises, sessions, etc.)
// - Date range of data
// - Warnings (if any)

// Options step allows:
// - Toggle each data type on/off
// - Date range filter
// - Overwrite existing toggle

// Progress step shows:
// - Progress bar
// - Current stage (Importing exercises... 45/128)
// - Elapsed time

// Summary step shows:
// - Created vs skipped counts per category
// - Total records imported
// - Any errors/warnings
```

### Implementation Tasks

| Task | Effort | Priority |
|------|--------|----------|
| Backend: Preview endpoint | 2h | P0 |
| Backend: SSE progress streaming | 2h | P0 |
| Backend: Transaction wrapper | 1h | P0 |
| Backend: Selective import options | 1h | P1 |
| Frontend: Multi-step import wizard | 3h | P0 |
| Frontend: Progress bar component | 1h | P0 |
| Frontend: Summary view | 1h | P1 |

---

## NEW: Phase 4 - Agent API (Priority: HIGH)

### Overview

Adrian wants AI agents (like Claudia, or potentially public agents) to access personal data. This requires:
1. **Authentication mechanism** for agents (not user JWT tokens)
2. **Authorization/scopes** to control what each agent can access
3. **API design** optimized for AI agent consumption

### Recommended Architecture

After analyzing the use case, I recommend a **hybrid approach**:

1. **MCP (Model Context Protocol)** - Primary for AI agents
   - Purpose-built for AI↔tool communication
   - Supports natural language tool descriptions
   - Built-in streaming for large responses
   - Growing ecosystem (Anthropic Claude, etc.)

2. **REST API with API Keys** - Fallback/universal access
   - Works with any HTTP client
   - Simple to implement and debug
   - Good for non-MCP agents or direct integrations

### 4.1 Agent Authentication

#### API Keys for Agents

```typescript
// src/agents/entities/agent-key.entity.ts
@Entity('agent_keys')
export class AgentKey extends AbstractAccountOwnedEntity {
  @Column() name: string; // "Claudia", "Home Assistant", etc.
  
  @Column() keyHash: string; // bcrypt hash of the API key
  
  @Column() keyPrefix: string; // First 8 chars for identification (ps_live_abc...)
  
  @Column('simple-array') scopes: string[]; // ['workout:read', 'finance:read', etc.]
  
  @Column({ default: true }) isActive: boolean;
  
  @Column({ nullable: true }) lastUsedAt: Date;
  
  @Column({ nullable: true }) expiresAt: Date;
  
  @Column('jsonb', { nullable: true }) metadata: Record<string, any>; // Agent type, version, etc.
}
```

#### API Key Format
```
ps_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  (production)
ps_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  (development)
```

#### Key Management Endpoints

```typescript
POST   /api/agents/keys          // Create new API key
GET    /api/agents/keys          // List keys (masked)
DELETE /api/agents/keys/:id      // Revoke key
PATCH  /api/agents/keys/:id      // Update scopes/name
```

### 4.2 Authorization Scopes

```typescript
// Available scopes
const AGENT_SCOPES = {
  // Workout
  'workout:read': 'Read workout sessions, exercises, bodyweight',
  'workout:write': 'Create/update workout data',
  
  // Finance
  'finance:read': 'Read transactions, wallets, categories',
  'finance:write': 'Create/update financial data',
  'finance:read:summary': 'Read only aggregated summaries (no transaction details)',
  
  // Habits
  'habits:read': 'Read habits and entries',
  'habits:write': 'Create/update habit data',
  
  // Music
  'music:read': 'Read Spotify listening history',
  
  // Dashboard
  'dashboard:read': 'Read cross-domain analytics',
  
  // Profile
  'profile:read': 'Read basic profile info',
};
```

### 4.3 MCP Server Implementation

```typescript
// src/mcp/mcp.module.ts
// Implement as a separate process or integrated into NestJS

// MCP Tools (callable by AI agents)
const MCP_TOOLS = [
  {
    name: 'get_workouts',
    description: 'Get workout sessions with exercises and sets. Can filter by date range.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
    },
  },
  {
    name: 'get_workout_stats',
    description: 'Get workout statistics: total volume, session count, streaks, PRs.',
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['week', 'month', 'year', 'all'] },
      },
    },
  },
  {
    name: 'get_spending',
    description: 'Get spending summary by category or time period.',
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['week', 'month', 'year'] },
        category: { type: 'string', description: 'Optional category filter' },
      },
    },
  },
  {
    name: 'get_habits',
    description: 'Get habit tracking data with streaks and success rates.',
    inputSchema: {
      type: 'object',
      properties: {
        habit: { type: 'string', description: 'Optional habit name filter' },
        from: { type: 'string' },
        to: { type: 'string' },
      },
    },
  },
  {
    name: 'get_correlations',
    description: 'Get interesting correlations between different data sources (e.g., gym attendance vs alcohol habits, spending patterns vs workout days).',
    inputSchema: {
      type: 'object',
      properties: {
        domains: { 
          type: 'array', 
          items: { type: 'string', enum: ['workout', 'finance', 'habits', 'music'] },
          description: 'Which domains to correlate',
        },
      },
    },
  },
  {
    name: 'log_workout',
    description: 'Log a new workout session with exercises and sets.',
    inputSchema: {
      type: 'object',
      required: ['exercises'],
      properties: {
        date: { type: 'string', description: 'Date (YYYY-MM-DD), defaults to today' },
        exercises: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              sets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    reps: { type: 'number' },
                    weight: { type: 'number', description: 'Weight in kg' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
];

// MCP Resources (data the agent can read)
const MCP_RESOURCES = [
  {
    uri: 'personal://workout/recent',
    name: 'Recent Workouts',
    description: 'Last 5 workout sessions with full details',
    mimeType: 'application/json',
  },
  {
    uri: 'personal://finance/summary',
    name: 'Financial Summary',
    description: 'Current month spending summary by category',
    mimeType: 'application/json',
  },
  {
    uri: 'personal://habits/streaks',
    name: 'Habit Streaks',
    description: 'Current streaks for all tracked habits',
    mimeType: 'application/json',
  },
];
```

### 4.4 REST API for Agents

```typescript
// Agent API endpoints (use X-API-Key header)

// Workout
GET /api/v1/workout/sessions           // List sessions
GET /api/v1/workout/sessions/:id       // Get session with sets
GET /api/v1/workout/stats              // Aggregated stats
GET /api/v1/workout/exercises          // List exercises
GET /api/v1/workout/bodyweight         // Bodyweight history

// Finance
GET /api/v1/finance/transactions       // List transactions
GET /api/v1/finance/summary            // Spending summary
GET /api/v1/finance/categories         // Categories with totals

// Habits
GET /api/v1/habits                     // List habits
GET /api/v1/habits/:id/entries         // Habit entries
GET /api/v1/habits/streaks             // All streaks

// Dashboard (cross-domain)
GET /api/v1/dashboard/summary          // Overview of all domains
GET /api/v1/dashboard/timeline         // Unified timeline view
GET /api/v1/dashboard/correlations     // Cross-domain insights

// Agent metadata
GET /api/v1/agent/me                   // Current agent info + scopes
GET /api/v1/agent/usage                // API usage stats
```

### 4.5 Authentication Middleware

```typescript
// src/agents/guards/agent-key.guard.ts
@Injectable()
export class AgentKeyGuard implements CanActivate {
  constructor(
    private readonly agentKeyService: AgentKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    
    if (!apiKey) return false;
    
    const agent = await this.agentKeyService.validateKey(apiKey);
    if (!agent) return false;
    
    // Attach agent to request for scope checking
    request.agent = agent;
    return true;
  }
}

// src/agents/decorators/require-scope.decorator.ts
export const RequireScope = (...scopes: string[]) => SetMetadata('scopes', scopes);

// Usage:
@Get('transactions')
@UseGuards(AgentKeyGuard)
@RequireScope('finance:read')
async getTransactions() { ... }
```

### 4.6 MCP Server Setup

```typescript
// Run as separate process or integrated

// Option A: Standalone MCP server (recommended for production)
// src/mcp/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'personal-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
  },
});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: MCP_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Authenticate via API key in tool input or environment
  // Call internal REST API or service directly
});

// Option B: HTTP transport for remote access
// Expose MCP over WebSocket or SSE
```

### Implementation Tasks

| Task | Effort | Priority |
|------|--------|----------|
| Agent key entity + migrations | 1h | P0 |
| Key generation + management endpoints | 2h | P0 |
| Agent auth guard + scope decorator | 2h | P0 |
| REST API v1 endpoints | 4h | P0 |
| MCP server implementation | 4h | P1 |
| MCP tools for all domains | 3h | P1 |
| Agent dashboard UI (key management) | 2h | P2 |

---

## Phase 1: Finance Module (Priority: HIGH)

*(Unchanged from v1 - create finance entities, Cashew import, CRUD endpoints)*

[See original plan for details]

### Key Points:
- Entities: `FinanceWallet`, `FinanceCategory`, `FinanceTransaction`
- Import: `CashewImportService` (follow improved import pattern from Phase 0)
- Endpoints: CRUD + summary/analytics

---

## Phase 2: Habits Module (Priority: MEDIUM)

*(Unchanged from v1 - create habit entities, HabitShare import, streak calculations)*

[See original plan for details]

### Key Points:
- Entities: `Habit`, `HabitEntry`
- Import: `HabitShareImportService` (CSV parsing)
- Endpoints: CRUD + streaks + success rates

---

## Phase 3: Enhanced Dashboard (Priority: HIGH)

*(Unchanged from v1 - cross-domain analytics)*

[See original plan for details]

### Key Points:
- Unified summary endpoint
- Timeline view
- Cross-domain correlations

---

## Data Source Schemas

### 1. Cashew (Finance App) - SQLite

#### Tables
- **transactions**: `transaction_pk`, `name`, `amount`, `note`, `category_fk`, `wallet_fk`, `date_created`, `income` (bool), `paid`, `type`
- **wallets**: `wallet_pk`, `name`, `colour`, `icon_name`, `currency`, `order`
- **categories**: `category_pk`, `name`, `colour`, `icon_name`, `income` (bool), `main_category_pk`

### 2. FitNotes (Gym App) - SQLite ✅ ALREADY IMPORTED

#### Tables (already mapped)
- **training_log**: `exercise_id`, `date`, `metric_weight`, `reps`, `distance`, `duration_seconds`
- **exercise**: `name`, `category_id`, `notes`
- **Category**: `name`, `colour`
- **BodyWeight/MeasurementRecord**: `date`, `value`
- **WorkoutTime**: `start_date_time`, `end_date_time`

### 3. HabitShare (Habits App) - CSV

#### Columns
- `Habit`, `Date`, `Status` (success/fail/skip), `Comment`

#### Tracked Habits
- 🍇, 🍍, gym, Medicine, No 🔞, No Alcohol, No Smoking, Wake Up Early

---

## File Structure (Updated)

```
src/
├── agents/                          # NEW: Agent API
│   ├── agents.module.ts
│   ├── entities/
│   │   └── agent-key.entity.ts
│   ├── agent-keys/
│   │   ├── agent-keys.controller.ts
│   │   └── agent-keys.service.ts
│   ├── guards/
│   │   └── agent-key.guard.ts
│   └── decorators/
│       └── require-scope.decorator.ts
├── api/                             # NEW: Versioned API for agents
│   └── v1/
│       ├── api-v1.module.ts
│       ├── workout.controller.ts
│       ├── finance.controller.ts
│       ├── habits.controller.ts
│       └── dashboard.controller.ts
├── mcp/                             # NEW: MCP server
│   ├── mcp.module.ts
│   ├── mcp.service.ts
│   └── tools/
│       ├── workout.tools.ts
│       ├── finance.tools.ts
│       └── habits.tools.ts
├── finance/
│   ├── finance.module.ts
│   ├── entities/
│   ├── wallets/
│   ├── categories/
│   ├── transactions/
│   └── import/
├── habits/
│   ├── habits.module.ts
│   ├── entities/
│   ├── habits/
│   ├── entries/
│   └── import/
├── workout/
│   └── import/
│       ├── fitnotes-import.service.ts  # ENHANCED
│       └── import.controller.ts        # ENHANCED
└── dashboard/
    └── dashboard.service.ts (enhanced)
```

---

## Implementation Timeline (Updated)

| Phase | Task | Estimated Effort | Dependencies | Agent |
|-------|------|------------------|--------------|-------|
| **0.1** | FitNotes preview endpoint | 2h | - | Dev Agent 1 |
| **0.2** | FitNotes SSE progress | 2h | 0.1 | Dev Agent 1 |
| **0.3** | FitNotes transaction safety | 1h | 0.2 | Dev Agent 1 |
| **0.4** | FitNotes frontend wizard | 4h | 0.1-0.3 | Dev Agent 2 |
| **1.1** | Finance entities + migrations | 2h | - | Dev Agent 3 |
| **1.2** | Cashew import service | 3h | 1.1 | Dev Agent 3 |
| **1.3** | Finance CRUD endpoints | 2h | 1.1 | Dev Agent 3 |
| **2.1** | Habits entities + migrations | 1h | - | Dev Agent 4 |
| **2.2** | HabitShare import service | 2h | 2.1 | Dev Agent 4 |
| **2.3** | Habits CRUD + streaks | 2h | 2.1 | Dev Agent 4 |
| **3.1** | Dashboard enhancements | 3h | 1.3, 2.3 | Dev Agent 5 |
| **4.1** | Agent key entity + auth | 3h | - | Dev Agent 6 |
| **4.2** | REST API v1 endpoints | 4h | 4.1, 1.3, 2.3 | Dev Agent 6 |
| **4.3** | MCP server implementation | 4h | 4.2 | Dev Agent 6 |

**Total**: ~35 hours of development

---

## Development Agent Assignments

### Agent 1: FitNotes Import Backend
- Implement preview endpoint
- Add SSE progress streaming
- Add transaction safety

### Agent 2: FitNotes Import Frontend
- Create multi-step import wizard
- Progress bar component
- Summary view

### Agent 3: Finance Module
- Create entities + migrations
- Cashew import service
- CRUD endpoints

### Agent 4: Habits Module
- Create entities + migrations
- HabitShare import service
- CRUD + streak endpoints

### Agent 5: Dashboard Enhancement
- Cross-domain analytics
- Timeline view
- Correlations API

### Agent 6: Agent API
- API key management
- REST API v1
- MCP server

---

## Notes for Development Agents

### Existing Patterns to Follow

1. **Entity base class**: Extend `AbstractAccountOwnedEntity` for account segregation
2. **Import pattern**: See `src/workout/import/fitnotes-import.service.ts` for SQLite handling
3. **Service pattern**: Use TypeORM repositories, inject with `@InjectRepository`
4. **Controller pattern**: Use `@Auth()` decorator for protected routes
5. **Account context**: Access via `RequestContext.getCurrentAccount()`

### Testing Data

- Cashew SQLite: `/home/clawdia/.openclaw/media/references/cashew-db-v46-SM_S928B2026-02-16-22-48-28-784Z.sql`
- FitNotes SQLite: `/home/clawdia/.openclaw/media/references/FitNotes_Backup.fitnotes`
- HabitShare CSV: `/home/clawdia/.openclaw/media/references/HabitShareData.csv`

### Important Considerations

1. **Decimal precision**: Use `decimal(12,2)` for money, not float
2. **Timezone handling**: Store all dates in UTC, convert on display
3. **External IDs**: Store original IDs for deduplication on re-import
4. **Batch inserts**: Use `save([...])` for bulk operations
5. **Agent API keys**: Never log full keys, only prefix

---

## Security Considerations for Agent API

1. **Key storage**: Store bcrypt hashes, never plaintext
2. **Key rotation**: Support key regeneration without breaking active sessions
3. **Rate limiting**: Implement per-key rate limits
4. **Audit logging**: Log all agent API access
5. **Scope validation**: Check scopes on every request
6. **Key expiration**: Support optional expiration dates
7. **IP allowlisting**: Optional IP restrictions per key

---

---

## NEW: Phase 5 - Documentation & Branding (Priority: HIGH)

### 5.1 Comprehensive Documentation

**Tasks:**
- [ ] Update README.md with project overview, setup instructions, architecture
- [ ] Create docs/ARCHITECTURE.md with system design diagrams
- [ ] Create docs/API.md with full API reference
- [ ] Create docs/DEVELOPMENT.md with contribution guide
- [ ] Create docs/DEPLOYMENT.md with deployment instructions
- [ ] Add inline JSDoc documentation to all services

### 5.2 Logo Design

**Requirements:**
- Modern, clean design
- Represents personal data/dashboard concept
- Works in light and dark modes
- SVG format for scalability
- Favicon version (16x16, 32x32, 192x192)

### 5.3 Brand Identity

**Tasks:**
- [ ] Define color palette
- [ ] Typography selection
- [ ] Create style guide (docs/BRAND.md)
- [ ] Design landing page header/hero
- [ ] Create favicon and app icons
- [ ] Social media assets (if needed)

---

*This document will be updated as implementation progresses.*
