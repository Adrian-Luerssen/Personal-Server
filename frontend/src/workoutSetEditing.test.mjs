import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const history = readFileSync(new URL('./pages/Workout/WorkoutHistory.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('./record.css', import.meta.url), 'utf8')

test('workout history exposes every set row as an edit action', () => {
  assert.match(history, /className="workout-set-row"[^>]+onClick=\{\(\) => openSetEditor/)
  assert.match(history, /aria-label=\{`Edit \$\{exercise\?\.name/)
  assert.match(history, /api\.patch\(`\/workout\/sets\/\$\{editingSet\.id\}`/)
  assert.match(history, /Save set/)
  assert.match(css, /\.workout-set-row\s*\{[^}]*min-height:\s*48px/s)
})
