import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ChatConversation } from './entities/conversation.entity';
import { ChatMessage, ChatSender, ChatStatus } from './entities/message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatConversation)
    private readonly conversationRepo: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
  ) {}

  /** List all conversations for an account, most recent first. */
  async listConversations(accountId: string): Promise<ChatConversation[]> {
    return this.conversationRepo.find({
      where: { accountId },
      order: { updatedAt: 'DESC' },
    });
  }

  /** Create a new conversation. */
  async createConversation(
    accountId: string,
    title?: string,
  ): Promise<ChatConversation> {
    const conversation = this.conversationRepo.create({
      accountId,
      title: title ?? null,
    });
    return this.conversationRepo.save(conversation);
  }

  /** Get messages in a conversation, optionally after a given timestamp. */
  async getMessages(
    conversationId: string,
    accountId: string,
    after?: string,
  ): Promise<ChatMessage[]> {
    await this.verifyConversationOwnership(conversationId, accountId);

    const where: any = { conversationId, accountId };
    if (after) {
      where.createdAt = MoreThan(new Date(after));
    }

    return this.messageRepo.find({
      where,
      order: { createdAt: 'ASC' },
    });
  }

  /** Send a message from the user. */
  async sendMessage(
    conversationId: string,
    accountId: string,
    text: string,
    pageContext?: Record<string, any>,
  ): Promise<ChatMessage> {
    await this.verifyConversationOwnership(conversationId, accountId);

    const message = this.messageRepo.create({
      conversationId,
      accountId,
      sender: ChatSender.USER,
      text,
      status: ChatStatus.SENT,
      pageContext: pageContext ?? null,
    });

    const saved = await this.messageRepo.save(message);

    // Touch conversation updatedAt
    await this.conversationRepo.update(conversationId, {
      updatedAt: new Date(),
    });

    return saved;
  }

  /** Delete a conversation (with ownership check). */
  async deleteConversation(
    conversationId: string,
    accountId: string,
  ): Promise<void> {
    await this.verifyConversationOwnership(conversationId, accountId);
    await this.conversationRepo.delete({ id: conversationId, accountId });
  }

  /** Get unread messages (status = 'sent') for agent polling. */
  async getUnread(accountId: string): Promise<ChatMessage[]> {
    return this.messageRepo.find({
      where: {
        accountId,
        status: ChatStatus.SENT,
        sender: ChatSender.USER,
      },
      order: { createdAt: 'ASC' },
    });
  }

  /** Update the status of a message (agent updates). */
  async updateMessageStatus(
    messageId: string,
    accountId: string,
    status: ChatStatus,
  ): Promise<ChatMessage> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId, accountId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.status = status;
    return this.messageRepo.save(message);
  }

  /** Agent posts a reply message with status 'delivered'. */
  async sendAgentMessage(
    conversationId: string,
    accountId: string,
    agentKeyId: string,
    text: string,
    replyToId?: string,
  ): Promise<ChatMessage> {
    await this.verifyConversationOwnership(conversationId, accountId);

    const message = this.messageRepo.create({
      conversationId,
      accountId,
      sender: ChatSender.AGENT,
      agentKeyId,
      text,
      status: ChatStatus.DELIVERED,
      replyToId: replyToId ?? null,
    });

    const saved = await this.messageRepo.save(message);

    // Touch conversation updatedAt
    await this.conversationRepo.update(conversationId, {
      updatedAt: new Date(),
    });

    return saved;
  }

  // ── Helpers ──────────────────────────────────────────────

  private async verifyConversationOwnership(
    conversationId: string,
    accountId: string,
  ): Promise<ChatConversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, accountId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }
}
