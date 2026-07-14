import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./Modal.jsx', import.meta.url), 'utf8')

test('shared dialogs trap focus, close on Escape, and restore focus', () => {
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /role="dialog"/)
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(source, /event\.key (?:===|!==) 'Tab'/)
  assert.match(source, /previousFocus.*focus/)
})

test('history uses the same accessible dialog foundation', () => {
  assert.match(source, /<Modal title="All Recent Streams"/)
})
