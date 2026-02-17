import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AgentKey } from '../entities/agent-key.entity';

/**
 * Parameter decorator that extracts the current agent key from the request.
 * Requires AgentKeyGuard to have run first.
 */
export const ReqAgentKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AgentKey => {
    const request = ctx.switchToHttp().getRequest();
    return request.agentKey;
  },
);
