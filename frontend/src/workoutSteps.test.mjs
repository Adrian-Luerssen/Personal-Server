import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const workoutPath = resolve(process.cwd(), 'src/pages/Workout/Workout.jsx')
const workoutSource = readFileSync(workoutPath, 'utf8')

test('training page treats synced steps as part of the workout dashboard', () => {
  assert.match(workoutSource, /getSyncedActivityMetrics/)
  assert.match(workoutSource, /activitySummary/)
  assert.match(workoutSource, /getSyncedActivityMetrics\(\{ days: 7 \}\)/)
  assert.match(workoutSource, /Steps today/)
  assert.match(workoutSource, /onClick=\{syncSteps\}/)
})

test('training page subscribes to live native step updates', () => {
  assert.match(workoutSource, /subscribeToLiveStepUpdates/)
  assert.match(workoutSource, /mergeLiveStepIntoActivitySummary/)
  assert.match(workoutSource, /Live steps/)
})
