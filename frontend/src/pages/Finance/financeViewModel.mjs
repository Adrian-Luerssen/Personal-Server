function transactionDate(transaction) {
  return String(transaction?.date || transaction?.transactionDate || transaction?.occurredAt || '').slice(0, 10)
}

export function groupTransactionsByDate(transactions = []) {
  const groups = new Map()
  for (const transaction of transactions) {
    const date = transactionDate(transaction) || 'undated'
    if (!groups.has(date)) groups.set(date, [])
    groups.get(date).push(transaction)
  }
  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, items]) => ({ date, items }))
}

export function deriveTransactionDefaults({ merchant, history = [] } = {}) {
  const normalizedMerchant = String(merchant || '').trim().toLocaleLowerCase()
  const match = history.find((item) => {
    const candidate = String(item.merchant || item.name || '').trim().toLocaleLowerCase()
    return !candidate || candidate === normalizedMerchant
  })
  if (!match) return { walletId: null, categoryId: null, source: 'none' }
  return {
    walletId: match.walletId || null,
    categoryId: match.categoryId || null,
    source: 'merchant-history',
  }
}
