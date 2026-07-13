import assert from 'node:assert/strict'
import test from 'node:test'

import * as chartTheme from './chartTheme.js'

const { applyChartTheme } = chartTheme

test('chart theme is safe before every optional chart element is registered', () => {
  assert.doesNotThrow(() => applyChartTheme())
  assert.doesNotThrow(() => applyChartTheme())
})

test('chart theme uses the shared product data palette', () => {
  assert.deepEqual(chartTheme.CHART_PALETTE, {
    grid: 'rgba(154, 168, 186, 0.14)',
    text: '#9aa8ba',
    tooltip: '#172234',
    today: '#3b82f6',
    cash: '#22c55e',
    habits: '#14b8a6',
    gym: '#f97316',
    music: '#ec4899',
    series: '#f59e0b',
    assistant: '#8b5cf6',
  })
})
