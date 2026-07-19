import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('native controls use the shared 44px interaction contract and readable type tokens', () => {
  const css = read('./record.css')

  assert.match(css, /--record-quiet:\s*#8492a6/i)
  assert.match(css, /--record-accent-text:\s*#a999ff/i)
  assert.match(css, /\.native-mobile-app :where\(button, a\[href\], input, select, textarea, summary\)[^{]*\{[^}]*min-height:\s*var\(--record-touch\)/s)
  assert.match(css, /\.native-mobile-app\s*\{[^}]*--record-mobile-copy:\s*14px/s)
})

test('native shell removes the floating API debug control', () => {
  const layout = read('./components/Layout.jsx')

  assert.match(layout, /\{!nativeApp && <ApiStatus\s*\/>\}/)
  assert.doesNotMatch(layout, /<ApiStatus\s*\/>(?!\})/)
})

test('optional Android updates are a non-blocking notice while required updates keep the gate', () => {
  const component = read('./components/NativeUpdateGate.jsx')
  const css = read('./record.css')

  assert.match(component, /native-update-notice/)
  assert.match(component, /update\.required\s*\?\s*\(/)
  assert.match(css, /\.native-update-notice\s*\{[^}]*position:\s*fixed/s)
  assert.doesNotMatch(css, /\.native-update-notice\s*\{[^}]*inset:\s*0/s)
})

test('Records exposes one searchable register instead of duplicate app cards', () => {
  const menu = read('./pages/MobileMenu.jsx')

  assert.doesNotMatch(menu, /native-app-grid/)
  assert.doesNotMatch(menu, /native-app-card/)
  assert.match(menu, /Search records and settings/)
})

test('Series puts the library before collapsible insights on native', () => {
  const media = read('./pages/Media/Media.jsx')

  assert.match(media, /series-mobile-insights/)
  assert.ok(media.indexOf('series-library-page') < media.indexOf('series-mobile-insights'))
  assert.match(media, /Library insights/)
})

test('Gym has one native primary workout action and secondary tools are disclosed', () => {
  const workout = read('./pages/Workout/Workout.jsx')

  assert.match(workout, /actions=\{nativeApp \? null :/)
  assert.match(workout, /record-gym-tools/)
  assert.match(workout, /Training tools/)
})

test('Music has bounded live playback loading and a compact no-data state', () => {
  const music = read('./pages/Spotify/SpotifyPersonal.jsx')

  assert.match(music, /CURRENTLY_PLAYING_TIMEOUT_MS/)
  assert.match(music, /window\.setTimeout/)
  assert.match(music, /hasListeningData/)
  assert.match(music, /record-music-empty/)
})

test('native music ranking renders one ranked list', () => {
  const ranking = read('./pages/Spotify/SpotifyRanking.jsx')

  assert.match(ranking, /nativeApp\s*\?\s*\(/)
  assert.match(ranking, /native-ranking-list/)
  assert.match(ranking, /!nativeApp &&/)
  assert.match(ranking, /color:\s*'var\(--record-text\)'/)
})

test('workout catalogue validates response collections before rendering', () => {
  const exercises = read('./pages/Workout/WorkoutExercises.jsx')

  assert.match(exercises, /function toArray\(/)
  assert.match(exercises, /setExercises\(toArray\(ex\)\)/)
  assert.match(exercises, /setCategories\(toArray\(cat\)\)/)
})

test('route errors offer local recovery and a back action', () => {
  const boundary = read('./components/RouteErrorBoundary.jsx')

  assert.match(boundary, /Try section again/)
  assert.match(boundary, /Go back/)
  assert.match(boundary, /this\.setState\(\{ error: null \}\)/)
})

test('lazy route chunks recover once from a stale deployment before the page mounts', () => {
  const app = read('./App.jsx')
  const recovery = read('./lazyRouteRecovery.mjs')

  assert.match(app, /lazyRoute\(\(\) => import\('\.\/pages\/Spotify\/SpotifyPersonal'\)\)/)
  assert.match(recovery, /isRecoverableRouteImportError/)
  assert.match(recovery, /reload\(\)/)
  assert.match(recovery, /sessionStorage/)
})

test('Habits uses task copy instead of implementation commentary', () => {
  const habits = read('./pages/Habits/Habits.jsx')

  assert.doesNotMatch(habits, /Large actions first/)
  assert.match(habits, /Log each habit for the selected day/)
})

test('mobile settings use focused panels instead of mounting every appearance tool', () => {
  const settings = read('./pages/Settings/Settings.jsx')

  assert.match(settings, /NativeAppearanceSection/)
  assert.match(settings, /appearancePanel/)
  assert.doesNotMatch(settings, /activeSection === 'appearance' && <><Appearance \/><ModuleSettingsSection \/><NativeWidgetsSection/)
})

test('dense native finance settings use one labelled selector', () => {
  const finance = read('./pages/Finance/FinanceSettings.jsx')

  assert.match(finance, /native-finance-settings-select/)
  assert.match(finance, /nativeApp \? \(/)
  assert.match(finance, /Finance area/)
})

test('assistant connection feedback is bounded and keeps the HTTP fallback available', () => {
  const chat = read('./components/ChatPanel.jsx')

  assert.match(chat, /SOCKET_CONNECT_TIMEOUT_MS/)
  assert.match(chat, /current === 'connecting' \? 'offline'/)
  assert.match(chat, /api\.post\(`\/chat\/conversations\/\$\{activeConvId\}\/messages`/)
})
