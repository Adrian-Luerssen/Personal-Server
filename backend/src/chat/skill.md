# Personal Server Chat Agent Protocol

The backend is a Socket.IO relay with database persistence. It does not generate AI responses. The app owns users, sessions, messages, history, delivery state, and UI updates. The external agent owns reasoning and response generation.

## Namespaces

User clients connect to `/chat/user` with JWT auth:

```js
const socket = io("https://<api-host>/chat/user", {
  auth: { token: "<access-token>" }
});
```

Agent workers connect to `/chat/agent` with either an agent API key or the shared secret:

```js
const socket = io("https://<api-host>/chat/agent", {
  auth: { apiKey: "ps_..." }
});
```

```js
const socket = io("https://<api-host>/chat/agent", {
  auth: { secret: "<COPILOT_AGENT_SECRET>" }
});
```

Secret-authenticated agents must include `accountId` in agent-emitted payloads. API-key-authenticated agents get account scope from the key.

## Message Lifecycle

1. User emits `message:send`.
2. Backend persists the user message as `sender: "user"`, `status: "sent"`.
3. Backend emits `message:new` to the user session room and all connected agents.
4. Agent emits `session:join`.
5. Agent emits `message:read` for the user message.
6. Backend updates the user message to `status: "read"` and sets `readAt`.
7. Agent emits `message:thinking`.
8. Backend creates an assistant placeholder as `sender: "agent"`, `status: "thinking"`.
9. Agent runs the external model/tool system.
10. Agent emits `message:finish`.
11. Backend updates the placeholder to `status: "finished"`, stores response text and optional token usage.
12. Backend emits `message:updated` to the user session room.

## Events Agent Emits

| Event | Payload | Purpose |
|---|---|---|
| `session:join` | `{ conversationId }` | Subscribe to session room updates |
| `message:read` | `{ messageId, accountId? }` | Mark a user message read |
| `message:thinking` | `{ conversationId, accountId? }` | Create assistant placeholder |
| `message:finish` | `{ messageId, accountId?, text, tokenUsage? }` | Finish assistant response |
| `session:title` | `{ conversationId, accountId?, title }` | Set a short session title |

`tokenUsage` shape:

```json
{
  "input": 120,
  "output": 40,
  "cacheWrite": 0,
  "cacheRead": 0,
  "total": 160
}
```

## Events Agent Receives

| Event | Payload | Delivery |
|---|---|---|
| `message:new` | Full message object | All agent sockets |
| `message:updated` | Full message object | Session room |
| `session:closed` | `{ conversationId }` | All agent sockets |
| `session:titled` | `{ conversationId, title }` | Session room |
| `error` | `{ message }` | Direct socket |

Agents should keep responses concise, use the user's language, and never assume access to sessions outside the current conversation.
