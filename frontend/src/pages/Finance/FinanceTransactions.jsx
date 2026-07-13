import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { formatDate } from '../../components/shared'
import Icon from '../../components/icons/Icon'
import { getMonthRange } from '../../components/finance/MonthNavigator'
import TransactionForm from '../../components/finance/TransactionForm'
import PaymentCaptureSheet from '../../components/finance/PaymentCaptureSheet'
import { normalizeFinanceColor } from '../../components/finance/financeVisuals.mjs'
import { isNativeMobileApp } from '../../mobilePlatform'
import { syncNativePaymentSuggestions } from '../../nativePayments.mjs'
import { groupTransactionsByDate } from './financeViewModel.mjs'

const FINANCE_COLOR = '#fbbf24'

const TYPE_COLORS = {
  income: 'var(--color-success)',
  expense: 'var(--color-error)',
  transfer: '#60a5fa',
}

function formatCurrency(amount, currency = 'EUR') {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0))
  } catch {
    const numericAmount = Number(amount || 0)
    const formatted = Math.abs(numericAmount).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `${numericAmount < 0 ? '-' : ''}${currency} ${formatted}`
  }
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

function getTransactionCurrency(tx) {
  return tx.wallet?.currency || tx.currency || 'EUR'
}

function getTransactionCategoryName(tx) {
  const type = getTransactionType(tx)
  if (type === 'transfer') return 'Transfer'
  return tx.category?.name || tx.categoryName || tx.category?.parent?.name || 'Uncategorized'
}

function getTransactionWalletName(tx) {
  if (tx.wallet?.name || tx.walletName) return tx.wallet?.name || tx.walletName
  const fromWallet = tx.fromWallet?.name || tx.fromWalletName
  const toWallet = tx.toWallet?.name || tx.toWalletName
  if (fromWallet && toWallet) return `${fromWallet} to ${toWallet}`
  return fromWallet || toWallet || 'No wallet'
}

export default function FinanceTransactions() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

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
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [captureBusy, setCaptureBusy] = useState(false)
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

  useEffect(() => {
    const requestedId = searchParams.get('paymentSuggestionId')
    if (!requestedId || selectedSuggestion) return
    const requested = suggestions.find(suggestion => (
      suggestion.id === requestedId ||
      suggestion.eventHash === requestedId ||
      suggestion.eventHash?.startsWith(requestedId)
    ))
    if (requested) setSelectedSuggestion(requested)
  }, [searchParams, selectedSuggestion, suggestions])

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

  async function acceptSuggestion(suggestion, corrections = {}) {
    setCaptureBusy(true)
    try {
      await api.post(`/finance/transaction-suggestions/${suggestion.id}/accept`, corrections)
      setSelectedSuggestion(null)
      setSearchParams(current => {
        const next = new URLSearchParams(current)
        next.delete('paymentSuggestionId')
        next.delete('captureAction')
        return next
      }, { replace: true })
      await loadData()
    } finally {
      setCaptureBusy(false)
    }
  }

  async function rejectSuggestion(suggestion) {
    setCaptureBusy(true)
    try {
      await api.post(`/finance/transaction-suggestions/${suggestion.id}/reject`, {})
      setSelectedSuggestion(null)
      await loadData()
    } finally {
      setCaptureBusy(false)
    }
  }

  const paymentCaptureSheet = selectedSuggestion ? (
    <PaymentCaptureSheet suggestion={selectedSuggestion} wallets={wallets} categories={categories} busy={captureBusy} onClose={() => setSelectedSuggestion(null)} onConfirm={acceptSuggestion} onIgnore={rejectSuggestion} />
  ) : null

  const totalPages = Math.ceil(totalCount / limit)
  const monthIncome = monthSummary?.totalIncome || 0
  const monthExpense = monthSummary?.totalExpense || 0
  const monthNet = monthIncome - Math.abs(monthExpense)

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
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          suggestions={suggestions}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          onMonthChange={handleMonthChange}
          onPageChange={setPage}
          onAddTx={openAddTx}
          onEditTx={openEditTx}
          onReviewSuggestion={setSelectedSuggestion}
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
        {paymentCaptureSheet}
      </>
  )
}
function NativeFinanceTransactionsView({
  loading,
  transactions,
  wallets,
  categories,
  filters,
  navYear,
  navMonth,
  monthIncome,
  monthExpense,
  monthNet,
  page,
  totalPages,
  totalCount,
  suggestions,
  onFilterChange,
  onClearFilters,
  onMonthChange,
  onPageChange,
  onAddTx,
  onEditTx,
  onReviewSuggestion,
  onRejectSuggestion,
  navigate,
}) {
  const monthLabel = new Date(navYear, navMonth, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })
  const typeOptions = [
    { id: 'expense', label: 'Expense', icon: 'arrow-up' },
    { id: 'income', label: 'Income', icon: 'arrow-down' },
    { id: 'transfer', label: 'Transfer', icon: 'arrow-left-right' },
  ]
  const filterCategories = (categories || []).filter(category => {
    if (filters.transactionType === 'transfer') return false
    if (filters.transactionType === 'income') return category.isIncome === true
    if (filters.transactionType === 'expense') return category.isIncome !== true
    return true
  })
  const activeFilterCount = [
    filters.search,
    filters.transactionType,
    filters.walletId,
    filters.categoryId,
  ].filter(Boolean).length
  const groupedTransactions = groupTransactionsByDate(transactions).map((group) => ({
    ...group,
    key: group.date,
    label: group.date === 'undated' ? 'No date' : formatDate(group.date),
    total: group.items.reduce((sum, tx) => {
      const amount = Math.abs(Number(tx.amount || 0))
      return sum + (getTransactionType(tx) === 'income' ? amount : -amount)
    }, 0),
  }))
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const selectedWallet = wallets.find(wallet => wallet.id === filters.walletId)
  const selectedCategory = categories.find(category => category.id === filters.categoryId)
  const selectedType = typeOptions.find(option => option.id === filters.transactionType)
  const advancedFilterSummary = [
    selectedType?.label || 'All types',
    selectedWallet?.name || 'All wallets',
    filters.transactionType === 'transfer' ? 'No categories' : selectedCategory?.name || 'All categories',
    filters.search ? `Search: ${filters.search}` : null,
  ].filter(Boolean).join(' - ')

  function shiftMonth(delta) {
    const next = new Date(navYear, navMonth + delta, 1)
    onMonthChange(next.getFullYear(), next.getMonth())
  }

  return (
    <div className="native-finance-page native-dashboard" data-testid="native-finance-transactions">
      <section className="native-finance-hero native-finance-hero--compact">
        <div>
          <span className="native-eyebrow">Month ledger</span>
          <h1>Cash</h1>
          <p>{totalCount} source records</p>
        </div>
        <button type="button" className="native-finance-fab-inline" aria-label="Add expense" onClick={() => onAddTx('expense')}>
          <Icon name="plus" size={20} />
        </button>
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

      <section className="native-finance-metrics">
        <NativeTransactionMetric label="Income" value={`+${formatCurrency(monthIncome)}`} tone="income" />
        <NativeTransactionMetric label="Expense" value={`-${formatCurrency(Math.abs(monthExpense))}`} tone="expense" />
        <NativeTransactionMetric label="Net" value={`${monthNet >= 0 ? '+' : ''}${formatCurrency(monthNet)}`} tone={monthNet >= 0 ? 'income' : 'expense'} />
      </section>

      {suggestions.length > 0 && <section className="native-finance-card native-finance-card--payment-review">
        <div className="native-section-head">
          <div>
            <h2>Detected payments</h2>
            <p>{suggestions.length ? 'Confirm or dismiss phone payment prompts.' : 'No payment prompts waiting.'}</p>
          </div>
          <button type="button" onClick={() => navigate('/settings?section=integrations')}>Setup</button>
        </div>
        <NativePaymentSuggestionsPanel
          suggestions={suggestions}
          onReview={onReviewSuggestion}
          onReject={onRejectSuggestion}
        />
      </section>}

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
          {activeFilterCount > 0 && (
            <button type="button" onClick={onClearFilters}>Clear</button>
          )}
        </div>
        <div className="native-transaction-type-row" role="group" aria-label="Transaction type filter">
          {typeOptions.map(option => (
            <button
              key={option.id}
              type="button"
              className={filters.transactionType === option.id ? 'is-active' : ''}
              aria-pressed={filters.transactionType === option.id ? 'true' : 'false'}
              onClick={() => onFilterChange('transactionType', filters.transactionType === option.id ? '' : option.id)}
            >
              <Icon name={option.icon} size={15} />
              {option.label}
            </button>
          ))}
        </div>
        <div className="native-filter-toggle-row">
          <button
            type="button"
            className="native-filter-toggle-button"
            aria-expanded={filtersExpanded ? 'true' : 'false'}
            aria-controls="native-finance-advanced-filters"
            onClick={() => setFiltersExpanded(open => !open)}
          >
            <Icon name="sliders-horizontal" size={15} />
            {filtersExpanded ? 'Hide filters' : 'Show filters'}
          </button>
          <span>{advancedFilterSummary}</span>
          {activeFilterCount > 0 && (
            <button type="button" className="native-clear-filter-button native-clear-filter-button--inline" onClick={onClearFilters}>
              <Icon name="x" size={15} />
              Clear
            </button>
          )}
        </div>
        {filtersExpanded && (
          <div id="native-finance-advanced-filters" className="native-advanced-filters">
            <div className="native-filter-group" aria-label="Wallet filter">
              <span>Wallet</span>
              <div className="native-chip-row native-filter-chip-row">
                <button
                  type="button"
                  className={!filters.walletId ? 'is-active' : ''}
                  aria-label="Filter wallet all"
                  aria-pressed={!filters.walletId ? 'true' : 'false'}
                  onClick={() => onFilterChange('walletId', '')}
                >
                  All
                </button>
                {(wallets || []).map(wallet => (
                  <button
                    key={wallet.id}
                    type="button"
                    className={filters.walletId === wallet.id ? 'is-active' : ''}
                    aria-label={`Filter wallet ${wallet.name}`}
                    aria-pressed={filters.walletId === wallet.id ? 'true' : 'false'}
                    onClick={() => onFilterChange('walletId', filters.walletId === wallet.id ? '' : wallet.id)}
                  >
                    {wallet.name}
                  </button>
                ))}
              </div>
            </div>
            {filters.transactionType !== 'transfer' && (
              <div className="native-filter-group" aria-label="Category filter">
                <span>Category</span>
                <div className="native-chip-row native-filter-chip-row">
                  <button
                    type="button"
                    className={!filters.categoryId ? 'is-active' : ''}
                    aria-label="Filter category all"
                    aria-pressed={!filters.categoryId ? 'true' : 'false'}
                    onClick={() => onFilterChange('categoryId', '')}
                  >
                    All
                  </button>
                  {filterCategories.map(category => (
                    <button
                      key={category.id}
                      type="button"
                      className={filters.categoryId === category.id ? 'is-active' : ''}
                      aria-label={`Filter category ${category.name}`}
                      aria-pressed={filters.categoryId === category.id ? 'true' : 'false'}
                      onClick={() => onFilterChange('categoryId', filters.categoryId === category.id ? '' : category.id)}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="native-finance-card">
        <div className="native-section-head">
          <div>
            <h2>Feed</h2>
            <p>{transactions.length} transactions in this view.</p>
          </div>
          <div className="native-section-head__actions">
            <button type="button" className="native-feed-add-button" aria-label="Add transaction" onClick={() => onAddTx('expense')}>
              <Icon name="plus" size={16} />
              Add
            </button>
            <button type="button" onClick={() => navigate('/settings?section=data')}>Manage</button>
          </div>
        </div>
        <div className="native-transaction-list">
          {loading ? (
            <div className="native-empty-state">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="native-empty-state native-empty-state--action">
              <strong>No transactions match this view.</strong>
              <p>Clear filters or add a transaction for {monthLabel}.</p>
              <button type="button" className="native-feed-add-button" onClick={() => onAddTx('expense')}>
                <Icon name="plus" size={16} />
                Add expense
              </button>
            </div>
          ) : (
            groupedTransactions.map(group => (
              <div className="native-transaction-day-group" key={group.key}>
                <div className="native-transaction-day-group__head">
                  <span>{group.label}</span>
                  <em>{formatCurrency(group.total)}</em>
                </div>
                {group.items.map(tx => (
                  <NativeTransactionFeedCard key={tx.id} tx={tx} onClick={() => onEditTx(tx)} />
                ))}
              </div>
            ))
          )}
        </div>
        {totalPages > 1 && (
          <div className="native-pagination-row" aria-label="Transaction pages">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              <Icon name="chevron-left" size={16} />
              Previous
            </button>
            <span>{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            >
              Next
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
        )}
        {totalCount > transactions.length && (
          <p className="native-feed-count-note">{transactions.length} of {totalCount} loaded for this filter.</p>
        )}
      </section>
    </div>
  )
}

function NativePaymentSuggestionsPanel({ suggestions, onReview, onReject }) {
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
            <button type="button" className="native-primary-button" onClick={() => onReview(suggestion)}>
              <Icon name="search" size={16} />
              Review
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
  const categoryName = getTransactionCategoryName(tx)
  const walletName = getTransactionWalletName(tx)
  const currency = getTransactionCurrency(tx)

  return (
    <button type="button" className="native-transaction-card" onClick={onClick}>
      <span className="native-transaction-card__icon" style={{ color: txColor, background: `${txColor}22` }}>
        <Icon name={tx.category?.iconName || txIcon} size={17} />
      </span>
      <span className="native-transaction-card__copy">
        <strong>{tx.name || tx.description || 'Untitled'}</strong>
        <small>
          {formatDate(tx.transactionDate || tx.date)}
          {' - '}
          {categoryName}
          {' - '}
          {walletName}
        </small>
      </span>
      <em style={{ color: txColor }}>{sign}{formatCurrency(Math.abs(tx.amount), currency)}</em>
    </button>
  )
}
