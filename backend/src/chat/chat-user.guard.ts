import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { JwtPayload } from '../system/auth/jwt.dto';

export interface ChatUserSocket extends Socket {
  data: {
    accountId: string;
  };
}

@Injectable()
export class ChatUserSocketGuard implements CanActivate {
  private readonly logger = new Logger(ChatUserSocketGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<ChatUserSocket>();
    if (client.data?.accountId) return true;
    return this.authenticateSocket(client);
  }

  async authenticateSocket(client: ChatUserSocket): Promise<boolean> {
    const { token } = client.handshake.auth || {};
    if (!token) return false;

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_KEY'),
      });
      if (payload.type !== 'access' || !payload.accountId) return false;
      client.data = { accountId: payload.accountId };
      return true;
    } catch {
      this.logger.warn('Chat user socket rejected: invalid access token');
      return false;
    }
  }
}
