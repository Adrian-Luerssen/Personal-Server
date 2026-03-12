import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AgentKeyGuard } from '../../agents/guards/agent-key.guard';
import { ReqAgentKey } from '../../agents/decorators/req-agent-key.decorator';
import { AgentKey } from '../../agents/entities/agent-key.entity';
import { ApiKey } from '../../system/auth/auth.decorator';

interface EndpointInfo {
  method: string;
  path: string;
  description: string;
  scope: string;
  parameters?: { name: string; in: 'query' | 'path' | 'body'; required: boolean; description: string }[];
}

/**
 * Full endpoint registry. Keep this in sync when adding new agent endpoints.
 */
const ENDPOINT_REGISTRY: EndpointInfo[] = [
  // Workout
  {
    method: 'GET', path: '/api/v1/workout/sessions', scope: 'workout:read',
    description: 'Get paginated workout sessions',
    parameters: [
      { name: 'page', in: 'query', required: false, description: 'Page number (default: 1)' },
      { name: 'limit', in: 'query', required: false, description: 'Items per page (default: 20)' },
    ],
  },
  {
    method: 'GET', path: '/api/v1/workout/sessions/recent', scope: 'workout:read',
    description: 'Get most recent workout sessions',
    parameters: [
      { name: 'limit', in: 'query', required: false, description: 'Number of sessions (default: 5)' },
    ],
  },
  {
    method: 'GET', path: '/api/v1/workout/sessions/active', scope: 'workout:read',
    description: 'Get the current active session (if any)',
  },
  {
    method: 'GET', path: '/api/v1/workout/sessions/:id', scope: 'workout:read',
    description: 'Get a specific workout session by ID',
    parameters: [
      { name: 'id', in: 'path', required: true, description: 'Session UUID' },
    ],
  },
  {
    method: 'GET', path: '/api/v1/workout/stats', scope: 'workout:read',
    description: 'Get aggregate workout statistics (totals for workouts, sets, reps, volume, time)',
  },
  {
    method: 'GET', path: '/api/v1/workout/exercises', scope: 'workout:read',
    description: 'Get all exercises',
  },
  {
    method: 'GET', path: '/api/v1/workout/bodyweight', scope: 'workout:read',
    description: 'Get all bodyweight entries',
  },

  // Finance
  {
    method: 'GET', path: '/api/v1/finance/transactions', scope: 'finance:read',
    description: 'Get paginated transactions with optional filters',
    parameters: [
      { name: 'page', in: 'query', required: false, description: 'Page number (default: 1)' },
      { name: 'limit', in: 'query', required: false, description: 'Items per page (default: 50, max: 200)' },
      { name: 'walletId', in: 'query', required: false, description: 'Filter by wallet UUID' },
      { name: 'categoryId', in: 'query', required: false, description: 'Filter by category UUID (includes subcategories)' },
      { name: 'from', in: 'query', required: false, description: 'Start date (ISO format)' },
      { name: 'to', in: 'query', required: false, description: 'End date (ISO format)' },
      { name: 'isIncome', in: 'query', required: false, description: '"true" or "false"' },
      { name: 'search', in: 'query', required: false, description: 'Search transaction names' },
    ],
  },
  {
    method: 'GET', path: '/api/v1/finance/transactions/summary', scope: 'finance:read',
    description: 'Get financial summary: income/expense totals, net balance, top expense categories, daily sparkline',
    parameters: [
      { name: 'walletId', in: 'query', required: false, description: 'Filter by wallet UUID' },
      { name: 'categoryId', in: 'query', required: false, description: 'Filter by category UUID' },
      { name: 'from', in: 'query', required: false, description: 'Start date (ISO format)' },
      { name: 'to', in: 'query', required: false, description: 'End date (ISO format)' },
    ],
  },
  {
    method: 'GET', path: '/api/v1/finance/wallets', scope: 'finance:read',
    description: 'Get all wallets with computed balances',
  },
  {
    method: 'GET', path: '/api/v1/finance/categories', scope: 'finance:read',
    description: 'Get spending categories as a hierarchical tree (parents with subcategories)',
  },
  {
    method: 'GET', path: '/api/v1/finance/subscriptions', scope: 'finance:read',
    description: 'Get all subscriptions with wallet and category details',
  },

  // Habits
  {
    method: 'GET', path: '/api/v1/habits', scope: 'habits:read',
    description: 'Get all habits (stub — coming soon)',
  },
  {
    method: 'GET', path: '/api/v1/habits/entries', scope: 'habits:read',
    description: 'Get habit entries (stub — coming soon)',
  },
  {
    method: 'GET', path: '/api/v1/habits/today', scope: 'habits:read',
    description: 'Get today\'s habit completions (stub — coming soon)',
  },

  // Dashboard
  {
    method: 'GET', path: '/api/v1/dashboard/streams/workout', scope: 'dashboard:read',
    description: 'Get Spotify streams that occurred during workout sessions',
    parameters: [
      { name: 'timeframe', in: 'query', required: false, description: 'Preset: today, 7d, 30d, 1y, all' },
      { name: 'from', in: 'query', required: false, description: 'ISO start datetime' },
      { name: 'to', in: 'query', required: false, description: 'ISO end datetime' },
    ],
  },

  // Chat
  {
    method: 'GET', path: '/api/v1/chat/unread', scope: 'chat:read',
    description: 'Poll for unread messages for the agent to process',
  },
  {
    method: 'GET', path: '/api/v1/chat/conversations/:id/messages', scope: 'chat:read',
    description: 'Get messages in a specific conversation',
    parameters: [
      { name: 'id', in: 'path', required: true, description: 'Conversation UUID' },
      { name: 'after', in: 'query', required: false, description: 'ISO timestamp — only return messages after this time' },
    ],
  },
  {
    method: 'PATCH', path: '/api/v1/chat/messages/:id', scope: 'chat:write',
    description: 'Update message status (sent, read, thinking, delivered, error)',
    parameters: [
      { name: 'id', in: 'path', required: true, description: 'Message UUID' },
      { name: 'status', in: 'body', required: true, description: 'New status: sent | read | thinking | delivered | error' },
    ],
  },
  {
    method: 'POST', path: '/api/v1/chat/conversations/:id/messages', scope: 'chat:write',
    description: 'Send an agent reply to a conversation',
    parameters: [
      { name: 'id', in: 'path', required: true, description: 'Conversation UUID' },
      { name: 'text', in: 'body', required: true, description: 'Reply message content' },
      { name: 'replyToId', in: 'body', required: false, description: 'UUID of the message being replied to' },
    ],
  },
];

@ApiTags('API v1 - Discovery')
@ApiSecurity('api-key')
@UseGuards(AgentKeyGuard)
@Controller('v1/discover')
export class AgentDiscoverController {
  @Get()
  @ApiKey()
  @ApiOperation({ summary: 'Discover available endpoints based on your API key scopes' })
  discover(@ReqAgentKey() key: AgentKey) {
    const scopes = key.scopes || [];

    const endpoints = ENDPOINT_REGISTRY.filter(e => scopes.includes(e.scope));

    const grantedScopes = [...new Set(endpoints.map(e => e.scope))].sort();

    return {
      key: {
        name: key.name,
        scopes: grantedScopes,
      },
      auth: {
        header: 'X-API-Key',
        description: 'Pass your API key in the X-API-Key header on every request.',
      },
      endpoints,
      total: endpoints.length,
    };
  }
}
