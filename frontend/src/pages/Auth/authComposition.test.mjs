import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const login = readFileSync(new URL('./Login.jsx', import.meta.url), 'utf8')
const register = readFileSync(new URL('./Register.jsx', import.meta.url), 'utf8')

test('authentication has a shared Record frame with useful context', () => {
  for (const source of [login, register]) {
    assert.match(source, /auth-record-context/)
    assert.match(source, /auth-record-context__register/)
    assert.match(source, /Back to Record/)
    assert.doesNotMatch(source, /style=\{\{/)
  }
})

test('authentication preserves native mode switching and form semantics', () => {
  assert.match(login, /auth-mode-switch/)
  assert.match(register, /auth-mode-switch/)
  assert.match(login, /autoComplete="current-password"/)
  assert.match(register, /autoComplete="new-password"/)
})
