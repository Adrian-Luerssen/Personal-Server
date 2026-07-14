import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')
const overview = read('src/pages/Workout/Workout.jsx')
const active = read('src/pages/Workout/WorkoutActive.jsx')

test('Gym overview makes the current session the primary work surface', () => {
  assert.match(overview, /<PageHeading/)
  assert.match(overview, /data-testid="gym-primary-action"/)
  assert.match(overview, /<SummaryStrip/)
  assert.match(overview, /<Register[^>]+title="Recent sessions"/)
  assert.match(overview, /<Register[^>]+title="Training records"/)
  assert.doesNotMatch(overview, /NativeWorkoutView|native-workout-card|native-workout-hero/)
})

test('active workout keeps set logging, rest, undo, and completion in one workbench', () => {
  assert.match(active, /data-testid="gym-active-workbench"/)
  assert.match(active, /role="timer"/)
  assert.match(active, /Set saved/)
  assert.match(active, />Undo</)
  assert.match(active, /finishConfirmationOpen/)
  assert.match(active, /Finish and save/)
  assert.doesNotMatch(active, /window\.confirm/)
})
