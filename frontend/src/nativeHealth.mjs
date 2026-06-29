import { isNativeMobileApp } from './mobilePlatform.js'

export const HEALTH_CONNECT_AUTO_SYNC_KEY = 'personal-server-health-connect-last-sync'

function getPlugin() {
  if (!isNativeMobileApp()) return null
  return window.Capacitor?.Plugins?.PersonalServerHealth || null
}

export function normalizeHealthConnectStatus(status) {
  const raw = status?.status || 'unsupported'
  if (raw === 'available') {
    return {
      status: raw,
      available: true,
      action: status?.permissionsGranted ? 'ready' : 'request_permission',
      permissionsGranted: Boolean(status?.permissionsGranted),
    }
  }
  if (raw === 'update_required') {
    return {
      status: raw,
      available: false,
      action: 'install_or_update',
      permissionsGranted: false,
    }
  }
  return {
    status: raw,
    available: false,
    action: 'unsupported',
    permissionsGranted: false,
  }
}

export function buildActivityMetricPayload(records) {
  if (!Array.isArray(records)) return { metrics: [] }

  return {
    metrics: records.map((record) => {
      const steps = Number(record.steps || 0)
      if (!Number.isFinite(steps) || steps < 0) {
        throw new Error('steps must be non-negative')
      }

      return {
        date: String(record.date || '').slice(0, 10),
        source: record.source || 'health-connect',
        steps: Math.round(steps),
        distanceMeters: optionalNumber(record.distanceMeters),
        activeCalories: optionalNumber(record.activeCalories),
        syncedAt: record.syncedAt || new Date().toISOString(),
      }
    }),
  }
}

export function summarizeActivityMetrics(records, today = new Date().toISOString().slice(0, 10)) {
  const recent = (Array.isArray(records) ? records : [])
    .map((record) => {
      const metric = {
        date: String(record.date || '').slice(0, 10),
        steps: Math.max(0, Math.round(Number(record.steps || 0))),
        distanceMeters: optionalNumber(record.distanceMeters),
        activeCalories: optionalNumber(record.activeCalories),
      }
      if (record.source) metric.source = record.source
      if (record.syncedAt) metric.syncedAt = record.syncedAt
      return metric
    })
    .filter((record) => record.date)
    .sort((a, b) => b.date.localeCompare(a.date))

  return {
    today: recent.find((record) => record.date === today) || null,
    week: recent.reduce(
      (acc, record) => ({
        steps: acc.steps + record.steps,
        distanceMeters: acc.distanceMeters + (record.distanceMeters || 0),
        activeCalories: acc.activeCalories + (record.activeCalories || 0),
        daysWithData: acc.daysWithData + (record.steps > 0 ? 1 : 0),
      }),
      { steps: 0, distanceMeters: 0, activeCalories: 0, daysWithData: 0 },
    ),
    recent,
  }
}

export async function getHealthConnectStatus() {
  const plugin = getPlugin()
  if (!plugin) return normalizeHealthConnectStatus(null)
  try {
    return normalizeHealthConnectStatus(await plugin.getStatus())
  } catch {
    return normalizeHealthConnectStatus(null)
  }
}

export async function requestHealthConnectPermissions() {
  const plugin = getPlugin()
  if (!plugin) return { granted: false, unsupported: true }
  return plugin.requestStepPermissions()
}

export async function openHealthConnectSettings() {
  const plugin = getPlugin()
  if (!plugin) return false
  await plugin.openSettings()
  return true
}

export async function readHealthConnectDailySteps({ from, to }) {
  const plugin = getPlugin()
  if (!plugin) return []
  const result = await plugin.readDailySteps({ from, to })
  return Array.isArray(result?.records) ? result.records : []
}

export async function syncHealthConnectSteps({ days = 30 } = {}) {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - Math.max(1, days - 1))

  const records = await readHealthConnectDailySteps({
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  })
  const payload = buildActivityMetricPayload(records)
  if (payload.metrics.length === 0) {
    return { imported: 0, updated: 0, created: 0, items: [] }
  }
  const { api } = await import('./api.js')
  return api.post('/activity/daily/sync', payload)
}

export async function getSyncedActivityMetrics({ days = 7 } = {}) {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - Math.max(1, days - 1))
  const fromKey = from.toISOString().slice(0, 10)
  const toKey = to.toISOString().slice(0, 10)
  const { api } = await import('./api.js')
  const rows = await api.get(`/activity/daily?from=${fromKey}&to=${toKey}`)
  return summarizeActivityMetrics(rows, toKey)
}

export function shouldAutoSyncHealthConnectSteps({
  nativeApp,
  permissionsGranted,
  lastSync,
  now = Date.now(),
  minIntervalMs = 60 * 60_000,
} = {}) {
  if (nativeApp !== true || permissionsGranted !== true) return false
  const previous = Number(lastSync || 0)
  return !Number.isFinite(previous) || previous <= 0 || now - previous >= minIntervalMs
}

export async function maybeAutoSyncHealthConnectSteps({
  days = 7,
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
  now = Date.now(),
  minIntervalMs = 60 * 60_000,
} = {}) {
  if (!isNativeMobileApp()) return { skipped: true, reason: 'not-native' }
  const status = await getHealthConnectStatus()
  if (!shouldAutoSyncHealthConnectSteps({
    nativeApp: true,
    permissionsGranted: status.permissionsGranted,
    lastSync: storage?.getItem(HEALTH_CONNECT_AUTO_SYNC_KEY),
    now,
    minIntervalMs,
  })) {
    return { skipped: true, reason: status.permissionsGranted ? 'fresh' : 'permission-needed' }
  }

  const result = await syncHealthConnectSteps({ days })
  storage?.setItem(HEALTH_CONNECT_AUTO_SYNC_KEY, String(now))
  return result
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null
}
