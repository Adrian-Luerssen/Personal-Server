import { AgentDiscoverController } from './discover.controller';

describe('AgentDiscoverController', () => {
  let controller: AgentDiscoverController;

  beforeEach(() => {
    controller = new AgentDiscoverController();
  });

  const makeKey = (scopes: string[], name = 'TestKey') => ({
    name,
    scopes,
    id: 'key-id',
    accountId: 'account-id',
  } as any);

  it('should return only endpoints matching the key scopes', () => {
    const key = makeKey(['workout:read']);
    const result = controller.discover(key);

    expect(result.key.name).toBe('TestKey');
    expect(result.key.scopes).toEqual(['workout:read']);
    expect(result.endpoints.every(e => e.scope === 'workout:read')).toBe(true);
    expect(result.total).toBe(result.endpoints.length);
    expect(result.total).toBeGreaterThan(0);
  });

  it('should return endpoints for multiple scopes', () => {
    const key = makeKey(['workout:read', 'finance:read']);
    const result = controller.discover(key);

    const scopes = new Set(result.endpoints.map(e => e.scope));
    expect(scopes.has('workout:read')).toBe(true);
    expect(scopes.has('finance:read')).toBe(true);
    expect(scopes.has('chat:read')).toBe(false);

    expect(result.key.scopes).toEqual(['finance:read', 'workout:read']); // sorted
  });

  it('should return no endpoints for an empty scopes array', () => {
    const key = makeKey([]);
    const result = controller.discover(key);

    expect(result.endpoints).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.key.scopes).toEqual([]);
  });

  it('should handle null scopes gracefully', () => {
    const key = makeKey(null as any);
    const result = controller.discover(key);

    expect(result.endpoints).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should return chat endpoints only when chat scopes are present', () => {
    const key = makeKey(['chat:read', 'chat:write']);
    const result = controller.discover(key);

    expect(result.endpoints.some(e => e.scope === 'chat:read')).toBe(true);
    expect(result.endpoints.some(e => e.scope === 'chat:write')).toBe(true);
    expect(result.key.scopes).toEqual(['chat:read', 'chat:write']);
  });

  it('should include auth info in the response', () => {
    const key = makeKey(['workout:read']);
    const result = controller.discover(key);

    expect(result.auth.header).toBe('X-API-Key');
    expect(result.auth.description).toContain('X-API-Key');
  });

  it('should include all workout endpoints', () => {
    const key = makeKey(['workout:read']);
    const result = controller.discover(key);

    const paths = result.endpoints.map(e => e.path);
    expect(paths).toContain('/api/v1/workout/sessions');
    expect(paths).toContain('/api/v1/workout/sessions/recent');
    expect(paths).toContain('/api/v1/workout/sessions/active');
    expect(paths).toContain('/api/v1/workout/stats');
    expect(paths).toContain('/api/v1/workout/exercises');
    expect(paths).toContain('/api/v1/workout/bodyweight');
  });

  it('should include all finance endpoints', () => {
    const key = makeKey(['finance:read']);
    const result = controller.discover(key);

    const paths = result.endpoints.map(e => e.path);
    expect(paths).toContain('/api/v1/finance/transactions');
    expect(paths).toContain('/api/v1/finance/transactions/summary');
    expect(paths).toContain('/api/v1/finance/wallets');
    expect(paths).toContain('/api/v1/finance/categories');
    expect(paths).toContain('/api/v1/finance/subscriptions');
  });

  it('should include parameter definitions for endpoints that have them', () => {
    const key = makeKey(['workout:read']);
    const result = controller.discover(key);

    const sessionsEndpoint = result.endpoints.find(e => e.path === '/api/v1/workout/sessions');
    expect(sessionsEndpoint.parameters).toBeDefined();
    expect(sessionsEndpoint.parameters.length).toBeGreaterThan(0);
    expect(sessionsEndpoint.parameters[0]).toHaveProperty('name');
    expect(sessionsEndpoint.parameters[0]).toHaveProperty('in');
    expect(sessionsEndpoint.parameters[0]).toHaveProperty('required');
  });

  it('should return all scopes when key has full access', () => {
    const key = makeKey([
      'workout:read', 'finance:read', 'habits:read',
      'dashboard:read', 'chat:read', 'chat:write',
    ]);
    const result = controller.discover(key);

    expect(result.key.scopes).toEqual([
      'chat:read', 'chat:write', 'dashboard:read',
      'finance:read', 'habits:read', 'workout:read',
    ]);
    expect(result.total).toBeGreaterThanOrEqual(16);
  });
});
