import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')

const tokensCss = read('src/styles/tokens.css')
const baseCss = read('src/styles/base.css')
const shellCss = read('src/styles/shell.css')
const globalCss = read('src/styles.css')
const mainSource = read('src/main.jsx')
const brandMarkSource = read('src/components/product/BrandMark.jsx')
const layoutSource = read('src/components/Layout.jsx')
const productHeaderSource = read('src/components/product/ProductHeader.jsx')
const sidebarSource = read('src/components/Sidebar.jsx')
const dailyBriefSource = read('src/pages/Home/components/DailyBrief.jsx')
const landingSource = read('src/pages/Landing.jsx')
const landingCss = read('src/pages/Landing.css')
const designSystemDoc = read('../DESIGN.md')
const brandProfileDoc = read('../docs/product/BRAND_PROFILE.md')

test('the premium interface is structural rather than a global legacy override', () => {
  assert.doesNotMatch(mainSource, /premium-overrides\.css/)
  assert.equal(existsSync(resolve(process.cwd(), 'src/styles/premium-overrides.css')), false)
  assert.doesNotMatch(brandProfileDoc, /warm paper|oxide red|editorial serif/i)
  assert.match(brandProfileDoc, /graphite/i)
  assert.match(brandProfileDoc, /constellation/i)
})

test('visual foundation uses the approved graphite instrument palette', () => {
  assert.match(tokensCss, /--surface-canvas:\s*#080f18/i)
  assert.match(tokensCss, /--surface-panel:\s*#111a27/i)
  assert.match(tokensCss, /--surface-raised:\s*#172234/i)
  assert.match(tokensCss, /--text-primary:\s*#eef3f8/i)
  assert.match(tokensCss, /--text-secondary:\s*#9aa8ba/i)
  assert.doesNotMatch(tokensCss, /Iowan Old Style|Palatino Linotype/)
})

test('visual foundation assigns one stable signal color to every product domain', () => {
  const expectedTokens = {
    today: '#3b82f6',
    cash: '#22c55e',
    habits: '#14b8a6',
    gym: '#f97316',
    music: '#ec4899',
    series: '#f59e0b',
    assistant: '#8b5cf6',
  }

  for (const [domain, color] of Object.entries(expectedTokens)) {
    assert.match(tokensCss, new RegExp(`--domain-${domain}:\\s*${color}`, 'i'))
  }
})

test('typography is self-hosted and separates interface copy from precise data', () => {
  assert.match(tokensCss, /--font-body:\s*"Sora Variable"/)
  assert.match(tokensCss, /--font-data:\s*"JetBrains Mono Variable"/)
  assert.match(baseCss, /font-family:\s*var\(--font-body\)/)
  assert.match(mainSource, /@fontsource-variable\/sora/)
  assert.match(mainSource, /@fontsource-variable\/jetbrains-mono/)
})

test('brand mark is a connected constellation rather than a ledger glyph', () => {
  assert.match(brandMarkSource, /brand-mark__constellation/)
  assert.match(brandMarkSource, /<path[^>]+brand-mark__links/)
  assert.match(brandMarkSource, /<circle/g)
  assert.doesNotMatch(brandMarkSource, /<rect x="4\.5"|M11 13\.5h18/)
})

test('app surfaces prevent horizontal overflow and expose visible keyboard focus', () => {
  assert.match(baseCss, /html,[\s\S]*body,[\s\S]*#root\s*{[^}]*overflow-x:\s*(?:clip|hidden)/s)
  assert.match(baseCss, /:focus-visible\s*{[^}]*outline:/s)
  assert.match(tokensCss, /--touch-target:\s*44px/)
})

test('motion is brief, functional, and disabled when reduced motion is requested', () => {
  assert.match(tokensCss, /--motion-fast:\s*1[23456]0ms/)
  assert.match(tokensCss, /--motion-standard:\s*2[0-6]0ms/)
  assert.match(globalCss, /prefers-reduced-motion:\s*reduce/)
  assert.doesNotMatch(shellCss, /animation:\s*[^;]*(?:infinite|loop)/i)
})

test('design documentation names the premium identity and compositional rules', () => {
  assert.match(designSystemDoc, /Everything you are, in context\./)
  assert.match(designSystemDoc, /Sora Variable/)
  assert.match(designSystemDoc, /JetBrains Mono Variable/)
  assert.match(designSystemDoc, /constellation/i)
  assert.match(designSystemDoc, /asymmetric/i)
  assert.match(designSystemDoc, /320px/)
  assert.match(designSystemDoc, /prefers-reduced-motion/)
})

test('desktop shell presents product identity and one shared product header', () => {
  assert.match(sidebarSource, /<BrandMark/)
  assert.match(sidebarSource, /PRODUCT\.displayName/)
  assert.match(layoutSource, /<ProductHeader/)
  assert.match(productHeaderSource, /Search records or ask a question/)
  assert.match(productHeaderSource, /Capture a new record/)
  assert.match(shellCss, /\.product-header--desktop\s*{/)
  assert.match(shellCss, /\.sidebar\s*{[^}]*width:\s*var\(--sidebar-width\)/s)
})

test('global navigation stays flat while domain navigation owns local routes', () => {
  assert.doesNotMatch(sidebarSource, /spotifyMenuOpen|workoutMenuOpen|financeMenuOpen|mediaMenuOpen|habitsMenuOpen/)
  assert.match(layoutSource, /<DomainNav \/>/)
  assert.doesNotMatch(layoutSource, /nativeApp && <DomainNav/)
  assert.match(sidebarSource, /aria-label="Product navigation"/)
})

test('Today is composed as an asymmetric command center with real domain instruments', () => {
  assert.match(dailyBriefSource, /today-command/)
  assert.match(dailyBriefSource, /daily-signal/)
  assert.match(dailyBriefSource, /MetricValue/)
  assert.match(dailyBriefSource, /SignalRing/)
  assert.match(read('src/styles/domains/today.css'), /grid-template-areas:/)
})

test('landing is a faithful product showcase instead of an editorial ledger', () => {
  assert.match(landingSource, /Everything you are,<br \/>in context\./)
  assert.match(landingSource, /landing-product-stage/)
  assert.match(landingSource, /Managed cloud/)
  assert.match(landingSource, /Self-hosted/)
  assert.doesNotMatch(landingSource, /private ledger for the week|Records, not noise/)
  assert.match(landingCss, /--landing-signal:/)
  assert.match(landingCss, /\.landing-product-stage\s*{/)
})
