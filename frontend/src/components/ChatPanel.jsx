import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Icon } from './icons'
import { api } from '../api'
import { usePageContext } from '../hooks/usePageContext'
import './ChatPanel.css'

const POLL_OPEN_MS = 3000
const POLL_CLOSED_MS = 30000

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
      return <span className="chat-msg-status"><Icon name="check-check" size={12} /></span>
    case 'read':
      return <span className="chat-msg-status"><Icon name="check-check" size={12} style={{ opacity: 1 }} /></span>
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

export default function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('list') // 'list' | 'detail'
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const messagesEndRef = useRef(null)
  const pageContext = usePageContext()

  // Scroll to bottom when messages change
  useEffect(() => {
    if (view === 'detail' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, view])

  // Fetch conversations
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

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async () => {
    if (!activeConvId) return
    try {
      const data = await api.get(`/chat/conversations/${activeConvId}/messages`)
      const msgs = Array.isArray(data) ? data : (data.messages || [])
      setMessages(msgs)
    } catch {
      // silently ignore polling errors
    }
  }, [activeConvId])

  // Compute unread count from conversations
  const computeUnread = useCallback((convList) => {
    const list = convList || conversations
    const count = list.reduce((sum, c) => sum + (c.unread_count || 0), 0)
    setUnreadCount(count)
  }, [conversations])

  // Poll when panel is open + in detail view: poll messages
  useEffect(() => {
    if (!open) return
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
  }, [open, view, activeConvId, fetchMessages, fetchConversations])

  // Poll when panel is closed: check unread
  useEffect(() => {
    if (open) return
    const checkUnread = async () => {
      const list = await fetchConversations()
      computeUnread(list)
    }
    checkUnread()
    const interval = setInterval(checkUnread, POLL_CLOSED_MS)
    return () => clearInterval(interval)
  }, [open, fetchConversations, computeUnread])

  // Open a conversation
  const openConversation = (convId) => {
    setActiveConvId(convId)
    setView('detail')
    setMessages([])
  }

  // Back to list
  const backToList = () => {
    setView('list')
    setActiveConvId(null)
    setMessages([])
    fetchConversations()
  }

  // Create new conversation
  const createConversation = async () => {
    try {
      const data = await api.post('/chat/conversations', { title: 'New conversation' })
      const conv = data.conversation || data
      setConversations(prev => [conv, ...prev])
      openConversation(conv.id)
    } catch {
      // ignore
    }
  }

  // Send message
  const sendMessage = async () => {
    const text = inputText.trim()
    if (!text || !activeConvId || sending) return

    setSending(true)
    setInputText('')

    // Optimistic add
    const tempMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      text,
      status: 'sent',
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      await api.post(`/chat/conversations/${activeConvId}/messages`, {
        text,
        pageContext,
      })
      // Refresh messages to get server response
      await fetchMessages()
    } catch {
      setMessages(prev =>
        prev.map(m => m.id === tempMsg.id ? { ...m, status: 'error' } : m)
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
      {/* Toggle button */}
      {!open && (
        <button className="chat-toggle-btn" onClick={() => setOpen(true)} aria-label="Open chat">
          <Icon name="message-square" size={22} />
          {unreadCount > 0 && (
            <span className="chat-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
      )}

      {/* Panel overlay for click-away close */}
      <div
        className={`chat-panel-overlay${open ? ' open' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className={`chat-panel${open ? ' open' : ''}`}>
        {/* Header */}
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

        {/* List view */}
        {view === 'list' && (
          <div className="chat-conv-list">
            <button className="chat-new-conv-btn" onClick={createConversation}>
              <Icon name="plus" size={16} />
              New Conversation
            </button>
            {conversations.length === 0 && (
              <div className="chat-empty">No conversations yet</div>
            )}
            {conversations.map(conv => (
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

        {/* Detail view */}
        {view === 'detail' && (
          <>
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-empty">Send a message to start</div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`chat-msg ${msg.role === 'user' ? 'user' : 'agent'}`}>
                  {msg.status === 'thinking' ? (
                    <span className="chat-thinking-dots">
                      <span /><span /><span />
                    </span>
                  ) : (
                    msg.text
                  )}
                  {msg.role === 'user' && <StatusIndicator status={msg.status} />}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <div className="chat-context-chip">
                <Icon name="compass" size={12} />
                {pageContext.pageType}
              </div>
              <div className="chat-input-row">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
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
