import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')

const mainSource = read('src/main.jsx')
const layoutSource = read('src/components/Layout.jsx')
const sidebarSource = read('src/components/Sidebar.jsx')
const headerSource = read('src/components/product/ProductHeader.jsx')
const markSource = read('src/components/product/BrandMark.jsx')
const mobileNavSource = read('src/components/product/MobileGlobalNav.jsx')
const brandSource = read('src/product/brand.mjs')
const designDoc = read('../DESIGN.md')
const brandDoc = read('../docs/product/BRAND_PROFILE.md')

test('the application loads one ordered Record stylesheet instead of inherited theme layers', () => {
  assert.match(mainSource, /import ['"]\.\/record\.css['"]/)
  assert.doesNotMatch(mainSource, /styles\.css|styles\/domains|styles\/tokens|styles\/shell|styles\/primitives/)
  assert.equal(existsSync(resolve(process.cwd(), 'src/record.css')), true)
})

test('Record uses one brand accent and semantic state colors, not domain page themes', () => {
  const css = read('src/record.css')
  assert.match(css, /--record-accent:\s*#7c5cff/i)
  assert.match(css, /--record-canvas:\s*#090e14/i)
  assert.match(css, /--record-line:\s*#233041/i)
  assert.match(css, /--record-success:\s*#32d583/i)
  assert.doesNotMatch(css, /--domain-(?:cash|gym|habits|music|series|assistant)/)
  assert.doesNotMatch(mainSource, /styles\/domains/)
})

test('the customer identity is Record with the Bookplate R mark', () => {
  assert.match(brandSource, /displayName:\s*['"]Record['"]/) // customer-facing name
  assert.match(brandSource, /Keep the life you live useful\./)
  assert.match(markSource, /brand-mark__bookplate/)
  assert.match(markSource, /brand-mark__plate/)
  assert.match(markSource, /brand-mark__monogram/)
  assert.doesNotMatch(markSource, /indexed-spine|brand-mark__rail|brand-mark__tick|<circle/)
})

test('Bookplate R is the browser, installable web, and native launcher identity', () => {
  const html = read('index.html')
  const viteConfig = read('vite.config.mjs')
  const nativeMark = read('android/app/src/main/res/drawable/ps_launcher_foreground.xml')

  assert.match(html, /favicon\.svg\?v=bookplate-r/)
  assert.match(html, /favicon-32\.png\?v=bookplate-r/)
  assert.match(html, /apple-touch-icon\.png\?v=bookplate-r/)
  assert.match(viteConfig, /pwa-maskable-512\.png\?v=bookplate-r/)
  assert.match(nativeMark, /#A999FF/i)
  assert.match(nativeMark, /#7C5CFF/i)
  assert.doesNotMatch(nativeMark, /#7DD3FC|#34D399/i)

  for (const asset of [
    'public/favicon-32.png',
    'public/apple-touch-icon.png',
    'public/pwa-192.png',
    'public/pwa-512.png',
    'public/pwa-maskable-512.png',
    'android/app/src/main/res/mipmap-mdpi/ic_launcher.png',
    'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
  ]) {
    assert.equal(existsSync(resolve(process.cwd(), asset)), true, `${asset} must exist`)
  }
})

test('the foundation keeps self-hosted type, visible focus, touch targets, and reduced motion', () => {
  const css = read('src/record.css')
  assert.match(mainSource, /@fontsource-variable\/sora/)
  assert.match(mainSource, /@fontsource-variable\/jetbrains-mono/)
  assert.match(css, /--record-font-ui:\s*['"]Sora Variable['"]/)
  assert.match(css, /--record-font-data:\s*['"]JetBrains Mono Variable['"]/)
  assert.match(css, /--record-touch:\s*44px/)
  assert.match(css, /:focus-visible\s*{/)
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
  assert.match(css, /overflow-x:\s*(?:clip|hidden)/)
})

test('desktop navigation is a flat Record rail with explicit groups', () => {
  assert.match(sidebarSource, /Record rail/)
  assert.match(sidebarSource, /Records/)
  assert.match(sidebarSource, /Workspace/)
  assert.match(sidebarSource, /System/)
  assert.match(sidebarSource, /Assistant/)
  assert.match(sidebarSource, /Settings/)
  assert.doesNotMatch(sidebarSource, /--nav-signal|domain-/)
})

test('the route bar owns context and capture without duplicating Assistant', () => {
  assert.match(headerSource, /record-route-bar/)
  assert.match(headerSource, /New record/)
  assert.match(headerSource, /Last checked/)
  assert.doesNotMatch(headerSource, /Search records or ask a question/)
  assert.doesNotMatch(layoutSource, /<ChatPanel/)
})

test('native global navigation uses Records and does not duplicate an app switcher', () => {
  const navigationSource = read('src/product/navigation.mjs')
  assert.match(navigationSource, /label:\s*['"]Records['"]/)
  assert.match(navigationSource, /label:\s*['"]Today['"]/)
  assert.match(navigationSource, /label:\s*['"]Capture['"]/)
  assert.match(navigationSource, /label:\s*['"]Assistant['"]/)
  assert.match(navigationSource, /label:\s*['"]You['"]/)
  assert.doesNotMatch(headerSource, /app switcher|Apps/)
})

test('shared register primitives exist for purpose-built route composition', () => {
  const registerSource = read('src/components/record/Register.jsx')
  const headingSource = read('src/components/record/PageHeading.jsx')
  const stateSource = read('src/components/record/StatePanel.jsx')
  assert.match(registerSource, /record-register/)
  assert.match(registerSource, /record-register__row/)
  assert.match(headingSource, /record-page-heading/)
  assert.match(stateSource, /loading|empty|error|offline/)
})

test('the design sources name the new product and reject the retired redesign language', () => {
  for (const source of [designDoc, brandDoc]) {
    assert.match(source, /Customer name:\s*\*\*Record\*\*/i)
    assert.match(source, /Keep the life you live useful\./)
    assert.match(source, /register/i)
    assert.doesNotMatch(source, /constellation|Everything you are, in context\./i)
  }
})
