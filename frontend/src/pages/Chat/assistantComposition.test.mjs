import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const page = await readFile(new URL('./ChatPage.jsx', import.meta.url), 'utf8')
const panel = await readFile(new URL('../../components/ChatPanel.jsx', import.meta.url), 'utf8')

test('Assistant is a full Record workspace with persistent conversation context', () => {
  assert.match(page, /<PageHeading/)
  assert.match(panel, /chat-workspace/)
  assert.match(panel, /chat-conv-list/)
  assert.match(panel, /chat-detail/)
  assert.match(panel, /Record provenance/)
  assert.match(panel, /Context \{sendContext \? 'on' : 'off'\}/)
  assert.doesNotMatch(panel, /ChatPanel\.css/)
})

test('Assistant failures are visible instead of silently discarded', () => {
  assert.match(panel, /setError\(/)
  assert.match(panel, /role="alert"/)
})
