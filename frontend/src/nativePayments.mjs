import { isNativeMobileApp } from './mobilePlatform.js'
import { normalizePaymentEvent } from './paymentCapture.mjs'

function getPlugin() {
  if (!isNativeMobileApp()) return null
  return window.Capacitor?.Plugins?.PersonalServerPayments || null
}

export function normalizePaymentSuggestion(nativeSuggestion) {
  if (!nativeSuggestion) return null
  const normalized = normalizePaymentEvent(nativeSuggestion)
  if (normalized.amountMinor <= 0 || !normalized.eventHash) return null
  return { ...normalized, merchantRaw: normalized.merchant }
}

export function buildPaymentSuggestionPayload(nativeSuggestion) {
  const normalized = normalizePaymentSuggestion(nativeSuggestion)
  if (!normalized) {
    throw new Error('payment suggestion requires a positive amount and event hash')
  }

  return {
    eventHash: normalized.eventHash,
    sourcePackage: normalized.sourcePackage,
    sourceAppLabel: normalized.sourceAppLabel,
    merchantRaw: normalized.merchantRaw,
    amount: normalized.amount,
    currency: normalized.currency,
    occurredAt: normalized.occurredAt,
    confidence: normalized.confidence,
  }
}

export async function getPaymentDetectionStatus() {
  const plugin = getPlugin()
  if (!plugin) return { supported: false, enabled: false, notificationAccess: false }
  try {
    return plugin.getStatus()
  } catch {
    return { supported: false, enabled: false, notificationAccess: false }
  }
}

export async function openPaymentNotificationSettings() {
  const plugin = getPlugin()
  if (!plugin) return false
  await plugin.openNotificationAccessSettings()
  return true
}

export async function configurePaymentDetection({ enabled, packages } = {}) {
  const plugin = getPlugin()
  if (!plugin) return { supported: false }
  return plugin.configureDetection({
    enabled: Boolean(enabled),
    packages: Array.isArray(packages) ? packages : [],
  })
}

export async function getNativePaymentSuggestions() {
  const plugin = getPlugin()
  if (!plugin) return []
  const result = await plugin.getPendingSuggestions()
  const suggestions = Array.isArray(result?.suggestions) ? result.suggestions : []
  return suggestions.map(normalizePaymentSuggestion).filter(Boolean)
}

export async function clearNativePaymentSuggestion(id) {
  const plugin = getPlugin()
  if (!plugin || !id) return false
  await plugin.clearSuggestion({ id })
  return true
}

export async function syncNativePaymentSuggestions() {
  const suggestions = await getNativePaymentSuggestions()
  const synced = []
  const { api } = await import('./api.js')

  for (const suggestion of suggestions) {
    const payload = buildPaymentSuggestionPayload(suggestion)
    const result = await api.post('/finance/transaction-suggestions', payload)
    synced.push(result.suggestion || result)
    await clearNativePaymentSuggestion(suggestion.id)
  }

  return synced
}
