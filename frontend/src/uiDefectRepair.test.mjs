import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')

test('capture sheet has a complete responsive dialog layout contract', () => {
  const source = read('src/components/product/CaptureSheet.jsx')
  const css = read('src/record.css')

  assert.match(source, /capture-sheet__actions/)
  assert.match(css, /\.capture-sheet-layer\s*{/)
  assert.match(css, /\.capture-sheet\s*{/)
  assert.match(css, /\.capture-sheet__actions\s*{/)
  assert.match(css, /safe-area-inset-bottom/)
})

test('compound search inputs reserve a layout slot for their icons', () => {
  const input = read('src/components/product/IconInput.jsx')
  const media = read('src/pages/Media/Media.jsx')
  const css = read('src/record.css')

  assert.match(input, /record-icon-input__icon/)
  assert.match(input, /aria-hidden="true"/)
  assert.match(media, /<IconInput/)
  assert.match(css, /\.record-icon-input\s*{[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\)/s)
  assert.doesNotMatch(css, /media-search-input-wrap \.media-search-icon\s*{[^}]*position:\s*absolute/s)
})

test('register actions never fall back to browser-default button chrome', () => {
  const workout = read('src/pages/Workout/Workout.jsx')
  const css = read('src/record.css')

  assert.match(workout, /record-register-action/)
  assert.match(css, /\.record-register-action\s*{[^}]*background:\s*transparent[^}]*border:/s)
  assert.match(css, /\.record-register-action\s*{[^}]*min-height:\s*40px/s)
})

test('yearly activity uses deliberate sizing and exposes a zero state', () => {
  const heatmap = read('src/components/habits/HabitHeatmap.jsx')
  const habits = read('src/pages/Habits/Habits.jsx')
  const css = read('src/record.css')

  assert.match(heatmap, /habit-heatmap__empty/)
  assert.match(heatmap, /habit-heatmap__viewport/)
  assert.match(habits, /habits-panel--yearly/)
  assert.match(css, /\.habits-panel--yearly\s*{[^}]*grid-column:\s*1\s*\/\s*-1/s)
  assert.match(css, /\.habit-heatmap__viewport\s*{[^}]*overflow-x:\s*auto/s)
})

test('category colour editing is labelled and shows the selected value', () => {
  const field = read('src/components/product/ColorField.jsx')
  const exercises = read('src/pages/Workout/WorkoutExercises.jsx')

  assert.match(field, /record-color-field__value/)
  assert.match(field, /Choose colour/)
  assert.match(field, /type="color"/)
  assert.match(exercises, /<ColorField/)
})
