import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../api'
import { formatDate, SkeletonCard } from '../../components/shared'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'
import MonthNavigator, { getMonthRange } from '../../components/finance/MonthNavigator'
import CategoryIcon from '../../components/finance/CategoryIcon'
import CategoryPicker from '../../components/finance/CategoryPicker'
import TransactionForm from '../../components/finance/TransactionForm'

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

      // Fetch transactions and summary in parallel
      const [txData, summaryData] = await Promise.all([
        api.get(`/finance/transactions?${params}`),
        api.get(`/finance/transactions/summary?from=${from}&to=${to}`),
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

  function openAddTx() {
    setTxFormData(null)
    setShowTxForm(true)
  }

  function openEditTx(tx) {
    setTxFormData(tx)
    setShowTxForm(true)
  }

  const totalPages = Math.ceil(totalCount / limit)
  const monthIncome = monthSummary?.totalIncome || 0
  const monthExpense = monthSummary?.totalExpense || 0
  const monthNet = monthIncome - Math.abs(monthExpense)

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
          <div style={{ flex: '0 1 180px' }}>
            <label style={labelStyle}>{t('finance.wallet')}</label>
            <select value={filters.walletId} onChange={e => handleFilterChange('walletId', e.target.value)} style={inputStyle}>
              <option value="">{t('finance.allWallets')}</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
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
          <button className="btn" onClick={() => navigate('/finance/import')} style={{ marginTop: '1rem' }}>
            <Icon name="download" size={18} />
            {t('finance.importData')}
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
                          <Icon name="wallet" size={16} style={{ color: FINANCE_COLOR }} />
                          {tx.wallet?.name || tx.walletName || '—'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CategoryIcon category={tx.category} size={22} />
                          <span style={{ fontSize: '0.85rem' }}>
                            {tx.category?.name || tx.categoryName || t('finance.uncategorized')}
                          </span>
                        </div>
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
          onClose={() => setShowTxForm(false)}
          onSaved={loadData}
        />
      )}
    </>
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
