import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const landingSource = readFileSync(resolve(process.cwd(), 'src/pages/Landing.jsx'), 'utf8')
const landingCss = readFileSync(resolve(process.cwd(), 'src/pages/Landing.css'), 'utf8')
const globalCss = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
const designSystemDoc = readFileSync(resolve(process.cwd(), '../DESIGN.md'), 'utf8')
const gradientMeshCss = readFileSync(resolve(process.cwd(), 'src/components/GradientMesh.css'), 'utf8')
const layoutSource = readFileSync(resolve(process.cwd(), 'src/components/Layout.jsx'), 'utf8')
const habitsCss = readFileSync(resolve(process.cwd(), 'src/pages/Habits/Habits.css'), 'utf8')
const habitsSource = readFileSync(resolve(process.cwd(), 'src/pages/Habits/Habits.jsx'), 'utf8')
const homeSource = readFileSync(resolve(process.cwd(), 'src/pages/Home.jsx'), 'utf8')
const shellCss = readFileSync(resolve(process.cwd(), 'src/styles/shell.css'), 'utf8')
const dailyBriefSource = readFileSync(resolve(process.cwd(), 'src/pages/Home/components/DailyBrief.jsx'), 'utf8')
const actionTimelineSource = readFileSync(resolve(process.cwd(), 'src/pages/Home/components/ActionTimeline.jsx'), 'utf8')
const mobileMenuSource = readFileSync(resolve(process.cwd(), 'src/pages/MobileMenu.jsx'), 'utf8')
const settingsSource = readFileSync(resolve(process.cwd(), 'src/pages/Settings/Settings.jsx'), 'utf8')
const loginSource = readFileSync(resolve(process.cwd(), 'src/pages/Auth/Login.jsx'), 'utf8')
const registerSource = readFileSync(resolve(process.cwd(), 'src/pages/Auth/Register.jsx'), 'utf8')

test('landing page uses private-ledger structure instead of SaaS motion theater', () => {
  assert.doesNotMatch(landingSource, /gsap|ScrollTrigger/)
  assert.match(landingSource, /landing-ledger-preview/)
  assert.match(landingSource, /landing-bento-grid/)
  assert.match(landingSource, /landing-workflow-grid/)
  assert.match(landingSource, /landing-difference-table/)
  assert.match(landingSource, /landing-privacy-panel/)
  assert.match(landingSource, /INSTRUMENT_PREVIEWS/)
  assert.match(landingSource, /RECORD_TYPES/)
  assert.match(landingSource, /WORKFLOW_STEPS/)
  assert.match(landingSource, /refreshIfPossible/)
  assert.match(landingSource, /Cached locally/)
  assert.match(landingSource, /Verified when changed/)
  assert.match(landingSource, /Records, not noise/)
  assert.match(landingSource, /Managed for convenience\. Self-hosted for control\./)
  assert.doesNotMatch(landingSource, /landing-stats|AnimatedMetric/)
  assert.doesNotMatch(landingSource, /landing-horizontal-accordion|picsum\.photos/)
  assert.doesNotMatch(landingSource, /\bSECTION\b|\bQUESTION\b|\bABOUT US\b/)
})

test('global design tokens avoid generic defaults and block horizontal page overflow', () => {
  assert.doesNotMatch(globalCss, /--font-body:\s*['"]Inter['"]/)
  assert.match(globalCss, /--ease-premium:\s*cubic-bezier/)
  assert.match(globalCss, /--surface-glass:/)
  assert.match(globalCss, /--color-bg-base:\s*#050607/)
  assert.match(globalCss, /--radius-xl:\s*12px/)
  assert.match(globalCss, /html,\s*body,\s*#root\s*{[^}]*overflow-x:\s*hidden/s)
  assert.match(globalCss, /\.card\s*{[^}]*box-shadow:\s*var\(--shadow-depth-content\)/s)
  assert.match(globalCss, /button,[\s\S]*min-height:\s*44px/)
})

test('shared backgrounds stay structural instead of decorative blobs', () => {
  assert.match(gradientMeshCss, /linear-gradient/)
  assert.doesNotMatch(gradientMeshCss, /radial-gradient|orb|blob|particle/i)
  assert.match(globalCss, /--glass-blur:\s*0px;/)
})

test('native shell keeps app switching compact and section tabs thumb reachable', () => {
  assert.match(layoutSource, /native-app-header__selector-label">Apps/)
  assert.doesNotMatch(layoutSource, /<span>{currentApp\.label}<\/span>/)
  assert.doesNotMatch(layoutSource, /current\.subtitle\}\s*-\s*v\{APP_VERSION\}/)
  assert.match(globalCss, /Private Ledger Design System V2[\s\S]*--native-header-height:\s*3\.35rem/)
  assert.match(globalCss, /Private Ledger Design System V2[\s\S]*--native-tabbar-height:\s*3\.45rem/)
  assert.match(shellCss, /\.mobile-global-nav \.native-tabbar__item\s*{[^}]*min-height:\s*3\.45rem/s)
  assert.match(shellCss, /\.mobile-global-nav \.native-tabbar__item\.is-active\s*{[^}]*color:\s*var\(--brand-accent\)/s)
  assert.match(globalCss, /\.native-update-gate__panel\s*{[^}]*overflow-x:\s*hidden/s)
})

test('product copy avoids generic dashboard storytelling language', () => {
  assert.doesNotMatch(homeSource, /What the week is trying to tell you|Deep analysis stays one click away|Performance soundtrack/)
  assert.doesNotMatch(landingSource, /dashboard noise|trying to tell you|premium weekly review|stack of admin dashboards/)
  assert.match(landingSource, /Your private ledger for the week/)
  assert.match(dailyBriefSource, /<h1>Today<\/h1>/)
  assert.match(actionTimelineSource, /Needs your attention/)
})

test('landing refresh uses ruled ledger surfaces instead of decorative card haze', () => {
  assert.match(landingCss, /\.landing-ledger-preview\s*{/)
  assert.match(landingCss, /\.landing-ledger-visual\s*{/)
  assert.match(landingCss, /\.landing-workflow-grid\s*{/)
  assert.match(landingCss, /\.landing-difference-table\s*{/)
  assert.match(landingCss, /\.landing-privacy-panel\s*{/)
  assert.match(landingCss, /\.landing-bento-grid\s*{[^}]*gap:\s*0;/s)
  assert.doesNotMatch(landingCss, /radial-gradient|orb|blob|particle/i)
})

test('product screens avoid landing-page whitespace reservations', () => {
  assert.doesNotMatch(globalCss, /\.native-empty-state\s*{[^}]*min-height:\s*11rem/s)
  assert.doesNotMatch(globalCss, /\.native-dashboard-hero\s*{[^}]*min-height:\s*8\.5rem/s)
  assert.doesNotMatch(globalCss, /\.native-primary-action\s*{[^}]*min-height:\s*9rem/s)
  assert.doesNotMatch(globalCss, /\.native-finance-hero\s*{[^}]*min-height:\s*6\.75rem/s)
  assert.doesNotMatch(habitsCss, /\.native-habits-hero\s*{[^}]*min-height:\s*7\.5rem/s)
  assert.doesNotMatch(habitsCss, /\.habits-empty\s*{[^}]*min-height:\s*220px/s)
  assert.match(designSystemDoc, /Product screens should not contain landing-style vertical reservations/)
})

test('native habit controls stay neutral until the user chooses a state', () => {
  assert.doesNotMatch(habitsSource, /className="native-section-tabs"/)
  assert.match(habitsSource, /native-habits-date-rail/)
  assert.match(habitsCss, /\.native-habit-log-card--success\s*{[^}]*border-color:\s*rgba\(74,\s*222,\s*128,\s*0\.24\)/s)
  assert.match(habitsCss, /\.native-habit-actions button\s*{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.035\)/s)
  assert.match(habitsCss, /\.native-habit-actions button\.is-active\s*{[^}]*background:\s*color-mix\(in srgb, var\(--status-color\) 20%, transparent\)/s)
  assert.match(habitsCss, /\.habit-numeric-stepper\s*{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/s)
})

test('landing CSS has gapless bento and reduced-motion coverage', () => {
  assert.match(landingCss, /\.landing-bento-grid\s*{[^}]*grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\);[^}]*gap:\s*0;/s)
  assert.match(landingCss, /\.landing-ledger-preview\s*{[^}]*border-radius:\s*10px/s)
  assert.match(landingCss, /prefers-reduced-motion:\s*reduce/)
})

test('design system documents concrete color icon motion and data rules', () => {
  assert.match(designSystemDoc, /#050607/)
  assert.match(designSystemDoc, /#7dd3fc/)
  assert.match(designSystemDoc, /lucide-react/)
  assert.match(designSystemDoc, /Fast feedback:\s*120ms to 160ms/)
  assert.match(designSystemDoc, /Data visualization:/)
  assert.match(designSystemDoc, /Widgets and lock-screen surfaces/)
  assert.match(designSystemDoc, /ruled surfaces/)
  assert.match(designSystemDoc, /RecordPrimitives\.jsx/)
  assert.match(designSystemDoc, /Bad WebGL is worse than no WebGL/)
  assert.match(globalCss, /\.finance-desktop-page/)
  assert.match(globalCss, /\.finance-ledger-table/)
  assert.match(globalCss, /\.record-review-panel/)
})

test('customer presentation uses the product brand and domain language', () => {
  assert.doesNotMatch(mobileMenuSource, /label: 'Workout'|label: 'Finance'|label: 'Media Library'/)
  assert.match(mobileMenuSource, /label: 'Gym'/)
  assert.match(mobileMenuSource, /label: 'Cash'/)
  assert.match(mobileMenuSource, /label: 'Series'/)
  assert.doesNotMatch(loginSource, /auth-brand__title">Personal Server/)
  assert.doesNotMatch(registerSource, /auth-brand__title">Personal Server/)
  assert.match(settingsSource, /<h1>You<\/h1>/)
  assert.match(settingsSource, /Privacy/)
  assert.match(settingsSource, /Developer access/)
})
