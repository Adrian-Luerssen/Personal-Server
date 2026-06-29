import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../api'
import { formatDate, SkeletonCard } from '../../components/shared'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'
import MonthNavigator, { getMonthRange } from '../../components/finance/MonthNavigator'
import CategoryIcon from '../../components/finance/CategoryIcon'
import CategoryLabel from '../../components/finance/CategoryLabel'
import CategoryPicker from '../../components/finance/CategoryPicker'
import WalletPicker from '../../components/finance/WalletPicker'
import TransactionForm from '../../components/finance/TransactionForm'
import { isNativeMobileApp } from '../../mobilePlatform'
import { syncNativePaymentSuggestions } from '../../nativePayments.mjs'

const FINANCE_COLOR = '#fbbf24'

const TYPE_COLORS = {
  income: 'var(--color-success)',
  expense: 'var(--color-error)',
  transfer: '#60a5fa',
}

function formatCurrency(amount, currency = '€') {
  const formatted = Math.abs(amount).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${amount < 0 ? '-' : ''}${currency}${formatted}`
}

function getTransactionType(tx) {
  if (tx.type === 1 || tx.type === 3) return 'transfer'
  return tx.isIncome ? 'income' : 'expense'
}

function getTransactionColor(tx) {
  return TYPE_COLORS[getTransactionType(tx)]
}

function getTransactionIcon(tx) {
  const type = getTransactionType(tx)
  switch (type) {
    case 'income': return 'arrow-down'
    case 'expense': return 'arrow-up'
    case 'transfer': return 'arrow-left-right'
    default: return 'receipt'
  }
}

export default function FinanceTransactions() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const now = new Date()
  const [navYear, setNavYear] = useState(now.getFullYear())
  const [navMonth, setNavMonth] = useState(now.getMonth())

  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [wallets, setWallets] = useState([])
  const [categories, setCategories] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [monthSummary, setMonthSummary] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [page, setPage] = useState(1)
  const limit = 20

  // Filters
  const [filters, setFilters] = useState({
    walletId: '',
    categoryId: '',
    transactionType: '',
    search: '',
  })

  // Transaction form state
  const [txFormData, setTxFormData] = useState(null) // null = closed, {} = add, {id, ...} = edit
  const [showTxForm, setShowTxForm] = useState(false)
  const [txFormMode, setTxFormMode] = useState('expense')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { from, to } = getMonthRange(navYear, navMonth)

      const [walletsData, categoriesData] = await Promise.all([
        api.get('/finance/wallets'),
        api.get('/finance/categories'),
      ])
      setWallets(walletsData || [])
      setCategories(categoriesData || [])

      // Build query params
      const params = new URLSearchParams()
      params.set('page', page)
      params.set('limit', limit)
      params.set('from', from)
      params.set('to', to)
      if (filters.walletId) params.set('walletId', filters.walletId)
      if (filters.categoryId) params.set('categoryId', filters.categoryId)
      if (filters.search) params.set('search', filters.search)

      if (filters.transactionType === 'income') {
        params.set('isIncome', 'true')
      } else if (filters.transactionType === 'expense') {
        params.set('isIncome', 'false')
      }

      if (isNativeMobileApp()) {
        await syncNativePaymentSuggestions().catch(() => [])
      }

      // Fetch transactions and summary in parallel
      const [txData, summaryData, suggestionsData] = await Promise.all([
        api.get(`/finance/transactions?${params}`),
        api.get(`/finance/transactions/summary?from=${from}&to=${to}`),
        api.get('/finance/transaction-suggestions').catch(() => []),
      ])

      let items = txData?.items || txData?.transactions || txData || []

      // Client-side filtering for transfers
      if (filters.transactionType === 'transfer') {
        items = items.filter(tx => tx.type === 1 || tx.type === 3)
      } else if (filters.transactionType === 'income' || filters.transactionType === 'expense') {
        items = items.filter(tx => tx.type !== 1 && tx.type !== 3)
      }

      setTransactions(items)
      setTotalCount(txData?.total || items.length || 0)
      setMonthSummary(summaryData)
      setSuggestions(Array.isArray(suggestionsData) ? suggestionsData : [])
    } catch (e) {
      console.error('Failed to load transactions:', e)
    } finally {
      setLoading(false)
    }
  }, [page, filters, navYear, navMonth])

  useEffect(() => { loadData() }, [loadData])

  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({ walletId: '', categoryId: '', transactionType: '', search: '' })
    setPage(1)
  }

  function handleMonthChange(year, month) {
    setNavYear(year)
    setNavMonth(month)
    setPage(1)
  }

  function openAddTx(mode = 'expense') {
    setTxFormData(null)
    setTxFormMode(mode)
    setShowTxForm(true)
  }

  function openEditTx(tx) {
    setTxFormData(tx)
    setTxFormMode(getTransactionType(tx))
    setShowTxForm(true)
  }

  async function acceptSuggestion(suggestion) {
    await api.post(`/finance/transaction-suggestions/${suggestion.id}/accept`, {})
    await loadData()
  }

  async function rejectSuggestion(suggestion) {
    await api.post(`/finance/transaction-suggestions/${suggestion.id}/reject`, {})
    await loadData()
  }

  const totalPages = Math.ceil(totalCount / limit)
  const monthIncome = monthSummary?.totalIncome || 0
  const monthExpense = monthSummary?.totalExpense || 0
  const monthNet = monthIncome - Math.abs(monthExpense)

  if (isNativeMobileApp()) {
    return (
      <>
        <NativeFinanceTransactionsView
          loading={loading}
          transactions={transactions}
          wallets={wallets}
          categories={categories}
          filters={filters}
          navYear={navYear}
          navMonth={navMonth}
          monthIncome={monthIncome}
          monthExpense={monthExpense}
          monthNet={monthNet}
          suggestions={suggestions}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          onMonthChange={handleMonthChange}
          onAddTx={openAddTx}
          onEditTx={openEditTx}
          onAcceptSuggestion={acceptSuggestion}
          onRejectSuggestion={rejectSuggestion}
          navigate={navigate}
        />
        {showTxForm && (
          <TransactionForm
            transaction={txFormData}
            wallets={wallets}
            categories={categories}
            initialMode={txFormMode}
            onClose={() => setShowTxForm(false)}
            onSaved={loadData}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <PageHeader icon="receipt" title="Transactions" accentColor="#fbbf24" />
        <button className="btn btn-primary" onClick={openAddTx}>
          <Icon name="plus" size={16} /> Add Transaction
        </button>
      </div>

      {/* Month Navigator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <MonthNavigator year={navYear} month={navMonth} onChange={handleMonthChange} />
      </div>

      {/* Month Summary Bar */}
      {!loading && monthSummary && (
        <div className="month-summary-bar">
          <div className="summary-item">
            <span className="summary-label">Income</span>
            <span className="summary-value" style={{ color: 'var(--color-success)' }}>+{formatCurrency(monthIncome)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Expenses</span>
            <span className="summary-value" style={{ color: 'var(--color-error)' }}>-{formatCurrency(Math.abs(monthExpense))}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Net</span>
            <span className="summary-value" style={{ color: monthNet >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
              {monthNet >= 0 ? '+' : ''}{formatCurrency(monthNet)}
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          {/* Search */}
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>{t('common.search')}</label>
            <input
              type="text"
              placeholder={t('finance.searchTransactions')}
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Transaction Type */}
          <div style={{ flex: '0 1 150px' }}>
            <label style={labelStyle}>{t('finance.type')}</label>
            <select value={filters.transactionType} onChange={e => handleFilterChange('transactionType', e.target.value)} style={inputStyle}>
              <option value="">{t('finance.allTypes')}</option>
              <option value="income">{t('finance.income')}</option>
              <option value="expense">{t('finance.expense')}</option>
              <option value="transfer">{t('finance.transfer')}</option>
            </select>
          </div>

          {/* Wallet */}
          <div style={{ flex: '0 1 200px' }}>
            <label style={labelStyle}>{t('finance.wallet')}</label>
            <WalletPicker
              wallets={wallets}
              value={filters.walletId}
              onChange={val => handleFilterChange('walletId', val || '')}
              placeholder={t('finance.allWallets')}
            />
          </div>

          {/* Category */}
          <div style={{ flex: '0 1 180px' }}>
            <label style={labelStyle}>{t('finance.category')}</label>
            <CategoryPicker
              categories={categories}
              value={filters.categoryId}
              onChange={val => handleFilterChange('categoryId', val || '')}
              placeholder={t('finance.allCategories')}
            />
          </div>

          {/* Clear Filters */}
          <button
            className="btn small"
            onClick={clearFilters}
            style={{ background: 'transparent', border: '1px solid var(--glass-border)' }}
          >
            <Icon name="x" size={16} />
            {t('common.clear')}
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <SkeletonCard lines={8} />
      ) : transactions.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Icon name="receipt" size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
          <div style={{ color: 'var(--color-text-secondary)' }}>
            {t('finance.noTransactions')}
          </div>
          <button className="btn" onClick={() => navigate('/settings?section=data')} style={{ marginTop: '1rem' }}>
            <Icon name="database" size={18} />
            Settings and Data
          </button>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-elevated)' }}>
                  <th style={thStyle}>{t('finance.date')}</th>
                  <th style={thStyle}>{t('finance.description')}</th>
                  <th style={thStyle}>{t('finance.wallet')}</th>
                  <th style={thStyle}>{t('finance.category')}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{t('finance.amount')}</th>
                </tr>
              </thead>
              <tbody className="stagger-list">
                {transactions.map(tx => {
                  const txType = getTransactionType(tx)
                  const txColor = getTransactionColor(tx)
                  const txIcon = getTransactionIcon(tx)

                  return (
                    <tr
                      key={tx.id}
                      style={{ borderBottom: '1px solid var(--glass-border)', cursor: 'pointer' }}
                      onClick={() => openEditTx(tx)}
                    >
                      <td style={tdStyle}>{formatDate(tx.transactionDate || tx.date)}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Icon name={txIcon} size={18} style={{ color: txColor }} />
                          <div>
                            <div style={{ fontWeight: 500 }}>{tx.name || tx.description || '—'}</div>
                            {tx.note && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                {tx.note}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Icon name={tx.wallet?.iconName || 'wallet'} size={16} style={{ color: tx.wallet?.colour || FINANCE_COLOR }} />
                          {tx.wallet?.name || tx.walletName || '—'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <CategoryLabel category={tx.category} fallback={t('finance.uncategorized')} />
                      </td>
                      <td style={{
                        ...tdStyle,
                        textAlign: 'right',
                        fontWeight: 700,
                        color: txColor,
                      }}>
                        {txType === 'income' ? '+' : txType === 'expense' ? '-' : ''}
                        {formatCurrency(Math.abs(tx.amount))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '1.5rem',
            }}>
              <button
                className="btn small"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ opacity: page === 1 ? 0.4 : 1 }}
              >
                <Icon name="chevron-left" size={18} />
                {t('common.previous')}
              </button>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                {t('common.page')} {page} {t('common.of')} {totalPages}
              </span>
              <button
                className="btn small"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ opacity: page === totalPages ? 0.4 : 1 }}
              >
                {t('common.next')}
                <Icon name="chevron-right" size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {showTxForm && (
        <TransactionForm
          transaction={txFormData}
          wallets={wallets}
          categories={categories}
          initialMode={txFormMode}
          onClose={() => setShowTxForm(false)}
          onSaved={loadData}
        />
      )}
    </>
  )
}

function NativeFinanceTransactionsView({
  loading,
  transactions,
  filters,
  navYear,
  navMonth,
  monthIncome,
  monthExpense,
  monthNet,
  suggestions,
  onFilterChange,
  onClearFilters,
  onMonthChange,
  onAddTx,
  onEditTx,
  onAcceptSuggestion,
  onRejectSuggestion,
  navigate,
}) {
  const monthLabel = new Date(navYear, navMonth, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })
  const typeOptions = [
    { id: 'expense', label: 'Expense', icon: 'arrow-up' },
    { id: 'income', label: 'Income', icon: 'arrow-down' },
    { id: 'transfer', label: 'Transfer', icon: 'arrow-left-right' },
  ]

  function shiftMonth(delta) {
    const next = new Date(navYear, navMonth + delta, 1)
    onMonthChange(next.getFullYear(), next.getMonth())
  }

  return (
    <div className="native-finance-page native-dashboard" data-testid="native-finance-transactions">
      <section className="native-finance-hero native-finance-hero--compact">
        <div>
          <span className="native-eyebrow">Finance</span>
          <h1>Transactions</h1>
          <p>{monthLabel}</p>
        </div>
        <button type="button" className="native-finance-fab-inline" onClick={() => onAddTx('expense')}>
          <Icon name="plus" size={20} />
        </button>
      </section>

      <section className="native-finance-metrics">
        <NativeTransactionMetric label="Income" value={`+${formatCurrency(monthIncome)}`} tone="income" />
        <NativeTransactionMetric label="Expense" value={`-${formatCurrency(Math.abs(monthExpense))}`} tone="expense" />
        <NativeTransactionMetric label="Net" value={`${monthNet >= 0 ? '+' : ''}${formatCurrency(monthNet)}`} tone={monthNet >= 0 ? 'income' : 'expense'} />
      </section>

      <div className="native-month-row" aria-label="Month navigation">
        <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
          <Icon name="chevron-left" size={18} />
        </button>
        <strong>{monthLabel}</strong>
        <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}>
          <Icon name="chevron-right" size={18} />
        </button>
      </div>

      <section className="native-finance-card">
        <div className="native-section-head">
          <div>
            <h2>Detected payments</h2>
            <p>{suggestions.length ? 'Confirm or dismiss phone payment prompts.' : 'No payment prompts waiting.'}</p>
          </div>
          <button type="button" onClick={() => navigate('/settings?section=integrations')}>Setup</button>
        </div>
        <NativePaymentSuggestionsPanel
          suggestions={suggestions}
          onAccept={onAcceptSuggestion}
          onReject={onRejectSuggestion}
        />
      </section>

      <section className="native-finance-card">
        <div className="native-filter-search">
          <Icon name="search" size={17} />
          <input
            type="search"
            value={filters.search}
            aria-label="Search transactions"
            placeholder="Search transactions"
            onChange={event => onFilterChange('search', event.target.value)}
          />
          {(filters.search || filters.transactionType) && (
            <button type="button" onClick={onClearFilters}>Clear</button>
          )}
        </div>
        <div className="native-transaction-type-row" role="group" aria-label="Transaction type filter">
          {typeOptions.map(option => (
            <button
              key={option.id}
              type="button"
              className={filters.transactionType === option.id ? 'is-active' : ''}
              onClick={() => onFilterChange('transactionType', filters.transactionType === option.id ? '' : option.id)}
            >
              <Icon name={option.icon} size={15} />
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="native-finance-card">
        <div className="native-section-head">
          <div>
            <h2>Feed</h2>
            <p>{transactions.length} transactions in this view.</p>
          </div>
          <button type="button" onClick={() => navigate('/settings?section=data')}>Data</button>
        </div>
        <div className="native-transaction-list">
          {loading ? (
            <div className="native-empty-state">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="native-empty-state">No transactions match this view.</div>
          ) : (
            transactions.map(tx => (
              <NativeTransactionFeedCard key={tx.id} tx={tx} onClick={() => onEditTx(tx)} />
            ))
          )}
        </div>
      </section>

      <button type="button" className="native-finance-floating-add" aria-label="Add transaction" onClick={() => onAddTx('expense')}>
        <Icon name="plus" size={24} />
      </button>
    </div>
  )
}

function NativePaymentSuggestionsPanel({ suggestions, onAccept, onReject }) {
  if (!suggestions.length) {
    return <div className="native-empty-state">Detected card payments will appear here before they become transactions.</div>
  }

  return (
    <div className="native-payment-suggestion-list">
      {suggestions.map(suggestion => (
        <article key={suggestion.id} className="native-payment-suggestion">
          <div className="native-payment-suggestion__main">
            <span className="native-transaction-card__icon" style={{ color: FINANCE_COLOR, background: `${FINANCE_COLOR}22` }}>
              <Icon name="wallet" size={17} />
            </span>
            <span>
              <strong>{suggestion.merchantRaw || 'Detected payment'}</strong>
              <small>
                {formatDate(suggestion.occurredAt)}
                {suggestion.sourceAppLabel ? ` - ${suggestion.sourceAppLabel}` : ''}
              </small>
            </span>
            <em>-{formatCurrency(Math.abs(Number(suggestion.amount || 0)))}</em>
          </div>
          <div className="native-payment-suggestion__actions">
            <button type="button" className="native-primary-button" onClick={() => onAccept(suggestion)}>
              <Icon name="check" size={16} />
              Add
            </button>
            <button type="button" className="native-secondary-button" onClick={() => onReject(suggestion)}>
              <Icon name="x" size={16} />
              Dismiss
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

function NativeTransactionMetric({ label, value, tone }) {
  return (
    <div className={`native-finance-metric native-finance-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function NativeTransactionFeedCard({ tx, onClick }) {
  const txType = getTransactionType(tx)
  const txColor = getTransactionColor(tx)
  const txIcon = getTransactionIcon(tx)
  const sign = txType === 'income' ? '+' : txType === 'expense' ? '-' : ''

  return (
    <button type="button" className="native-transaction-card" onClick={onClick}>
      <span className="native-transaction-card__icon" style={{ color: txColor, background: `${txColor}22` }}>
        <Icon name={tx.category?.iconName || txIcon} size={17} />
      </span>
      <span className="native-transaction-card__copy">
        <strong>{tx.name || tx.description || 'Untitled'}</strong>
        <small>
          {formatDate(tx.transactionDate || tx.date)}
          {tx.wallet?.name || tx.walletName ? ` - ${tx.wallet?.name || tx.walletName}` : ''}
        </small>
      </span>
      <em style={{ color: txColor }}>{sign}{formatCurrency(Math.abs(tx.amount))}</em>
    </button>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '0.4rem',
}

const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--glass-border)',
  background: 'var(--color-bg-elevated)',
  color: 'var(--color-text-primary)',
  fontSize: '0.9rem',
}

const thStyle = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontSize: '0.8rem',
  color: 'var(--color-text-muted)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const tdStyle = {
  padding: '0.75rem 1rem',
  fontSize: '0.9rem',
}
