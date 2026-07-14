import React from 'react'
import ChatPanel from '../../components/ChatPanel'
import { PageHeading } from '../../components/record'

export default function ChatPage() {
  return (
    <section className="record-assistant-page" aria-label="Record assistant">
      <PageHeading eyebrow="Workspace" title="Assistant">
        <p>Ask from your private records. Every answer keeps its source context visible.</p>
      </PageHeading>
      <ChatPanel inline />
    </section>
  )
}
