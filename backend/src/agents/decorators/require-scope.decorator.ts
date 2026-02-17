import { SetMetadata } from '@nestjs/common';

export const SCOPES_KEY = 'agent_scopes';

/**
 * Decorator to declare required scopes for an agent API endpoint.
 * Used together with ScopeGuard.
 * All listed scopes must be present on the agent key.
 *
 * @example
 * \@RequireScope('workout:read')
 * \@Get('sessions')
 * async getSessions() { ... }
 */
export const RequireScope = (...scopes: string[]) =>
  SetMetadata(SCOPES_KEY, scopes);
