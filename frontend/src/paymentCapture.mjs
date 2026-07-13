const DEFAULT_PARSER_VERSION = 'payment-capture-v2'

export function normalizePaymentEvent(input = {}) {
  const amountMinor = normalizeAmountMinor(input)
  const merchant = String(input.merchant || input.merchantRaw || 'Detected payment').trim()
  const occurredAt = normalizeDate(input.occurredAt)
  const sourcePackage = nullableText(input.sourcePackage || input.packageName)
  const sourceNotificationKey = nullableText(input.sourceNotificationKey || input.notificationId)
  const normalized = {
    id: nullableText(input.id) || undefined,
    sourcePackage,
    sourceNotificationKey,
    sourceAppLabel: nullableText(input.sourceAppLabel),
    merchant,
    amountMinor,
    amount: amountMinor / 100,
    currency: String(input.currency || 'EUR').trim().toUpperCase(),
    occurredAt,
    accountHint: nullableText(input.accountHint),
    walletId: nullableText(input.walletId),
    categoryId: nullableText(input.categoryId),
    confidence: clampConfidence(input.confidence),
    parserVersion: nullableText(input.parserVersion) || DEFAULT_PARSER_VERSION,
    state: nullableText(input.state) || 'pending',
  }

  normalized.eventHash = nullableText(input.eventHash) || paymentFingerprint(normalized)
  if (!normalized.id) normalized.id = normalized.eventHash
  return normalized
}

export function paymentFingerprint(input = {}) {
  const sourcePackage = nullableText(input.sourcePackage || input.packageName)
  const sourceKey = nullableText(input.sourceNotificationKey || input.notificationId)
  if (sourcePackage && sourceKey) return `source:${sourcePackage}:${sourceKey}`

  const date = new Date(input.occurredAt || 0)
  const minute = Number.isNaN(date.getTime()) ? 0 : Math.floor(date.getTime() / 60_000)
  const canonical = [
    String(input.merchant || input.merchantRaw || '').trim().toLocaleLowerCase('en'),
    Number(input.amountMinor || Math.round(Number(input.amount || 0) * 100)),
    String(input.currency || 'EUR').trim().toUpperCase(),
    String(input.accountHint || '').trim().toLocaleLowerCase('en'),
    minute,
  ].join('|')
  return `capture:${fnv1a(canonical)}`
}

export function classifyCaptureConfidence(input = {}) {
  if (Number(input.amountMinor || 0) <= 0 || !String(input.merchant || '').trim()) return 'invalid'
  if (input.walletId && input.categoryId) return 'ready'
  return 'review'
}

function normalizeAmountMinor(input) {
  const explicit = Number(input.amountMinor)
  if (Number.isFinite(explicit)) return Math.round(explicit)
  const decimal = Number(input.amount)
  return Number.isFinite(decimal) ? Math.round(decimal * 100) : 0
}

function normalizeDate(value) {
  const parsed = new Date(value || Date.now())
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function nullableText(value) {
  const text = String(value ?? '').trim()
  return text || null
}

function clampConfidence(value) {
  const parsed = Number(value ?? 0.7)
  if (!Number.isFinite(parsed)) return 0.7
  return Math.max(0, Math.min(1, parsed))
}

function fnv1a(value) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
