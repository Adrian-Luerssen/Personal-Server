import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { api } from '../../api'
import { getMonthRange } from '../../components/finance/MonthNavigator'
import PaymentCaptureSheet from '../../components/finance/PaymentCaptureSheet'
import TransactionForm from '../../components/finance/TransactionForm'
import Icon from '../../components/icons/Icon'
import { PageHeading, Register, RegisterDivider, RegisterRow, StatePanel, SummaryItem, SummaryStrip } from '../../components/record'
import { formatDate } from '../../components/shared'
import { isNativeMobileApp } from '../../mobilePlatform'
import { syncNativePaymentSuggestions } from '../../nativePayments.mjs'
import { cleanDetectedMerchantName } from '../../paymentCapture.mjs'
import { groupTransactionsByDate } from './financeViewModel.mjs'

const TYPE_META = Object.freeze({
  income: { icon: 'arrow-down', label: 'Income' },
  expense: { icon: 'arrow-up', label: 'Expense' },
  transfer: { icon: 'arrow-left-right', label: 'Transfer' },
})

function formatCurrency(amount, currency = 'EUR') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0))
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`
  }
}

function getTransactionType(transaction) {
  if (transaction.type === 1 || transaction.type === 3) return 'transfer'
  return transaction.isIncome ? 'income' : 'expense'
}

function getTransactionCurrency(transaction) {
  return transaction.wallet?.currency || transaction.currency || 'EUR'
}

function getTransactionCategoryName(transaction) {
  if (getTransactionType(transaction) === 'transfer') return 'Transfer'
  return transaction.category?.name || transaction.categoryName || transaction.category?.parent?.name || 'Uncategorized'
}

function getTransactionWalletName(transaction) {
  if (transaction.wallet?.name || transaction.walletName) return transaction.wallet?.name || transaction.walletName
  const fromWallet = transaction.fromWallet?.name || transaction.fromWalletName
  const toWallet = transaction.toWallet?.name || transaction.toWalletName
  if (fromWallet && toWallet) return `${fromWallet} to ${toWallet}`
  return fromWallet || toWallet || 'No wallet'
}

function normalizeTransactionList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.transactions)) return data.transactions
  return []
}

function looksLikeEmptyFinanceCache(summaryData, transactionsData) {
  const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
  return normalizeTransactionList(transactionsData).length === 0
    && numeric(summaryData?.totalIncome) === 0
    && numeric(summaryData?.totalExpense ?? summaryData?.totalExpenses) === 0
    && numeric(summaryData?.incomeCount) === 0
    && numeric(summaryData?.expenseCount) === 0
}

export default function FinanceTransactions() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const now = new Date()
  const [navYear, setNavYear] = useState(now.getFullYear())
  const [navMonth, setNavMonth] = useState(now.getMonth())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [transactions, setTransactions] = useState([])
  const [wallets, setWallets] = useState([])
  const [categories, setCategories] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [monthSummary, setMonthSummary] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [captureBusy, setCaptureBusy] = useState(false)
  const [captureError, setCaptureError] = useState('')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ walletId: '', categoryId: '', transactionType: '', search: '' })
  const [txFormData, setTxFormData] = useState(null)
  const [showTxForm, setShowTxForm] = useState(false)
  const [txFormMode, setTxFormMode] = useState('expense')
  const limit = 20

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const { from, to } = getMonthRange(navYear, navMonth)
      const walletsPath = '/finance/wallets'
      const categoriesPath = '/finance/categories'
      const [walletsData, categoriesData] = await Promise.all([
        api.get(walletsPath),
        api.get(categoriesPath),
      ])

      const params = new URLSearchParams({ page: String(page), limit: String(limit), from, to })
      if (filters.walletId) params.set('walletId', filters.walletId)
      if (filters.categoryId) params.set('categoryId', filters.categoryId)
      if (filters.search) params.set('search', filters.search)
      if (filters.transactionType === 'income') params.set('isIncome', 'true')
      if (filters.transactionType === 'expense') params.set('isIncome', 'false')

      if (isNativeMobileApp()) await syncNativePaymentSuggestions().catch(() => [])

      const transactionsPath = `/finance/transactions?${params}`
      const summaryPath = `/finance/transactions/summary?from=${from}&to=${to}`
      const suggestionsPath = '/finance/transaction-suggestions'
      let [transactionData, summaryData, suggestionData] = await Promise.all([
        api.get(transactionsPath),
        api.get(summaryPath),
        api.get(suggestionsPath).catch(() => []),
      ])

      let freshWallets = walletsData
      let freshCategories = categoriesData
      if (looksLikeEmptyFinanceCache(summaryData, transactionData)) {
        ;[freshWallets, freshCategories, transactionData, summaryData, suggestionData] = await Promise.all([
          api.get(walletsPath, { force: true }),
          api.get(categoriesPath, { force: true }),
          api.get(transactionsPath, { force: true }),
          api.get(summaryPath, { force: true }),
          api.get(suggestionsPath, { force: true }).catch(() => []),
        ])
      }

      setWallets(freshWallets || [])
      setCategories(freshCategories || [])
      let items = normalizeTransactionList(transactionData)
      if (filters.transactionType === 'transfer') items = items.filter((transaction) => [1, 3].includes(transaction.type))
      if (['income', 'expense'].includes(filters.transactionType)) items = items.filter((transaction) => ![1, 3].includes(transaction.type))
      setTransactions(items)
      setTotalCount(transactionData?.total || items.length || 0)
      setMonthSummary(summaryData)
      setSuggestions((Array.isArray(suggestionData) ? suggestionData : []).filter((item) => !item.status || item.status === 'pending'))
    } catch (error) {
      console.error('Failed to load transactions:', error)
      setLoadError('The ledger could not be refreshed. Your existing local records are unchanged.')
    } finally {
      setLoading(false)
    }
  }, [filters, navMonth, navYear, page])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (selectedSuggestion || !suggestions.length) return
    const requestedId = searchParams.get('paymentSuggestionId')
    const requested = requestedId
      ? suggestions.find((suggestion) => suggestion.id === requestedId || suggestion.eventHash === requestedId || suggestion.eventHash?.startsWith(requestedId))
      : searchParams.get('review') === 'pending' ? suggestions[0] : null
    if (requested) {
      setCaptureError('')
      setSelectedSuggestion(requested)
    }
  }, [searchParams, selectedSuggestion, suggestions])

  function handleFilterChange(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters({ walletId: '', categoryId: '', transactionType: '', search: '' })
    setPage(1)
  }

  function handleMonthChange(year, month) {
    setNavYear(year)
    setNavMonth(month)
    setPage(1)
  }

  function openAddTransaction(mode = 'expense') {
    setTxFormData(null)
    setTxFormMode(mode)
    setShowTxForm(true)
  }

  function openEditTransaction(transaction) {
    setTxFormData(transaction)
    setTxFormMode(getTransactionType(transaction))
    setShowTxForm(true)
  }

  async function acceptSuggestion(suggestion, corrections = {}) {
    setCaptureBusy(true)
    setCaptureError('')
    try {
      await api.post(`/finance/transaction-suggestions/${suggestion.id}/accept`, corrections)
      setSelectedSuggestion(null)
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.delete('paymentSuggestionId')
        next.delete('captureAction')
        next.delete('review')
        return next
      }, { replace: true })
      await loadData()
    } catch {
      setCaptureError('The payment was not added. Check your connection and try again; your edits are still here.')
    } finally {
      setCaptureBusy(false)
    }
  }

  async function rejectSuggestion(suggestion) {
    setCaptureBusy(true)
    setCaptureError('')
    try {
      await api.post(`/finance/transaction-suggestions/${suggestion.id}/reject`, {})
      setSelectedSuggestion(null)
      await loadData()
    } catch {
      setCaptureError('The capture could not be dismissed. Nothing was added to the ledger.')
    } finally {
      setCaptureBusy(false)
    }
  }

  const monthIncome = Number(monthSummary?.totalIncome || 0)
  const monthExpense = Number(monthSummary?.totalExpense || 0)
  const monthNet = monthIncome - Math.abs(monthExpense)
  const totalPages = Math.ceil(totalCount / limit)

  return (
    <>
      <CashLedger
        loading={loading}
        loadError={loadError}
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
        onAddTransaction={openAddTransaction}
        onEditTransaction={openEditTransaction}
        onReviewSuggestion={(suggestion) => { setCaptureError(''); setSelectedSuggestion(suggestion) }}
        onRejectSuggestion={rejectSuggestion}
        onRetry={loadData}
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
      {selectedSuggestion && (
        <PaymentCaptureSheet
          suggestion={selectedSuggestion}
          wallets={wallets}
          categories={categories}
          busy={captureBusy}
          error={captureError}
          onClose={() => { if (!captureBusy) setSelectedSuggestion(null) }}
          onConfirm={acceptSuggestion}
          onIgnore={rejectSuggestion}
        />
      )}
    </>
  )
}

function CashLedger({
  loading, loadError, transactions, wallets, categories, filters, navYear, navMonth,
  monthIncome, monthExpense, monthNet, page, totalPages, totalCount, suggestions,
  onFilterChange, onClearFilters, onMonthChange, onPageChange, onAddTransaction,
  onEditTransaction, onReviewSuggestion, onRejectSuggestion, onRetry, navigate,
}) {
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const monthLabel = new Date(navYear, navMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const typeOptions = [
    { id: 'expense', label: 'Expense', icon: 'arrow-up' },
    { id: 'income', label: 'Income', icon: 'arrow-down' },
    { id: 'transfer', label: 'Transfer', icon: 'arrow-left-right' },
  ]
  const filterCategories = categories.filter((category) => {
    if (filters.transactionType === 'transfer') return false
    if (filters.transactionType === 'income') return category.isIncome === true
    if (filters.transactionType === 'expense') return category.isIncome !== true
    return true
  })
  const activeFilterCount = [filters.search, filters.transactionType, filters.walletId, filters.categoryId].filter(Boolean).length
  const selectedWallet = wallets.find((wallet) => wallet.id === filters.walletId)
  const selectedCategory = categories.find((category) => category.id === filters.categoryId)
  const selectedType = typeOptions.find((option) => option.id === filters.transactionType)
  const filterSummary = [selectedType?.label || 'All types', selectedWallet?.name || 'All wallets', selectedCategory?.name].filter(Boolean).join(' · ')
  const groupedTransactions = groupTransactionsByDate(transactions).map((group) => ({
    ...group,
    label: group.date === 'undated' ? 'No date' : formatDate(group.date),
    total: group.items.reduce((sum, transaction) => {
      const amount = Math.abs(Number(transaction.amount || 0))
      return sum + (getTransactionType(transaction) === 'income' ? amount : -amount)
    }, 0),
  }))

  function shiftMonth(delta) {
    const next = new Date(navYear, navMonth + delta, 1)
    onMonthChange(next.getFullYear(), next.getMonth())
  }

  return (
    <div className="record-cash" data-testid="native-finance-transactions">
      <PageHeading
        eyebrow="Cash · Month ledger"
        title="Cash"
        actions={<button type="button" className="record-button record-button--primary" aria-label="Add expense" onClick={() => onAddTransaction('expense')}><Icon name="plus" size={16} />Add transaction</button>}
      >
        <div className="record-cash__period" aria-label="Month navigation">
          <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}><Icon name="chevron-left" size={17} /></button>
          <strong>{monthLabel}</strong>
          <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}><Icon name="chevron-right" size={17} /></button>
          <span>{totalCount} source records</span>
        </div>
      </PageHeading>

      <SummaryStrip>
        <SummaryItem label="Income" value={`+${formatCurrency(monthIncome)}`} detail={monthLabel} tone="positive" />
        <SummaryItem label="Expenses" value={`-${formatCurrency(Math.abs(monthExpense))}`} detail={monthLabel} tone="negative" />
        <SummaryItem label="Net movement" value={`${monthNet >= 0 ? '+' : ''}${formatCurrency(monthNet)}`} detail="Income less expenses" tone={monthNet >= 0 ? 'positive' : 'negative'} />
        <SummaryItem label="Visible records" value={String(transactions.length)} detail={activeFilterCount ? `${activeFilterCount} filters active` : 'No filters'} />
      </SummaryStrip>

      {suggestions.length > 0 && (
        <Register title="Payments to review" description="Detected locally and not yet added" className="record-cash__reviews" action={<button type="button" className="record-register-action" onClick={() => navigate('/settings?section=integrations')}>Capture settings</button>}>
          {suggestions.map((suggestion) => (
            <RegisterRow
              key={suggestion.id}
              leading={<span className="record-cash__row-icon record-cash__row-icon--review"><Icon name="smartphone" size={16} /></span>}
              meta={`-${formatCurrency(Math.abs(Number(suggestion.amount || 0)), suggestion.currency || 'EUR')}`}
              action={<div className="record-cash__review-actions"><button type="button" className="record-button record-button--compact" onClick={() => onReviewSuggestion(suggestion)}>Review</button><button type="button" className="record-button record-button--compact record-button--quiet" onClick={() => onRejectSuggestion(suggestion)}>Dismiss</button></div>}
            >
              <strong>{cleanDetectedMerchantName(suggestion.merchantRaw)}</strong>
              <span>{formatDate(suggestion.occurredAt)} · {suggestion.sourceAppLabel || suggestion.sourcePackage || 'Phone notification'}</span>
            </RegisterRow>
          ))}
        </Register>
      )}

      <section className="record-cash-filters" aria-label="Transaction filters">
        <div className="record-cash-filters__search">
          <Icon name="search" size={16} />
          <input type="search" aria-label="Search transactions" placeholder="Search merchant, note, or amount" value={filters.search} onChange={(event) => onFilterChange('search', event.target.value)} />
          {filters.search && <button type="button" onClick={() => onFilterChange('search', '')} aria-label="Clear search"><Icon name="x" size={15} /></button>}
        </div>
        <div className="record-cash-filters__types" role="group" aria-label="Transaction type filter">
          {typeOptions.map((option) => (
            <button key={option.id} type="button" className={filters.transactionType === option.id ? 'is-active' : ''} aria-pressed={filters.transactionType === option.id} onClick={() => onFilterChange('transactionType', filters.transactionType === option.id ? '' : option.id)}>
              <Icon name={option.icon} size={14} />{option.label}
            </button>
          ))}
        </div>
        <button type="button" className="record-cash-filters__toggle" aria-expanded={filtersExpanded} aria-controls="record-cash-advanced-filters" onClick={() => setFiltersExpanded((open) => !open)}>
          <Icon name="sliders-horizontal" size={15} />{filtersExpanded ? 'Hide filters' : 'Show filters'}{activeFilterCount > 0 && <span>{activeFilterCount}</span>}
        </button>
        <div className="record-cash-filters__summary"><span>{filterSummary}</span>{activeFilterCount > 0 && <button type="button" onClick={onClearFilters}>Clear all</button>}</div>
        {filtersExpanded && (
          <div className="record-cash-filters__advanced" id="record-cash-advanced-filters">
            <FilterChoices label="Wallet" allLabel="All wallets" items={wallets} selected={filters.walletId} onSelect={(value) => onFilterChange('walletId', value)} />
            {filters.transactionType !== 'transfer' && <FilterChoices label="Category" allLabel="All categories" items={filterCategories} selected={filters.categoryId} onSelect={(value) => onFilterChange('categoryId', value)} />}
          </div>
        )}
      </section>

      <Register
        title="Transactions"
        description={`${transactions.length} visible in ${monthLabel}`}
        data-testid="cash-ledger"
        action={<button type="button" className="record-register-action" aria-label="Add transaction" onClick={() => onAddTransaction('expense')}><Icon name="plus" size={14} />Add</button>}
      >
        {loadError ? (
          <StatePanel kind="error" title="Could not refresh the ledger" detail={loadError} action={<button type="button" className="record-button record-button--compact" onClick={onRetry}>Retry</button>} />
        ) : loading ? (
          <StatePanel kind="loading" title="Opening the ledger" detail="Saved records remain in place while this month is checked." />
        ) : transactions.length === 0 ? (
          <StatePanel kind="empty" title="No transactions match this view" detail={`Clear filters or add a transaction for ${monthLabel}.`} action={<button type="button" className="record-button record-button--compact" onClick={() => onAddTransaction('expense')}>Add expense</button>} />
        ) : groupedTransactions.map((group) => (
          <React.Fragment key={group.date}>
            <RegisterDivider label={`${group.label} · ${formatCurrency(group.total)}`} />
            {group.items.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} onEdit={() => onEditTransaction(transaction)} />)}
          </React.Fragment>
        ))}
        {totalPages > 1 && (
          <div className="record-cash__pagination" aria-label="Transaction pages">
            <button type="button" className="record-button record-button--compact" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}><Icon name="chevron-left" size={14} />Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button type="button" className="record-button record-button--compact" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>Next<Icon name="chevron-right" size={14} /></button>
          </div>
        )}
      </Register>
    </div>
  )
}

function FilterChoices({ allLabel, items, label, onSelect, selected }) {
  return (
    <div className="record-cash-filter-group" aria-label={`${label} filter`}>
      <span>{label}</span>
      <div>
        <button type="button" className={!selected ? 'is-active' : ''} aria-label={`Filter ${label.toLowerCase()} all`} aria-pressed={!selected} onClick={() => onSelect('')}>{allLabel}</button>
        {items.map((item) => <button key={item.id} type="button" className={selected === item.id ? 'is-active' : ''} aria-label={`Filter ${label.toLowerCase()} ${item.name}`} aria-pressed={selected === item.id} onClick={() => onSelect(selected === item.id ? '' : item.id)}>{item.name}</button>)}
      </div>
    </div>
  )
}

function TransactionRow({ onEdit, transaction }) {
  const type = getTransactionType(transaction)
  const meta = TYPE_META[type]
  const amount = Math.abs(Number(transaction.amount || 0))
  const sign = type === 'income' ? '+' : type === 'expense' ? '-' : ''
  const title = transaction.name || transaction.description || 'Untitled transaction'
  return (
    <RegisterRow
      className={`record-cash-row native-transaction-card record-cash-row--${type}`}
      leading={<span className="record-cash__row-icon"><Icon name={transaction.category?.iconName || meta.icon} size={16} /></span>}
      meta={<span className="record-cash-row__amount">{sign}{formatCurrency(amount, getTransactionCurrency(transaction))}</span>}
      action={<button type="button" className="record-cash-row__edit" aria-label={`Edit ${title}`} onClick={onEdit}><Icon name="chevron-right" size={16} /></button>}
    >
      <strong>{title}</strong>
      <span>{getTransactionCategoryName(transaction)} · {getTransactionWalletName(transaction)}</span>
    </RegisterRow>
  )
}
