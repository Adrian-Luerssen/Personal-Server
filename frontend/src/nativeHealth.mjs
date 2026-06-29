import { isNativeMobileApp } from './mobilePlatform.js'

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

function optionalNumber(value) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null
}
