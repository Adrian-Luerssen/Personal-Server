export function normalizeCurrency(currency) {
  const normalized = String(currency || 'EUR').trim().toUpperCase()
  return /^[A-Z]{3}$/.test(normalized) ? normalized : 'EUR'
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function formatMoney(value, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalizeCurrency(currency),
    maximumFractionDigits: Number.isInteger(numberValue(value)) ? 0 : 2,
  }).format(numberValue(value))
}

export function formatCompactMoney(value, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalizeCurrency(currency),
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(numberValue(value))
}
