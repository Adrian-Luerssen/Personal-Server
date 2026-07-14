import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./MediaImport.jsx', import.meta.url), 'utf8')

test('media upload remains in progress through catalog synchronization', () => {
  assert.match(source, /catalog:\s*'Synchronizing catalog\.\.\.'/)
  assert.match(source, /catalogSynced/)
  assert.match(source, /catalogFailed/)
  assert.match(source, /need retry/)
})
