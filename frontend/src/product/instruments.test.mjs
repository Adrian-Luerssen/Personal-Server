import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const componentPaths = [
  'src/components/product/InstrumentPanel.jsx',
  'src/components/product/MetricValue.jsx',
  'src/components/product/SignalRing.jsx',
  'src/components/product/MiniChart.jsx',
  'src/components/product/RecordRow.jsx',
  'src/components/product/InstrumentStates.jsx',
]

test('premium instrument family is available to every product domain', () => {
  for (const path of componentPaths) assert.equal(existsSync(resolve(process.cwd(), path)), true, `${path} should exist`)
})

test('instrument primitives expose accessible semantics and stable state contracts', () => {
  if (!componentPaths.every((path) => existsSync(resolve(process.cwd(), path)))) return
  const source = componentPaths.map((path) => readFileSync(resolve(process.cwd(), path), 'utf8')).join('\n')
  assert.match(source, /aria-labelledby/)
  assert.match(source, /role="progressbar"/)
  assert.match(source, /aria-valuenow/)
  assert.match(source, /<output/)
  assert.match(source, /EmptyInstrument/)
  assert.match(source, /LoadingInstrument/)
  assert.match(source, /data-domain/)
})
