import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { NoAuth, ReqUser } from '../system/auth/auth.decorator';
import { Account } from '../system/accounts/account.entity';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@Controller('chat')
export class ChatController {
  private readonly skillContent: string;

  constructor(private readonly chatService: ChatService) {
    const skillPath = [
      path.join(__dirname, 'skill.md'),
      path.join(process.cwd(), 'src', 'chat', 'skill.md'),
    ].find((candidate) => fs.existsSync(candidate));
    this.skillContent = skillPath
      ? fs.readFileSync(skillPath, 'utf-8')
      : '# Personal Server Chat Agent Protocol\n\nProtocol document unavailable.';
  }

  @Get('skill')
  @NoAuth()
  @ApiOperation({ summary: 'Get the external chat agent Socket.IO protocol' })
  getSkill(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/markdown');
    res.send(this.skillContent);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations for the authenticated user' })
  async listConversations(@ReqUser() account: Account) {
    return this.chatService.listConversations(account.id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  async createConversation(
    @ReqUser() account: Account,
    @Body() body: { title?: string },
  ) {
    return this.chatService.createConversation(account.id, body.title);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiQuery({ name: 'after', required: false, description: 'ISO timestamp to fetch messages after' })
  async getMessages(
    @ReqUser() account: Account,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('after') after?: string,
  ) {
    return this.chatService.getMessages(id, account.id, after);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async sendMessage(
    @ReqUser() account: Account,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { text: string; pageContext?: Record<string, any> },
  ) {
    return this.chatService.sendMessage(id, account.id, body.text, body.pageContext);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async deleteConversation(
    @ReqUser() account: Account,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.chatService.deleteConversation(id, account.id);
    return { success: true };
  }
}
