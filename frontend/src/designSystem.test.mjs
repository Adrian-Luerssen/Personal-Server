import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))
const dependencies = JSON.stringify(packageJson.dependencies || {})
const landingSource = readFileSync(resolve(process.cwd(), 'src/pages/Landing.jsx'), 'utf8')
const landingCss = readFileSync(resolve(process.cwd(), 'src/pages/Landing.css'), 'utf8')
const globalCss = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
const layoutSource = readFileSync(resolve(process.cwd(), 'src/components/Layout.jsx'), 'utf8')

test('landing page uses media-led premium structure with real motion hooks', () => {
  assert.match(dependencies, /"gsap"/)
  assert.match(landingSource, /gsap/)
  assert.match(landingSource, /ScrollTrigger/)
  assert.match(landingSource, /landing-bento-grid/)
  assert.match(landingSource, /landing-horizontal-accordion/)
  assert.match(landingSource, /picsum\.photos\/seed\/personal-data/)
  assert.doesNotMatch(landingSource, /\bSECTION\b|\bQUESTION\b|\bABOUT US\b/)
  assert.doesNotMatch(landingSource, /[—–]/)
})

test('global design tokens avoid generic defaults and block horizontal page overflow', () => {
  assert.doesNotMatch(globalCss, /--font-body:\s*['"]Inter['"]/)
  assert.match(globalCss, /--ease-premium:\s*cubic-bezier/)
  assert.match(globalCss, /--surface-glass:/)
  assert.match(globalCss, /html,\s*body,\s*#root\s*{[^}]*overflow-x:\s*hidden/s)
  assert.match(globalCss, /\.card\s*{[^}]*box-shadow:\s*var\(--shadow-depth-content\)/s)
  assert.match(globalCss, /\.btn\s*{[^}]*min-height:\s*2\.75rem/s)
})

test('native shell keeps app switching compact and section tabs thumb reachable', () => {
  assert.match(layoutSource, /native-app-header__selector-label/)
  assert.doesNotMatch(layoutSource, /<span>{currentApp\.label}<\/span>/)
  assert.match(globalCss, /--native-header-height:\s*4\.4rem/)
  assert.match(globalCss, /--native-tabbar-height:\s*4\.85rem/)
  assert.match(globalCss, /body\.native-mobile-app \.sidebar \.nav-link\s*{[^}]*min-height:\s*3\.35rem/s)
  assert.match(globalCss, /\.native-update-gate__panel\s*{[^}]*overflow-x:\s*hidden/s)
})

test('landing CSS has gapless bento and reduced-motion coverage', () => {
  assert.match(landingCss, /\.landing-bento-grid\s*{[^}]*grid-auto-flow:\s*dense/s)
  assert.match(landingCss, /\.landing-media-frame\s*{[^}]*aspect-ratio:\s*16\s*\/\s*10/s)
  assert.match(landingCss, /prefers-reduced-motion:\s*reduce/)
})
