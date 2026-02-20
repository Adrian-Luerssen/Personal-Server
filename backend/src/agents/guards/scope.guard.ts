import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from '../decorators/require-scope.decorator';

/**
 * Guard that checks whether the agent key has all required scopes.
 * Must be used AFTER AgentKeyGuard (which populates request.agentKey).
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.get<string[]>(
      SCOPES_KEY,
      context.getHandler(),
    );

    // No scope restriction on this endpoint
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const agentKey = request.agentKey;

    if (!agentKey || !agentKey.scopes) {
      throw new ForbiddenException('No agent key scopes available');
    }

    const missing = requiredScopes.filter(
      (scope) => !agentKey.scopes.includes(scope),
    );

    if (missing.length > 0) {
      throw new ForbiddenException(
        `Insufficient scope. Missing: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
