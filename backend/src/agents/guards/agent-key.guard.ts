import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AgentKeysService } from '../agent-keys.service';

/**
 * Guard that validates the X-API-Key header against stored agent keys.
 * Attaches agentKey and accountId to the request on success.
 *
 * Security notes:
 * - Never logs the full API key, only the prefix
 * - bcrypt handles timing-safe comparison
 */
@Injectable()
export class AgentKeyGuard implements CanActivate {
  constructor(private readonly agentKeysService: AgentKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey: string | undefined = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    const agentKey = await this.agentKeysService.validateKey(apiKey);

    if (!agentKey) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    if (agentKey.expiresAt && agentKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    // Attach resolved key and accountId to request for downstream use
    request.agentKey = agentKey;
    request.accountId = agentKey.accountId;

    return true;
  }
}
