import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Icon } from './icons'
import { api } from '../api'
import { usePageContext } from '../hooks/usePageContext'
import './ChatPanel.css'

const POLL_OPEN_MS = 5000
const POLL_CLOSED_MS = 60000

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

function ContextBadge({ pageContext }) {
  if (!pageContext || !pageContext.pageType) return null

  const parts = [pageContext.pageType.replace(/-/g, ' ')]
  if (pageContext.filters) {
    const f = pageContext.filters
    if (f.timeframe) parts.push(f.timeframe)
    if (f.from && f.to) parts.push(`${f.from} to ${f.to}`)
    else if (f.from) parts.push(`from ${f.from}`)
  }

  return (
    <div className="chat-msg-context-badge">
      <Icon name="compass" size={10} />
      {parts.join(' / ')}
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
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              customStyle={{
                margin: '0.5rem 0',
                borderRadius: '6px',
                fontSize: '0.8rem',
                padding: '0.75rem',
              }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
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

export default function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('list')
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [sendContext, setSendContext] = useState(true)

  const messagesEndRef = useRef(null)
  const pageContext = usePageContext()

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
      return list
    } catch {
      return []
    }
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!activeConvId) return
    try {
      const data = await api.get(`/chat/conversations/${activeConvId}/messages`)
      const msgs = Array.isArray(data) ? data : (data.messages || [])
      setMessages(msgs)
    } catch {
      // Silently ignore polling errors.
    }
  }, [activeConvId])

  const computeUnread = useCallback((convList) => {
    const list = convList || conversations
    const count = list.reduce((sum, c) => sum + (c.unread_count || 0), 0)
    setUnreadCount(count)
  }, [conversations])

  const startConversationWithPrompt = useCallback(async ({ title, text, pageContext: promptContext }) => {
    try {
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
      setMessages(msgs)
    } catch {
      // Ignore prompt launch errors; chat remains available manually.
    }
  }, [])

  useEffect(() => {
    if (!open) return undefined

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
  }, [open, view, activeConvId, fetchMessages, fetchConversations])

  useEffect(() => {
    if (open) return undefined

    const checkUnread = async () => {
      const list = await fetchConversations()
      computeUnread(list)
    }

    checkUnread()
    const interval = setInterval(checkUnread, POLL_CLOSED_MS)
    return () => clearInterval(interval)
  }, [open, fetchConversations, computeUnread])

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail || {}
      if (!detail.text) return
      startConversationWithPrompt(detail)
    }

    window.addEventListener('personal-server:chat-prompt', handler)
    return () => window.removeEventListener('personal-server:chat-prompt', handler)
  }, [startConversationWithPrompt])

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
      const data = await api.post('/chat/conversations', { title: 'New conversation' })
      const conv = data.conversation || data
      setConversations((prev) => [conv, ...prev])
      openConversation(conv.id)
    } catch {
      // Ignore create conversation errors.
    }
  }

  const sendMessage = async () => {
    const text = inputText.trim()
    if (!text || !activeConvId || sending) return

    setSending(true)
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
      await api.post(`/chat/conversations/${activeConvId}/messages`, {
        text,
        ...(contextToSend ? { pageContext: contextToSend } : {}),
      })
      await fetchMessages()
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMsg.id ? { ...m, status: 'error' } : m))
      )
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
      {!open && (
        <button className="chat-toggle-btn" onClick={() => setOpen(true)} aria-label="Open chat">
          <Icon name="message-square" size={22} />
          {unreadCount > 0 && (
            <span className="chat-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
      )}

      <div
        className={`chat-panel-overlay${open ? ' open' : ''}`}
        onClick={() => setOpen(false)}
      />

      <div className={`chat-panel${open ? ' open' : ''}`}>
        <div className="chat-panel-header">
          {view === 'detail' && (
            <button className="chat-header-btn" onClick={backToList} aria-label="Back">
              <Icon name="arrow-left" size={18} />
            </button>
          )}
          <h3>{view === 'list' ? 'Chat' : 'Conversation'}</h3>
          <button className="chat-header-btn" onClick={() => setOpen(false)} aria-label="Close chat">
            <Icon name="x" size={18} />
          </button>
        </div>

        {view === 'list' && (
          <div className="chat-conv-list">
            <button className="chat-new-conv-btn" onClick={createConversation}>
              <Icon name="plus" size={16} />
              New Conversation
            </button>
            {conversations.length === 0 && (
              <div className="chat-empty">No conversations yet</div>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="chat-conv-item"
                onClick={() => openConversation(conv.id)}
              >
                <div className="chat-conv-item-title">
                  {conv.title || 'Untitled'}
                  <span className="chat-conv-item-time">
                    {formatTime(conv.updated_at || conv.created_at)}
                  </span>
                </div>
                <div className="chat-conv-item-preview">
                  {conv.last_message || 'No messages'}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'detail' && (
          <>
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-empty">Send a message to start</div>
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
                <input
                  type="text"
                  placeholder="Type a message..."
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
          </>
        )}
      </div>
    </>
  )
}
