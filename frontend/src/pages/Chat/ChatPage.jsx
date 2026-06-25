import React from 'react'
import ChatPanel from '../../components/ChatPanel'

export default function ChatPage() {
  return (
    <section className="native-chat-page" aria-label="AI assistant">
      <ChatPanel inline />
    </section>
  )
}
