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
import { ChatUserSocketGuard, ChatUserSocket } from './chat-user.guard';

export interface SendChatMessagePayload {
  conversationId: string;
  text: string;
  pageContext?: Record<string, any>;
}

export interface JoinChatSessionPayload {
  conversationId: string;
}

@WebSocketGateway({
  namespace: '/chat/user',
  cors: { origin: '*' },
})
@UseGuards(ChatUserSocketGuard)
export class ChatUserGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly relay: ChatRelayBus,
  ) {
    this.relay.registerUserGateway(this);
  }

  @SubscribeMessage('session:join')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinChatSessionPayload,
  ) {
    client.join(`session:${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: ChatUserSocket,
    @MessageBody() data: SendChatMessagePayload,
  ) {
    try {
      const message = await this.chatService.sendMessage(
        data.conversationId,
        client.data.accountId,
        data.text,
        data.pageContext,
      );
      this.relay.emitToUserSession(
        data.conversationId,
        'message:new',
        message,
      );
      this.relay.broadcastToAllAgents('message:new', message);
      return { success: true, message };
    } catch (err) {
      client.emit('error', { message: err.message });
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('session:close')
  async handleCloseSession(
    @ConnectedSocket() client: ChatUserSocket,
    @MessageBody() data: JoinChatSessionPayload,
  ) {
    try {
      const session = await this.chatService.closeConversation(
        data.conversationId,
        client.data.accountId,
      );
      const payload = { conversationId: session.id };
      this.relay.emitToUserSession(
        data.conversationId,
        'session:closed',
        payload,
      );
      this.relay.broadcastToAllAgents('session:closed', payload);
      return { success: true, session };
    } catch (err) {
      client.emit('error', { message: err.message });
      return { success: false, error: err.message };
    }
  }

  emitToSession(conversationId: string, event: string, payload: any): void {
    this.server?.to(`session:${conversationId}`).emit(event, payload);
  }
}
