import assert from 'node:assert/strict'
import test from 'node:test'

import { applyChartTheme } from './chartTheme.js'

test('chart theme is safe before every optional chart element is registered', () => {
  assert.doesNotThrow(() => applyChartTheme())
  assert.doesNotThrow(() => applyChartTheme())
})
