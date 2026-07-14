const SURFACES = [
  { match: /^\/home$/, domain: 'today', eyebrow: 'Today', title: 'Daily brief' },
  { match: /^\/finance\/(transactions)?$/, domain: 'cash', eyebrow: 'Cash', title: 'Ledger' },
  { match: /^\/finance\/budgets/, domain: 'cash', eyebrow: 'Cash', title: 'Budgets' },
  { match: /^\/finance\/trends/, domain: 'cash', eyebrow: 'Cash', title: 'Analysis' },
  { match: /^\/finance\/(import|settings)/, domain: 'cash', eyebrow: 'Cash', title: 'Cash setup' },
  { match: /^\/workout\/active/, domain: 'gym', eyebrow: 'Gym', title: 'Active workout' },
  { match: /^\/workout\/history/, domain: 'gym', eyebrow: 'Gym', title: 'History' },
  { match: /^\/workout\/exercises/, domain: 'gym', eyebrow: 'Gym', title: 'Exercises' },
  { match: /^\/workout\/bodyweight/, domain: 'gym', eyebrow: 'Gym', title: 'Progress' },
  { match: /^\/workout/, domain: 'gym', eyebrow: 'Gym', title: 'Training today' },
  { match: /^\/habits\/settings/, domain: 'habits', eyebrow: 'Habits', title: 'Plan and history' },
  { match: /^\/habits/, domain: 'habits', eyebrow: 'Habits', title: 'Today' },
  { match: /^\/spotify\/ranking/, domain: 'music', eyebrow: 'Music', title: 'Ranking' },
  { match: /^\/spotify\/global/, domain: 'music', eyebrow: 'Music', title: 'Global' },
  { match: /^\/spotify/, domain: 'music', eyebrow: 'Music', title: 'Listening' },
  { match: /^\/media\/(import|settings)/, domain: 'series', eyebrow: 'Series', title: 'Series setup' },
  { match: /^\/media/, domain: 'series', eyebrow: 'Series', title: 'My list' },
  { match: /^\/chat/, domain: 'assistant', eyebrow: 'Assistant', title: 'Record analysis' },
  { match: /^\/menu/, domain: 'today', eyebrow: 'Record', title: 'Records' },
  { match: /^\/settings/, domain: 'assistant', eyebrow: 'Record', title: 'Settings' },
]

const DEFAULT_SURFACE = Object.freeze({ domain: 'today', eyebrow: 'Record', title: 'Your records' })

export function getProductHeader(pathname = '') {
  const surface = SURFACES.find((item) => item.match.test(pathname)) || DEFAULT_SURFACE
  return { domain: surface.domain, eyebrow: surface.eyebrow, title: surface.title }
}

export function getProductBackTarget(pathname = '') {
  if (/^\/workout\/(active|history|exercises|bodyweight|import)/.test(pathname)) return '/workout'
  if (/^\/finance\//.test(pathname) && pathname !== '/finance/transactions') return '/finance/transactions'
  if (/^\/habits\//.test(pathname)) return '/habits'
  if (/^\/spotify\//.test(pathname) && pathname !== '/spotify/personal') return '/spotify'
  if (/^\/media\//.test(pathname)) return '/media'
  return null
}
