import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./Habits.jsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../../record.css', import.meta.url), 'utf8')

test('daily habit groups and rows use the styled structural contract', () => {
  assert.match(source, /className="habit-group"/)
  assert.match(source, /className="habit-group__header"/)
  assert.match(source, /className="habit-log-row__actions"/)
  assert.match(source, /className="habit-log-row__progress"/)
  assert.match(styles, /\.habit-log-row__actions\s*\{/)
  assert.match(styles, /\.habit-log-row__progress\s*\{/)
})

test('habit state remains readable without relying on ring colour', () => {
  assert.match(source, /habit-log-row__status/)
  assert.match(source, /statusMeta\.shortLabel/)
  assert.match(source, />Open</)
})
