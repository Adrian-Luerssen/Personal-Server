import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')

test('Bookplate R is the shared loading identity across boot and inline waits', () => {
  const loader = read('src/components/product/BookplateLoader.jsx')
  const authGuard = read('src/components/AuthGuard.jsx')
  const app = read('src/App.jsx')
  const sharedLoading = read('src/components/shared/LoadingLine.jsx')
  const statePanel = read('src/components/record/StatePanel.jsx')

  assert.match(loader, /bookplate-loader__plate/)
  assert.match(loader, /bookplate-loader__monogram/)
  assert.match(loader, /role="status"/)
  assert.match(loader, /aria-label=\{label\}/)
  assert.match(authGuard, /<BookplateLoader\s+screen/)
  assert.match(app, /<BookplateLoader\s+screen/)
  assert.match(sharedLoading, /<BookplateLoader/)
  assert.match(statePanel, /kind === 'loading'.*BookplateLoader/s)
  assert.doesNotMatch(authGuard, /Checking session|borderTop|spin 1s/)
  assert.doesNotMatch(app, /route-loading[^>]*role="status"/)
})

test('Bookplate R animation has a stable reduced-motion state', () => {
  const css = read('src/record.css')

  assert.match(css, /@keyframes bookplate-frame/)
  assert.match(css, /@keyframes bookplate-monogram/)
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*bookplate-loader/)
})
