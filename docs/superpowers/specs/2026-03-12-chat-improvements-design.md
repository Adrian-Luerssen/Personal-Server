# Chat Improvements: Context Toggle, Markdown Rendering, Skill Documentation

**Date:** 2026-03-12
**Status:** Approved

## Problem

The chat panel has several UX issues:
- Agent messages display as raw markdown text (no rendering)
- The "thinking" status persists forever because the agent doesn't know to mark the original message as `delivered` after replying
- The user's original message disappears (replaced by thinking dots) due to the same status issue
- Page context is sent silently — the user can't see it or control it
- The agent skill document lacks formatting guidelines and protocol details

## Solution

Four changes across frontend and backend docs.

### 1. Context Toggle (Frontend)

**Current:** A static context chip shows the current page type in the input area. Context is always sent.

**New behavior:**
- The context chip becomes a toggle button (default: on)
- Clicking it toggles whether `pageContext` is included in the next message
- When off, the chip appears muted/crossed out
- State resets to "on" when the user navigates to a different page

**Implementation:**
- Add `sendContext` boolean state to ChatPanel, default `true`
- Conditionally pass `pageContext` in the `sendMessage` call based on toggle state
- Style the chip as interactive with a dismiss (×) icon when active

### 2. Context Badge on Sent Messages (Frontend)

**Current:** Sent messages show only the text and a status indicator.

**New behavior:**
- If a message was sent with `pageContext`, a small badge appears inside the user's message bubble
- Badge format: compact summary like "finance" or "workout · 30d"
- Derived from the `pageContext` stored on the message object returned by the server

**Implementation:**
- After sending, the server returns the message with `pageContext` field intact
- When rendering user messages, check for `msg.pageContext` and render a `ContextBadge` component
- The badge sits below the message text, inside the bubble, styled small and semi-transparent

### 3. Markdown Rendering for Agent Messages (Frontend)

**Current:** Agent messages render as plain text via `{msg.text}`.

**New behavior:**
- Agent messages render through `react-markdown` with `remark-gfm` plugin
- Supports: bold, italic, headers, lists, tables, code blocks (syntax highlighted), links, images, strikethrough, task lists
- Code blocks use `react-syntax-highlighter` with a dark theme matching the app
- Custom CSS for markdown elements inside chat bubbles (tables, code blocks, etc.)

**Dependencies to install:**
- `react-markdown`
- `remark-gfm`
- `react-syntax-highlighter`

**Implementation:**
- Create a `MarkdownMessage` component wrapping `ReactMarkdown`
- Custom renderers for `table`, `code`, `a` (open in new tab), `img` (max-width constraint)
- Agent message bubbles use `<MarkdownMessage text={msg.text} />` instead of `{msg.text}`
- User messages remain plain text (they wrote it, they know what it says)
- CSS additions to `ChatPanel.css` for markdown elements within `.chat-msg.agent`

### 4. Skill Document Updates (Backend docs)

Update `backend/docs/agent-skill.md` with three new sections:

**A. Message Status Protocol (update existing Section 4)**

Clarify that after sending a reply, the agent MUST update the original user message status to `delivered`. The complete flow:

```
1. Poll GET /api/v1/chat/unread → get messages with status "sent"
2. PATCH message status → "read"
3. PATCH message status → "thinking"
4. Process and query data
5. POST reply to conversation
6. PATCH original message status → "delivered"  ← THIS IS NEW/EMPHASIZED
```

Without step 6, the user sees eternal thinking dots and their original message text is hidden.

**B. Response Formatting Guide (new section)**

Tell the agent how to format replies:
- Use markdown headers (`##`, `###`) to separate sections
- Use bullet lists for itemized data
- Use tables for comparisons (max 4 columns to fit mobile)
- Use `**bold**` for emphasis on key numbers
- Use code blocks for any raw data or IDs
- Keep responses concise — no walls of text
- No ASCII-art tables (use proper markdown tables)
- Emojis are acceptable sparingly for visual anchors

**C. Page Context Documentation (update existing Section 6)**

- `pageContext` may be `null` or absent if the user toggled it off
- Always check for its presence before using it
- When present, use it to scope API queries appropriately
- Don't mention the context in the reply unless it's relevant

## Files Changed

| File | Change |
|------|--------|
| `frontend/package.json` | Add react-markdown, remark-gfm, react-syntax-highlighter |
| `frontend/src/components/ChatPanel.jsx` | Context toggle, context badge, MarkdownMessage integration |
| `frontend/src/components/ChatPanel.css` | Markdown element styles, toggle chip styles, context badge styles |
| `backend/docs/agent-skill.md` | Status protocol, formatting guide, context docs |

## No Backend Code Changes

The backend already:
- Stores `pageContext` as JSONB on messages
- Returns it in message responses
- Supports all required status transitions
- Has the full chat agent API implemented

All changes are frontend rendering + documentation.

## Testing

- Verify context toggle sends/omits `pageContext` in API calls
- Verify sent messages with context show the badge
- Verify agent messages render markdown correctly (tables, code, lists, bold, links)
- Verify the skill document is accurate by having an agent follow the updated protocol
