import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatConversation } from './entities/conversation.entity';
import { ChatMessage } from './entities/message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatAgentController } from './chat-agent.controller';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatConversation, ChatMessage]),
    AgentsModule,
  ],
  providers: [ChatService],
  controllers: [ChatController, ChatAgentController],
  exports: [ChatService],
})
export class ChatModule {}
