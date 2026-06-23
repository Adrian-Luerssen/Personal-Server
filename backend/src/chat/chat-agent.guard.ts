import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { AgentKeysService } from '../agents/agent-keys.service';

export interface ChatAgentSocket extends Socket {
  data: {
    role: 'agent';
    accountId?: string;
    agentKeyId?: string;
  };
}

@Injectable()
export class ChatAgentSocketGuard implements CanActivate {
  private readonly logger = new Logger(ChatAgentSocketGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly agentKeysService: AgentKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<ChatAgentSocket>();
    if (client.data?.role === 'agent') return true;
    return this.authenticateSocket(client);
  }

  async authenticateSocket(client: ChatAgentSocket): Promise<boolean> {
    const { secret, apiKey } = client.handshake.auth || {};

    if (apiKey) {
      const agentKey = await this.agentKeysService.validateKey(apiKey);
      if (!agentKey || !agentKey.scopes.includes('chat:write')) return false;
      client.data = {
        role: 'agent',
        accountId: agentKey.accountId,
        agentKeyId: agentKey.id,
      };
      return true;
    }

    const configuredSecret = this.configService.get<string>('COPILOT_AGENT_SECRET');
    if (!secret || !configuredSecret || secret !== configuredSecret) {
      this.logger.warn('Chat agent socket rejected: invalid secret');
      return false;
    }

    client.data = { role: 'agent' };
    return true;
  }
}
