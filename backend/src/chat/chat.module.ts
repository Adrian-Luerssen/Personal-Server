import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatConversation } from './entities/conversation.entity';
import { ChatMessage } from './entities/message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatAgentController } from './chat-agent.controller';
import { AgentsModule } from '../agents/agents.module';
import { ChatRelayBus } from './chat-relay.bus';
import { ChatUserGateway } from './chat-user.gateway';
import { ChatAgentGateway } from './chat-agent.gateway';
import { ChatUserSocketGuard } from './chat-user.guard';
import { ChatAgentSocketGuard } from './chat-agent.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatConversation, ChatMessage]),
    AgentsModule,
  ],
  providers: [
    ChatService,
    ChatRelayBus,
    ChatUserGateway,
    ChatAgentGateway,
    ChatUserSocketGuard,
    ChatAgentSocketGuard,
  ],
  controllers: [ChatController, ChatAgentController],
  exports: [ChatService],
})
export class ChatModule {}
