import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { io } from 'socket.io-client'
import { Icon } from './icons'
import { api } from '../api'
import { getTokens } from '../auth'
import { getApiBase } from '../config'
import { usePageContext } from '../hooks/usePageContext'
import { formatProvenance } from '../chatProvenance.mjs'

const POLL_OPEN_MS = 5000
const POLL_CLOSED_MS = 60000
const SOCKET_CONNECT_TIMEOUT_MS = 8000

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function StatusIndicator({ status }) {
  switch (status) {
    case 'sent':
      return <span className="chat-msg-status"><Icon name="check" size={12} /></span>
    case 'delivered':
    case 'finished':
      return <span className="chat-msg-status delivered"><Icon name="check-check" size={12} /></span>
    case 'read':
      return <span className="chat-msg-status read"><Icon name="check-check" size={12} /></span>
    case 'thinking':
      return (
        <span className="chat-msg-status">
          <span className="chat-thinking-dots">
            <span /><span /><span />
          </span>
        </span>
      )
    case 'error':
      return <span className="chat-msg-status error"><Icon name="alert-circle" size={12} /></span>
    default:
      return null
  }
}

function normalizeMessage(message) {
  if (!message) return message
  return {
    ...message,
    role: message.role || (message.sender === 'user' ? 'user' : 'agent'),
    created_at: message.created_at || message.createdAt,
    updated_at: message.updated_at || message.updatedAt,
  }
}

function upsertMessage(messages, nextMessage) {
  const normalized = normalizeMessage(nextMessage)
  const index = messages.findIndex((message) => message.id === normalized.id)
  if (index === -1) return [...messages, normalized]
  return messages.map((message, i) => (i === index ? normalized : message))
}

function ContextBadge({ pageContext }) {
  const provenance = formatProvenance(pageContext)
  if (!provenance) return null

  return (
    <div className="chat-msg-context-badge" aria-label="Record provenance">
      <div>
        <Icon name="compass" size={10} />
        <span>{provenance.label}</span>
      </div>
      {provenance.sources.length > 0 ? (
        <ul>
          {provenance.sources.map((source) => <li key={source}>{source}</li>)}
        </ul>
      ) : null}
    </div>
  )
}

function MarkdownMessage({ text }) {
  return (
    <ReactMarkdown
      className="chat-markdown"
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          return !inline && match ? (
            <pre className="chat-code-block" data-language={match[1]}>
              <code {...props}>{String(children).replace(/\n$/, '')}</code>
            </pre>
          ) : (
            <code className="chat-inline-code" {...props}>
              {children}
            </code>
          )
        },
        a({ href, children, ...props }) {
          return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
        },
        img({ src, alt, ...props }) {
          return <img src={src} alt={alt} style={{ maxWidth: '100%', borderRadius: '6px' }} {...props} />
        },
      }}
    >
      {text}
    </ReactMarkdown>
  )
}

export default function ChatPanel({ inline = false }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('list')
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [sendContext, setSendContext] = useState(true)
  const [connectionState, setConnectionState] = useState('idle')
  const [error, setError] = useState('')

  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const pageContext = usePageContext()
  const panelOpen = inline || open
  const connectionLabel = connectionState === 'connected'
    ? 'Socket connected'
    : connectionState === 'connecting'
      ? 'Socket connecting'
      : connectionState === 'idle'
        ? 'Socket idle'
        : 'Socket offline'

  useEffect(() => {
    if (view === 'detail' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, view])

  const fetchConversations = useCallback(async () => {
    try {
      const data = await api.get('/chat/conversations')
      const list = Array.isArray(data) ? data : (data.conversations || [])
      setConversations(list)
      setError('')
      return list
    } catch (requestError) {
      setError(requestError.message || 'Conversations could not be refreshed.')
      return []
    }
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!activeConvId) return
    try {
      const data = await api.get(`/chat/conversations/${activeConvId}/messages`)
      const msgs = Array.isArray(data) ? data : (data.messages || [])
      setMessages(msgs.map(normalizeMessage))
      setError('')
    } catch (requestError) {
      setError(requestError.message || 'Messages could not be refreshed.')
    }
  }, [activeConvId])

  const computeUnread = useCallback((convList) => {
    const list = convList || conversations
    const count = list.reduce((sum, c) => sum + (c.unread_count || 0), 0)
    setUnreadCount(count)
  }, [conversations])

  const startConversationWithPrompt = useCallback(async ({ title, text, pageContext: promptContext }) => {
    try {
      setError('')
      setOpen(true)
      const created = await api.post('/chat/conversations', { title: title || 'AI analysis' })
      const conv = created.conversation || created
      setConversations((prev) => [conv, ...prev])
      setActiveConvId(conv.id)
      setView('detail')
      setMessages([])
      await api.post(`/chat/conversations/${conv.id}/messages`, {
        text,
        ...(promptContext ? { pageContext: promptContext } : {}),
      })
      const data = await api.get(`/chat/conversations/${conv.id}/messages`)
      const msgs = Array.isArray(data) ? data : (data.messages || [])
      setMessages(msgs.map(normalizeMessage))
    } catch (requestError) {
      setError(requestError.message || 'The conversation could not be started.')
    }
  }, [])

  useEffect(() => {
    if (!panelOpen) return undefined
    const { accessToken } = getTokens()
    if (!accessToken) return undefined

    const socketBase = getApiBase().replace(/\/api$/, '')
    let connectionTimer
    const markConnecting = () => {
      setConnectionState('connecting')
      window.clearTimeout(connectionTimer)
      connectionTimer = window.setTimeout(() => {
        setConnectionState((current) => current === 'connecting' ? 'offline' : current)
      }, SOCKET_CONNECT_TIMEOUT_MS)
    }
    markConnecting()
    const socket = io(`${socketBase}/chat/user`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      window.clearTimeout(connectionTimer)
      setConnectionState('connected')
    })
    socket.on('disconnect', () => setConnectionState('offline'))
    socket.on('connect_error', () => {
      window.clearTimeout(connectionTimer)
      setConnectionState('error')
    })
    socket.io.on('reconnect_attempt', markConnecting)

    socket.on('message:new', (message) => {
      const normalized = normalizeMessage(message)
      if (normalized.conversationId === activeConvId) {
        setMessages((prev) => upsertMessage(prev, normalized))
      }
      fetchConversations()
    })

    socket.on('message:updated', (message) => {
      const normalized = normalizeMessage(message)
      if (normalized.conversationId === activeConvId) {
        setMessages((prev) => upsertMessage(prev, normalized))
      }
      fetchConversations()
    })

    socket.on('session:titled', ({ conversationId, title }) => {
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, title } : conversation,
        ),
      )
    })

    socket.on('session:closed', ({ conversationId }) => {
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, status: 'closed' } : conversation,
        ),
      )
    })

    return () => {
      window.clearTimeout(connectionTimer)
      socketRef.current = null
      socket.disconnect()
      setConnectionState('idle')
    }
  }, [panelOpen, activeConvId, fetchConversations])

  useEffect(() => {
    if (!activeConvId || !socketRef.current?.connected) return
    socketRef.current.emit('session:join', { conversationId: activeConvId })
  }, [activeConvId, panelOpen])

  useEffect(() => {
    if (!panelOpen) return undefined

    if (view === 'detail' && activeConvId) {
      fetchMessages()
      const interval = setInterval(fetchMessages, POLL_OPEN_MS)
      return () => clearInterval(interval)
    }

    if (view === 'list') {
      fetchConversations()
      const interval = setInterval(fetchConversations, POLL_OPEN_MS)
      return () => clearInterval(interval)
    }

    return undefined
  }, [panelOpen, view, activeConvId, fetchMessages, fetchConversations])

  useEffect(() => {
    if (panelOpen) return undefined

    const checkUnread = async () => {
      const list = await fetchConversations()
      computeUnread(list)
    }

    checkUnread()
    const interval = setInterval(checkUnread, POLL_CLOSED_MS)
    return () => clearInterval(interval)
  }, [panelOpen, fetchConversations, computeUnread])

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail || {}
      if (!detail.text) return
      startConversationWithPrompt(detail)
    }

    window.addEventListener('personal-server:chat-prompt', handler)
    return () => window.removeEventListener('personal-server:chat-prompt', handler)
  }, [startConversationWithPrompt])

  useEffect(() => {
    if (!inline) return
    const raw = sessionStorage.getItem('personal-server:pending-chat-prompt')
    if (!raw) return
    sessionStorage.removeItem('personal-server:pending-chat-prompt')
    try {
      const detail = JSON.parse(raw)
      if (detail?.text) startConversationWithPrompt(detail)
    } catch {
      // Ignore invalid persisted prompt payloads.
    }
  }, [inline, startConversationWithPrompt])

  const openConversation = (convId) => {
    setActiveConvId(convId)
    setView('detail')
    setMessages([])
  }

  const backToList = () => {
    setView('list')
    setActiveConvId(null)
    setMessages([])
    fetchConversations()
  }

  const createConversation = async () => {
    try {
      setError('')
      const data = await api.post('/chat/conversations', { title: 'New conversation' })
      const conv = data.conversation || data
      setConversations((prev) => [conv, ...prev])
      openConversation(conv.id)
    } catch (requestError) {
      setError(requestError.message || 'A new conversation could not be created.')
    }
  }

  const sendMessage = async () => {
    const text = inputText.trim()
    if (!text || !activeConvId || sending) return

    setSending(true)
    setError('')
    setInputText('')

    const contextToSend = sendContext ? pageContext : null
    const tempMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      text,
      status: 'sent',
      created_at: new Date().toISOString(),
      pageContext: contextToSend,
    }
    setMessages((prev) => [...prev, tempMsg])

    try {
      const payload = {
        conversationId: activeConvId,
        text,
        ...(contextToSend ? { pageContext: contextToSend } : {}),
      }
      if (socketRef.current?.connected) {
        socketRef.current.emit('message:send', payload, (ack) => {
          if (ack?.message) {
            setMessages((prev) =>
              upsertMessage(
                prev.filter((message) => message.id !== tempMsg.id),
                ack.message,
              ),
            )
          } else if (ack?.success === false) {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempMsg.id ? { ...m, status: 'error' } : m))
            )
          }
        })
      } else {
        await api.post(`/chat/conversations/${activeConvId}/messages`, {
          text,
          ...(contextToSend ? { pageContext: contextToSend } : {}),
        })
        await fetchMessages()
      }
    } catch (requestError) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMsg.id ? { ...m, status: 'error' } : m))
      )
      setError(requestError.message || 'The message could not be delivered. It remains visible so you can retry.')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {!inline && !open && (
        <button className="chat-toggle-btn" onClick={() => setOpen(true)} aria-label="Open chat">
          <Icon name="message-square" size={22} />
          {unreadCount > 0 && (
            <span className="chat-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
      )}

      {!inline && (
        <div
          className={`chat-panel-overlay${open ? ' open' : ''}`}
          onClick={() => setOpen(false)}
        />
      )}

      <div className={`chat-panel${panelOpen ? ' open' : ''}${inline ? ' chat-panel--inline' : ''}${view === 'detail' ? ' is-detail' : ' is-list'}`}>
        <div className="chat-panel-header">
          {view === 'detail' && !inline && (
            <button className="chat-header-btn" onClick={backToList} aria-label="Back">
              <Icon name="arrow-left" size={18} />
            </button>
          )}
          <div>
            <span>Private record workspace</span>
            <h3>{view === 'detail' ? conversations.find((item) => item.id === activeConvId)?.title || 'Conversation' : 'Conversations'}</h3>
          </div>
          {!inline && (
            <button className="chat-header-btn" onClick={() => setOpen(false)} aria-label="Close chat">
              <Icon name="x" size={18} />
            </button>
          )}
        </div>

        {panelOpen && (
          <div className="chat-state-row" aria-label="Assistant transport state">
            <span className={`chat-state-pill chat-state-pill--${connectionState}`}>
              <Icon name={connectionState === 'connected' ? 'wifi' : 'wifi-off'} size={12} />
              {connectionLabel}
            </span>
            <span className="chat-state-pill">
              <Icon name="database" size={12} />
              Saved
            </span>
            <span className={`chat-state-pill ${sendContext ? 'is-on' : ''}`}>
              <Icon name="compass" size={12} />
              Context {sendContext ? 'on' : 'off'}
            </span>
          </div>
        )}

        {panelOpen && connectionState !== 'connected' && (
          <div className={`chat-connection-banner chat-connection-banner--${connectionState}`}>
            <Icon name={connectionState === 'connecting' ? 'loader' : 'wifi-off'} size={14} />
            <span>
              {connectionState === 'connecting'
                ? 'Connecting to assistant'
                : connectionState === 'error'
                  ? 'Assistant connection failed. Messages can still be saved.'
                  : 'Assistant offline. Messages will use the saved fallback.'}
            </span>
          </div>
        )}

        {error && <div className="chat-error" role="alert"><Icon name="alert-circle" size={14} /><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><Icon name="x" size={13} /></button></div>}

        <div className="chat-workspace">
          {(inline || view === 'list') && (
            <aside className="chat-conv-list" aria-label="Conversation history">
              <button className="chat-new-conv-btn" onClick={createConversation}>
                <Icon name="plus" size={15} />
                New conversation
              </button>
              <div className="chat-conv-list__label">Recent</div>
              {conversations.length === 0 && <div className="chat-empty chat-empty--compact">No saved conversations</div>}
              {conversations.map((conv) => (
                <button
                  type="button"
                  key={conv.id}
                  className={`chat-conv-item${conv.id === activeConvId ? ' is-active' : ''}`}
                  onClick={() => openConversation(conv.id)}
                >
                  <span className="chat-conv-item-title">
                    {conv.title || 'Untitled'}
                    <small>{formatTime(conv.updated_at || conv.created_at)}</small>
                  </span>
                  <span className="chat-conv-item-preview">{conv.last_message || 'No messages yet'}</span>
                </button>
              ))}
            </aside>
          )}

          {view === 'list' && inline && (
            <section className="chat-welcome" aria-labelledby="assistant-welcome-title">
              <span>Record assistant</span>
              <h2 id="assistant-welcome-title">Ask a question grounded in your life.</h2>
              <p>Record attaches the current page and source names when context is on. You can turn that off before sending.</p>
              <div className="chat-welcome__prompts">
                <button type="button" onClick={() => startConversationWithPrompt({ title: 'Today in brief', text: 'Summarise today from my records and cite the sources you used.', pageContext })}>Summarise today<Icon name="arrow-up-right" size={14} /></button>
                <button type="button" onClick={() => startConversationWithPrompt({ title: 'Needs attention', text: 'What needs my attention across my records right now?', pageContext })}>What needs attention?<Icon name="arrow-up-right" size={14} /></button>
                <button type="button" onClick={() => startConversationWithPrompt({ title: 'Recent patterns', text: 'Compare my recent records and call out any useful pattern.', pageContext })}>Find a recent pattern<Icon name="arrow-up-right" size={14} /></button>
              </div>
            </section>
          )}

          {view === 'detail' && (
            <section className="chat-detail" aria-label="Conversation">
              {inline && <button className="chat-detail__back" onClick={backToList}><Icon name="arrow-left" size={15} />Conversations</button>}
              <div className="chat-messages" aria-live="polite">
              {messages.length === 0 && (
                  <div className="chat-empty"><strong>Start with a concrete question.</strong><span>Context and cited record sources will remain attached to the conversation.</span></div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`chat-msg ${msg.role === 'user' ? 'user' : 'agent'}`}>
                  {msg.role === 'user' ? (
                    <>
                      {msg.text}
                      <ContextBadge pageContext={msg.pageContext} />
                      <StatusIndicator status={msg.status} />
                    </>
                  ) : msg.status === 'thinking' ? (
                    <span className="chat-thinking-dots">
                      <span /><span /><span />
                    </span>
                  ) : (
                    <MarkdownMessage text={msg.text || ''} />
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-area">
              <button
                className={`chat-context-chip ${sendContext ? 'active' : 'inactive'}`}
                onClick={() => setSendContext((prev) => !prev)}
                title={sendContext ? 'Click to disable page context' : 'Click to enable page context'}
              >
                <Icon name="compass" size={12} />
                {pageContext.pageType}
                {sendContext ? (
                  <Icon name="x" size={10} className="chat-context-dismiss" />
                ) : (
                  <Icon name="plus" size={10} className="chat-context-dismiss" />
                )}
              </button>
                <div className="chat-input-row">
                <textarea
                  rows={2}
                  aria-label="Message Assistant"
                  placeholder="Ask from your records…"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                <button
                  className="chat-send-btn"
                  onClick={sendMessage}
                  disabled={!inputText.trim() || sending}
                  aria-label="Send message"
                >
                  <Icon name="send" size={16} />
                </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
