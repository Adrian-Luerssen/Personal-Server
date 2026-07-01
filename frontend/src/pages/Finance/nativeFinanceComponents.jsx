import React from 'react'
import { formatDate } from '../../components/shared'
import Icon from '../../components/icons/Icon'
import CategoryIcon from '../../components/finance/CategoryIcon'
import { normalizeFinanceColor, transparentFinanceColor } from '../../components/finance/financeVisuals.mjs'

export const FINANCE_COLOR = '#d8aa35'

export const TYPE_COLORS = {
  income: '#5fcf88',
  expense: '#e96f78',
  transfer: '#73a8d8',
}

export const CATEGORY_COLORS = [
  '#d8aa35',
  '#c774a2',
  '#77b68b',
  '#7ea4d6',
  '#a887cf',
  '#cf7ca7',
  '#c7b46a',
  '#6fb6b2',
]

export function numberValue(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatCurrency(amount, currency = 'EUR') {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numberValue(amount))
  } catch {
    const numericAmount = numberValue(amount)
    const formatted = Math.abs(numericAmount).toLocaleString('en', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return `${numericAmount < 0 ? '-' : ''}${currency} ${formatted}`
  }
}

export function normalizeTransactionList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.transactions)) return data.transactions
  return []
}

export function getTransactionType(tx) {
  if (tx?.type === 1 || tx?.type === 3) return 'transfer'
  return tx?.isIncome ? 'income' : 'expense'
}

export function getTransactionColor(tx) {
  return TYPE_COLORS[getTransactionType(tx)] || FINANCE_COLOR
}

export function getTransactionIcon(tx) {
  const type = getTransactionType(tx)
  if (type === 'income') return 'arrow-down'
  if (type === 'transfer') return 'arrow-left-right'
  return tx?.category?.iconName || tx?.categoryIcon || 'receipt'
}

export function getTransactionCurrency(tx) {
  return tx?.wallet?.currency || tx?.currency || 'EUR'
}

export function getTransactionName(tx) {
  return tx?.name || tx?.description || tx?.merchantName || 'Untitled'
}

export function getTransactionWalletName(tx) {
  if (tx?.wallet?.name || tx?.walletName) return tx.wallet?.name || tx.walletName
  const fromWallet = tx?.fromWallet?.name || tx?.fromWalletName
  const toWallet = tx?.toWallet?.name || tx?.toWalletName
  if (fromWallet && toWallet) return `${fromWallet} to ${toWallet}`
  return fromWallet || toWallet || 'No wallet'
}

export function getTransactionCategoryName(tx) {
  const type = getTransactionType(tx)
  if (type === 'transfer') return 'Transfer'
  return tx?.category?.name || tx?.categoryName || tx?.category?.parent?.name || 'Uncategorized'
}

export function getTransactionCategory(tx, fallbackColor = FINANCE_COLOR) {
  return {
    name: getTransactionCategoryName(tx),
    iconName: tx?.category?.iconName || tx?.categoryIcon || getTransactionIcon(tx),
    colour: normalizeFinanceColor(tx?.category?.colour || tx?.categoryColour, fallbackColor),
  }
}

export function getSignedTransactionAmount(tx) {
  const amount = Math.abs(numberValue(tx?.amount))
  const type = getTransactionType(tx)
  if (type === 'income') return amount
  if (type === 'expense') return -amount
  return 0
}

export function getCategorySpending(summary, transactions = []) {
  const fromSummary = summary?.topExpenseCategories || summary?.byCategory || []
  if (Array.isArray(fromSummary) && fromSummary.length > 0) {
    return fromSummary
      .map((category, index) => ({
        id: category.categoryId || category.id || category.name || `category-${index}`,
        name: category.categoryName || category.name || 'Uncategorized',
        iconName: category.categoryIcon || category.iconName || 'tag',
        colour: normalizeFinanceColor(category.categoryColour || category.colour, CATEGORY_COLORS[index % CATEGORY_COLORS.length]),
        total: Math.abs(numberValue(category.total || category.amount)),
      }))
      .filter((category) => category.total > 0)
  }

  const aggregate = new Map()
  for (const tx of transactions || []) {
    if (getTransactionType(tx) !== 'expense') continue
    const key = tx.categoryId || tx.category?.id || getTransactionCategoryName(tx)
    const existing = aggregate.get(key) || {
      id: key,
      name: getTransactionCategoryName(tx),
      iconName: tx.category?.iconName || tx.categoryIcon || 'tag',
      colour: normalizeFinanceColor(tx.category?.colour || tx.categoryColour, CATEGORY_COLORS[aggregate.size % CATEGORY_COLORS.length]),
      total: 0,
    }
    existing.total += Math.abs(numberValue(tx.amount))
    aggregate.set(key, existing)
  }
  return [...aggregate.values()].sort((a, b) => b.total - a.total)
}

export function buildDailyCashflow(transactions = []) {
  const byDay = new Map()
  for (const tx of transactions || []) {
    const rawDate = tx.transactionDate || tx.date || tx.createdAt
    if (!rawDate) continue
    const key = new Date(rawDate).toISOString().slice(0, 10)
    const existing = byDay.get(key) || { date: key, income: 0, expense: 0, net: 0 }
    const signed = getSignedTransactionAmount(tx)
    if (signed >= 0) existing.income += signed
    else existing.expense += Math.abs(signed)
    existing.net += signed
    byDay.set(key, existing)
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function getLargestExpense(transactions = []) {
  return [...(transactions || [])]
    .filter((tx) => getTransactionType(tx) === 'expense')
    .sort((a, b) => Math.abs(numberValue(b.amount)) - Math.abs(numberValue(a.amount)))[0] || null
}

function buildSparklinePath(points, width, height) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M 0 ${height / 2} L ${width} ${height / 2}`
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  return points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

export function NativeCashflowChart({ transactions, title = 'Cashflow', subtitle = 'Real transactions in this view' }) {
  const days = buildDailyCashflow(transactions)
  let running = 0
  const cumulative = days.map((day) => {
    running += day.net
    return running
  })
  const path = buildSparklinePath(cumulative, 260, 86)
  const totalIncome = days.reduce((sum, day) => sum + day.income, 0)
  const totalExpense = days.reduce((sum, day) => sum + day.expense, 0)
  const net = totalIncome - totalExpense

  return (
    <section className="native-finance-card native-cashflow-card" data-testid="native-finance-cashflow-chart">
      <div className="native-section-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className={`native-ledger-delta ${net >= 0 ? 'is-positive' : 'is-negative'}`}>
          {net >= 0 ? '+' : ''}{formatCurrency(net)}
        </span>
      </div>
      <div className="native-cashflow-chart" role="img" aria-label={`${title}: ${days.length} recorded days`}>
        {days.length === 0 ? (
          <div className="native-empty-state native-empty-state--compact">No transactions in this period.</div>
        ) : (
          <>
            <svg viewBox="0 0 260 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="native-cashflow-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(216, 170, 53, 0.38)" />
                  <stop offset="100%" stopColor="rgba(216, 170, 53, 0)" />
                </linearGradient>
              </defs>
              <path d={`${path} L 260 100 L 0 100 Z`} fill="url(#native-cashflow-fill)" />
              <path d={path} fill="none" stroke="#d8aa35" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="native-cashflow-chart__axis">
              <span>{formatDate(days[0].date)}</span>
              <span>{formatDate(days[days.length - 1].date)}</span>
            </div>
          </>
        )}
      </div>
      <div className="native-cashflow-totals">
        <span><em>Income</em><strong className="is-positive">{formatCurrency(totalIncome)}</strong></span>
        <span><em>Expense</em><strong className="is-negative">{formatCurrency(totalExpense)}</strong></span>
      </div>
    </section>
  )
}

export function NativeCategoryMixPanel({ categories, title = 'Category mix' }) {
  const visible = (categories || []).slice(0, 6)
  const total = visible.reduce((sum, category) => sum + Math.abs(numberValue(category.total)), 0)
  let cursor = 0
  const gradient = visible.length
    ? visible.map((category, index) => {
        const start = cursor
        const portion = total > 0 ? (Math.abs(numberValue(category.total)) / total) * 360 : 0
        cursor += portion
        const color = normalizeFinanceColor(category.colour, CATEGORY_COLORS[index % CATEGORY_COLORS.length])
        return `${color} ${start.toFixed(2)}deg ${cursor.toFixed(2)}deg`
      }).join(', ')
    : 'rgba(255, 255, 255, 0.08) 0deg 360deg'

  return (
    <section className="native-finance-card native-category-mix-card" data-testid="native-finance-category-mix">
      <div className="native-section-head">
        <div>
          <h2>{title}</h2>
          <p>Largest expense categories.</p>
        </div>
        <span className="native-ledger-delta">{formatCurrency(total)}</span>
      </div>
      <div className="native-category-mix">
        <div className="native-category-ring" style={{ background: `conic-gradient(${gradient})` }} aria-hidden="true">
          <span>{visible.length}</span>
        </div>
        <div className="native-category-mix__list">
          {visible.length === 0 ? (
            <div className="native-empty-state native-empty-state--compact">No category spending yet.</div>
          ) : (
            visible.map((category, index) => (
              <div key={category.id || category.name || index} className="native-category-mix__row">
                <span style={{ background: normalizeFinanceColor(category.colour, CATEGORY_COLORS[index % CATEGORY_COLORS.length]) }} />
                <strong>{category.name}</strong>
                <em>{formatCurrency(category.total)}</em>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export function NativeWalletStack({ wallets = [] }) {
  return (
    <section className="native-finance-card">
      <div className="native-section-head">
        <div>
          <h2>Wallets</h2>
          <p>Balances that transactions use by default.</p>
        </div>
      </div>
      <div className="native-wallet-stack">
        {wallets.length === 0 ? (
          <div className="native-empty-state native-empty-state--compact">No wallets yet.</div>
        ) : (
          wallets.map((wallet) => (
            <div key={wallet.id || wallet.name} className="native-wallet-stack__row">
              <span style={{ color: normalizeFinanceColor(wallet.colour, FINANCE_COLOR) }}>
                <Icon name={wallet.iconName || 'wallet'} size={17} />
              </span>
              <strong>{wallet.name}</strong>
              <em>{formatCurrency(wallet.balance || 0, wallet.currency || 'EUR')}</em>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export function NativeBudgetLedgerCard({ budget }) {
  const spent = Math.abs(numberValue(budget.spent))
  const amount = Math.abs(numberValue(budget.amount || budget.limit || spent + numberValue(budget.remaining)))
  const remaining = numberValue(budget.remaining ?? amount - spent)
  const percent = Math.max(0, Math.min(140, numberValue(budget.percentage || (amount ? (spent / amount) * 100 : 0))))
  const displayPercent = Math.round(percent)
  const over = budget.isOver || remaining < 0 || percent >= 100
  const category = {
    name: budget.categoryName || budget.category?.name || budget.name || 'Spending Limit',
    iconName: budget.categoryIcon || budget.category?.iconName || 'gauge',
    colour: normalizeFinanceColor(budget.categoryColour || budget.category?.colour, FINANCE_COLOR),
  }
  const allowance = Math.max(0, remaining / Math.max(1, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate() + 1))

  return (
    <article className={`native-budget-ledger-card ${over ? 'is-over' : ''}`}>
      <div className="native-budget-ledger-card__banner" style={{ '--budget-color': category.colour }}>
        <CategoryIcon category={category} size={34} />
        <div>
          <h3>{category.name}</h3>
          <p>{formatCurrency(remaining)} left of {formatCurrency(amount)}</p>
        </div>
        <strong>{displayPercent}%</strong>
      </div>
      <div className="native-budget-ledger-card__body">
        <div className="native-budget-ledger-card__bar" aria-label={`${category.name} budget ${displayPercent}% used`}>
          <span style={{ width: `${Math.min(100, percent)}%` }} />
        </div>
        <div className="native-budget-ledger-card__meta">
          <span>Current {budget.period || 'monthly'} period</span>
          <span>{formatCurrency(allowance)} daily allowance</span>
        </div>
      </div>
    </article>
  )
}

export function NativeTransactionTimeline({ transactions = [], onClick, limit = 6 }) {
  const visible = transactions.slice(0, limit)
  return (
    <div className="native-transaction-timeline">
      {visible.length === 0 ? (
        <div className="native-empty-state native-empty-state--compact">No transactions yet.</div>
      ) : (
        visible.map((tx) => {
          const type = getTransactionType(tx)
          const color = getTransactionColor(tx)
          const signed = getSignedTransactionAmount(tx)
          const amount = type === 'transfer' ? numberValue(tx.amount) : signed
          const content = (
            <>
              <span className="native-transaction-timeline__icon" style={{ color, background: transparentFinanceColor(color, '22') }}>
                <Icon name={getTransactionIcon(tx)} size={16} />
              </span>
              <span className="native-transaction-timeline__copy">
                <strong>{getTransactionName(tx)}</strong>
                <small>{formatDate(tx.transactionDate || tx.date)} - {getTransactionWalletName(tx)}</small>
              </span>
              <em className={amount >= 0 ? 'is-positive' : 'is-negative'}>
                {amount > 0 && type === 'income' ? '+' : ''}{formatCurrency(amount, getTransactionCurrency(tx))}
              </em>
            </>
          )
          if (onClick) {
            return (
              <button key={tx.id} type="button" className="native-transaction-timeline__row" onClick={() => onClick(tx)}>
                {content}
              </button>
            )
          }
          return (
            <div key={tx.id} className="native-transaction-timeline__row">
              {content}
            </div>
          )
        })
      )}
    </div>
  )
}
