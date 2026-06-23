import { ChatRelayBus } from './chat-relay.bus';

describe('ChatRelayBus', () => {
  it('routes user session, agent session, and agent broadcast events', () => {
    const relay = new ChatRelayBus();
    const userGateway = {
      emitToSession: jest.fn(),
    };
    const agentGateway = {
      emitToSession: jest.fn(),
      emitToAll: jest.fn(),
    };
    const payload = { id: 'message-1', text: 'Hello' };

    relay.registerUserGateway(userGateway);
    relay.registerAgentGateway(agentGateway);

    relay.emitToUserSession('conversation-1', 'message:new', payload);
    relay.emitToAgentSession('conversation-1', 'message:read', payload);
    relay.broadcastToAllAgents('message:new', payload);

    expect(userGateway.emitToSession).toHaveBeenCalledWith(
      'conversation-1',
      'message:new',
      payload,
    );
    expect(agentGateway.emitToSession).toHaveBeenCalledWith(
      'conversation-1',
      'message:read',
      payload,
    );
    expect(agentGateway.emitToAll).toHaveBeenCalledWith(
      'message:new',
      payload,
    );
  });
});
