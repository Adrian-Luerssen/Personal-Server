import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AgentKeyGuard } from '../agents/guards/agent-key.guard';
import { ScopeGuard } from '../agents/guards/scope.guard';
import { RequireScope } from '../agents/decorators/require-scope.decorator';
import { ReqAgentKey } from '../agents/decorators/req-agent-key.decorator';
import { AgentKey } from '../agents/entities/agent-key.entity';
import { ApiKey } from '../system/auth/auth.decorator';
import { ChatService } from './chat.service';
import { ChatStatus } from './entities/message.entity';

/**
 * Agent-accessible chat endpoints.
 * Authenticated via X-API-Key header (AgentKeyGuard).
 * Scopes required: chat:read, chat:write
 */
@ApiTags('API v1 - Chat')
@ApiSecurity('api-key')
@UseGuards(AgentKeyGuard, ScopeGuard)
@Controller('v1/chat')
export class ChatAgentController {
  constructor(private readonly chatService: ChatService) {}

  @Get('unread')
  @RequireScope('chat:read')
  @ApiKey()
  @ApiOperation({ summary: 'Get unread messages for the agent to process' })
  async getUnread(@ReqAgentKey() key: AgentKey) {
    return this.chatService.getUnread(key.accountId);
  }

  @Get('conversations/:id/messages')
  @RequireScope('chat:read')
  @ApiKey()
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiQuery({ name: 'after', required: false, description: 'ISO timestamp to fetch messages after' })
  async getMessages(
    @ReqAgentKey() key: AgentKey,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('after') after?: string,
  ) {
    return this.chatService.getMessages(id, key.accountId, after);
  }

  @Patch('messages/:id')
  @RequireScope('chat:write')
  @ApiKey()
  @ApiOperation({ summary: 'Update message status (e.g., mark as read, thinking, error)' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  async updateMessageStatus(
    @ReqAgentKey() key: AgentKey,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: ChatStatus },
  ) {
    return this.chatService.updateMessageStatus(id, key.accountId, body.status);
  }

  @Post('conversations/:id/messages')
  @RequireScope('chat:write')
  @ApiKey()
  @ApiOperation({ summary: 'Send an agent reply to a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async sendAgentMessage(
    @ReqAgentKey() key: AgentKey,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { text: string; replyToId?: string },
  ) {
    return this.chatService.sendAgentMessage(
      id,
      key.accountId,
      key.id,
      body.text,
      body.replyToId,
    );
  }
}
