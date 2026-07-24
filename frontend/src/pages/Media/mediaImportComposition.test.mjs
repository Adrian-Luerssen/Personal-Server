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

test('TV Time preview exposes category selection and sends it to the backend', () => {
  assert.match(source, /What to import/)
  assert.match(source, /includedTypes/)
  assert.match(source, /newTypeCounts/)
  assert.match(source, /Anime/)
  assert.match(source, /TV series/)
  assert.match(source, /Movies/)
  assert.match(source, /Keep & merge/)
  assert.match(source, /update progress/)
})
