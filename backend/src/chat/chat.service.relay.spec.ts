import { NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatConversation, ChatConversationStatus } from './entities/conversation.entity';
import { ChatMessage, ChatSender, ChatStatus } from './entities/message.entity';

function createRepoMock<T extends { id?: string }>() {
  const items: T[] = [];
  let sequence = 0;

  return {
    items,
    create: jest.fn((data: Partial<T>) => data as T),
    save: jest.fn(async (item: T) => {
      if (!item.id) item.id = `id-${++sequence}`;
      const index = items.findIndex((existing) => existing.id === item.id);
      if (index >= 0) items[index] = item;
      else items.push(item);
      return item;
    }),
    find: jest.fn(),
    findOne: jest.fn(async ({ where }: { where: Partial<T> }) =>
      items.find((item) =>
        Object.entries(where).every(([key, value]) => item[key] === value),
      ) ?? null,
    ),
    update: jest.fn(async (id: string, patch: Partial<T>) => {
      const item = items.find((existing) => existing.id === id);
      if (item) Object.assign(item, patch);
      return { affected: item ? 1 : 0 };
    }),
    delete: jest.fn(),
  };
}

describe('ChatService realtime relay lifecycle', () => {
  let conversationRepo: ReturnType<typeof createRepoMock<ChatConversation>>;
  let messageRepo: ReturnType<typeof createRepoMock<ChatMessage>>;
  let service: ChatService;

  beforeEach(() => {
    conversationRepo = createRepoMock<ChatConversation>();
    messageRepo = createRepoMock<ChatMessage>();
    service = new ChatService(conversationRepo as any, messageRepo as any);

    conversationRepo.items.push({
      id: 'conversation-1',
      accountId: 'account-1',
      title: null,
      status: ChatConversationStatus.ACTIVE,
      createdAt: new Date('2026-06-23T08:00:00Z'),
      updatedAt: new Date('2026-06-23T08:00:00Z'),
      lastActivityAt: new Date('2026-06-23T08:00:00Z'),
      closedAt: null,
    } as unknown as ChatConversation);
  });

  it('marks a user message read with a read timestamp scoped to the owning account', async () => {
    messageRepo.items.push({
      id: 'message-1',
      conversationId: 'conversation-1',
      accountId: 'account-1',
      sender: ChatSender.USER,
      text: 'Can you review my workout week?',
      status: ChatStatus.SENT,
      createdAt: new Date('2026-06-23T08:01:00Z'),
      updatedAt: new Date('2026-06-23T08:01:00Z'),
    } as ChatMessage);

    const message = await service.markUserMessageRead('message-1', 'account-1');

    expect(message.status).toBe(ChatStatus.READ);
    expect(message.readAt).toBeInstanceOf(Date);
    expect(messageRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'message-1',
        status: ChatStatus.READ,
        readAt: expect.any(Date),
      }),
    );
  });

  it('creates a thinking assistant placeholder and touches the conversation', async () => {
    const message = await service.createThinkingMessage(
      'conversation-1',
      'account-1',
      'agent-key-1',
    );

    expect(message).toEqual(
      expect.objectContaining({
        conversationId: 'conversation-1',
        accountId: 'account-1',
        sender: ChatSender.AGENT,
        agentKeyId: 'agent-key-1',
        text: '',
        status: ChatStatus.THINKING,
      }),
    );
    expect(conversationRepo.update).toHaveBeenCalledWith('conversation-1', {
      updatedAt: expect.any(Date),
      lastActivityAt: expect.any(Date),
    });
  });

  it('finishes a thinking assistant message with content and token usage', async () => {
    messageRepo.items.push({
      id: 'message-2',
      conversationId: 'conversation-1',
      accountId: 'account-1',
      sender: ChatSender.AGENT,
      agentKeyId: 'agent-key-1',
      text: '',
      status: ChatStatus.THINKING,
      createdAt: new Date('2026-06-23T08:02:00Z'),
      updatedAt: new Date('2026-06-23T08:02:00Z'),
    } as ChatMessage);

    const message = await service.finishThinkingMessage(
      'message-2',
      'account-1',
      'Your workout cadence is consistent.',
      { input: 120, output: 32, total: 152 },
    );

    expect(message).toEqual(
      expect.objectContaining({
        id: 'message-2',
        status: ChatStatus.FINISHED,
        text: 'Your workout cadence is consistent.',
        tokenUsage: { input: 120, output: 32, total: 152 },
      }),
    );
    expect(messageRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'message-2',
        status: ChatStatus.FINISHED,
      }),
    );
  });

  it('rejects finishing a message that is not a thinking assistant placeholder', async () => {
    messageRepo.items.push({
      id: 'message-3',
      conversationId: 'conversation-1',
      accountId: 'account-1',
      sender: ChatSender.USER,
      text: 'Hello',
      status: ChatStatus.SENT,
      createdAt: new Date('2026-06-23T08:03:00Z'),
      updatedAt: new Date('2026-06-23T08:03:00Z'),
    } as ChatMessage);

    await expect(
      service.finishThinkingMessage('message-3', 'account-1', 'Nope'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sets a conversation title only for the owning account', async () => {
    const conversation = await service.setConversationTitle(
      'conversation-1',
      'account-1',
      'Workout consistency review',
    );

    expect(conversation.title).toBe('Workout consistency review');
    expect(conversationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'conversation-1',
        title: 'Workout consistency review',
      }),
    );
  });

  it('closes a conversation without deleting its persisted message history', async () => {
    const conversation = await service.closeConversation(
      'conversation-1',
      'account-1',
    );

    expect(conversation.status).toBe(ChatConversationStatus.CLOSED);
    expect(conversation.closedAt).toBeInstanceOf(Date);
    expect(conversationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'conversation-1',
        status: ChatConversationStatus.CLOSED,
        closedAt: expect.any(Date),
      }),
    );
    expect(conversationRepo.delete).not.toHaveBeenCalled();
  });
});
