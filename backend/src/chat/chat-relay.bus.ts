import { Injectable } from '@nestjs/common';

interface SessionEmitter {
  emitToSession(conversationId: string, event: string, payload: any): void;
}

interface GlobalEmitter extends SessionEmitter {
  emitToAll(event: string, payload: any): void;
}

@Injectable()
export class ChatRelayBus {
  private userGateway?: SessionEmitter;
  private agentGateway?: GlobalEmitter;

  registerUserGateway(gateway: SessionEmitter): void {
    this.userGateway = gateway;
  }

  registerAgentGateway(gateway: GlobalEmitter): void {
    this.agentGateway = gateway;
  }

  emitToUserSession(conversationId: string, event: string, payload: any): void {
    this.userGateway?.emitToSession(conversationId, event, payload);
  }

  emitToAgentSession(conversationId: string, event: string, payload: any): void {
    this.agentGateway?.emitToSession(conversationId, event, payload);
  }

  broadcastToAllAgents(event: string, payload: any): void {
    this.agentGateway?.emitToAll(event, payload);
  }
}
