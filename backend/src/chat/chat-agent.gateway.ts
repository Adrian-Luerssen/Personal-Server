import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { ChatRelayBus } from './chat-relay.bus';
import { ChatAgentSocket, ChatAgentSocketGuard } from './chat-agent.guard';
import { ChatTokenUsage } from './entities/message.entity';

interface JoinChatSessionPayload {
  conversationId: string;
}

interface MessageIdPayload {
  messageId: string;
  accountId?: string;
}

interface ThinkingPayload {
  conversationId: string;
  accountId?: string;
}

interface FinishPayload extends MessageIdPayload {
  text: string;
  tokenUsage?: ChatTokenUsage;
}

interface TitlePayload {
  conversationId: string;
  accountId?: string;
  title: string;
}

@WebSocketGateway({
  namespace: '/chat/agent',
  cors: { origin: '*' },
})
@UseGuards(ChatAgentSocketGuard)
export class ChatAgentGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly relay: ChatRelayBus,
  ) {
    this.relay.registerAgentGateway(this);
  }

  @SubscribeMessage('session:join')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinChatSessionPayload,
  ) {
    client.join(`session:${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('message:read')
  async handleReadMessage(
    @ConnectedSocket() client: ChatAgentSocket,
    @MessageBody() data: MessageIdPayload,
  ) {
    try {
      const accountId = this.resolveAccountId(client, data.accountId);
      const message = await this.chatService.markUserMessageRead(
        data.messageId,
        accountId,
      );
      this.relay.emitToUserSession(
        message.conversationId,
        'message:updated',
        message,
      );
      return { success: true, message };
    } catch (err) {
      client.emit('error', { message: err.message });
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('message:thinking')
  async handleThinkingMessage(
    @ConnectedSocket() client: ChatAgentSocket,
    @MessageBody() data: ThinkingPayload,
  ) {
    try {
      const accountId = this.resolveAccountId(client, data.accountId);
      const message = await this.chatService.createThinkingMessage(
        data.conversationId,
        accountId,
        client.data.agentKeyId,
      );
      this.relay.emitToUserSession(
        data.conversationId,
        'message:new',
        message,
      );
      return { success: true, message };
    } catch (err) {
      client.emit('error', { message: err.message });
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('message:finish')
  async handleFinishMessage(
    @ConnectedSocket() client: ChatAgentSocket,
    @MessageBody() data: FinishPayload,
  ) {
    try {
      const accountId = this.resolveAccountId(client, data.accountId);
      const message = await this.chatService.finishThinkingMessage(
        data.messageId,
        accountId,
        data.text,
        data.tokenUsage,
      );
      this.relay.emitToUserSession(
        message.conversationId,
        'message:updated',
        message,
      );
      return { success: true, message };
    } catch (err) {
      client.emit('error', { message: err.message });
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('session:title')
  async handleSessionTitle(
    @ConnectedSocket() client: ChatAgentSocket,
    @MessageBody() data: TitlePayload,
  ) {
    try {
      const accountId = this.resolveAccountId(client, data.accountId);
      const session = await this.chatService.setConversationTitle(
        data.conversationId,
        accountId,
        data.title,
      );
      const payload = { conversationId: session.id, title: session.title };
      this.relay.emitToUserSession(
        data.conversationId,
        'session:titled',
        payload,
      );
      return { success: true, session };
    } catch (err) {
      client.emit('error', { message: err.message });
      return { success: false, error: err.message };
    }
  }

  emitToSession(conversationId: string, event: string, payload: any): void {
    this.server?.to(`session:${conversationId}`).emit(event, payload);
  }

  emitToAll(event: string, payload: any): void {
    this.server?.emit(event, payload);
  }

  private resolveAccountId(client: ChatAgentSocket, payloadAccountId?: string) {
    const accountId = client.data.accountId ?? payloadAccountId;
    if (!accountId) {
      throw new Error('accountId is required for secret-authenticated agents');
    }
    return accountId;
  }
}
