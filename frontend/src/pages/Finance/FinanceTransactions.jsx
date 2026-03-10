import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../api'
import { formatDate, SkeletonCard } from '../../components/shared'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'

const FINANCE_COLOR = '#fbbf24'

// Transaction type colors
const TYPE_COLORS = {
  income: 'var(--color-success)',
  expense: 'var(--color-error)',
  transfer: '#60a5fa', // blue for transfers
}

function formatCurrency(amount, currency = '€') {
  const formatted = Math.abs(amount).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${amount < 0 ? '-' : ''}${currency}${formatted}`
}

// Determine transaction display type based on backend data
function getTransactionType(tx) {
  // type 1 or 3 in Cashew = transfer
  if (tx.type === 1 || tx.type === 3) return 'transfer'
  return tx.isIncome ? 'income' : 'expense'
}

function getTransactionColor(tx) {
  const type = getTransactionType(tx)
  return TYPE_COLORS[type]
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

  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [wallets, setWallets] = useState([])
  const [categories, setCategories] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 20

  // Filters
  const [filters, setFilters] = useState({
    walletId: '',
    categoryId: '',
    transactionType: '', // 'income', 'expense', 'transfer', or ''
    startDate: '',
    endDate: '',
    search: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load wallets and categories for filters
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
      if (filters.walletId) params.set('walletId', filters.walletId)
      if (filters.categoryId) params.set('categoryId', filters.categoryId)
      if (filters.startDate) params.set('from', filters.startDate)
      if (filters.endDate) params.set('to', filters.endDate)
      if (filters.search) params.set('search', filters.search)
      
      // Handle type filter - backend uses isIncome boolean
      if (filters.transactionType === 'income') {
        params.set('isIncome', 'true')
      } else if (filters.transactionType === 'expense') {
        params.set('isIncome', 'false')
      }
      // Note: transfer filter would need backend support for type field filtering

      const txData = await api.get(`/finance/transactions?${params}`)
      let items = txData?.items || txData?.transactions || txData || []
      
      // Client-side filtering for transfers (until backend supports it)
      if (filters.transactionType === 'transfer') {
        items = items.filter(tx => tx.type === 1 || tx.type === 3)
      } else if (filters.transactionType === 'income' || filters.transactionType === 'expense') {
        // Exclude transfers from income/expense views
        items = items.filter(tx => tx.type !== 1 && tx.type !== 3)
      }
      
      setTransactions(items)
      setTotalCount(txData?.total || items.length || 0)
    } catch (e) {
      console.error('Failed to load transactions:', e)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { loadData() }, [loadData])

  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({
      walletId: '',
      categoryId: '',
      transactionType: '',
      startDate: '',
      endDate: '',
      search: '',
    })
    setPage(1)
  }

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <>
      <PageHeader icon="receipt" title="Transactions" accentColor="#fbbf24" />

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
            <select
              value={filters.transactionType}
              onChange={e => handleFilterChange('transactionType', e.target.value)}
              style={inputStyle}
            >
              <option value="">{t('finance.allTypes')}</option>
              <option value="income">{t('finance.income')}</option>
              <option value="expense">{t('finance.expense')}</option>
              <option value="transfer">{t('finance.transfer')}</option>
            </select>
          </div>

          {/* Wallet */}
          <div style={{ flex: '0 1 180px' }}>
            <label style={labelStyle}>{t('finance.wallet')}</label>
            <select
              value={filters.walletId}
              onChange={e => handleFilterChange('walletId', e.target.value)}
              style={inputStyle}
            >
              <option value="">{t('finance.allWallets')}</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div style={{ flex: '0 1 180px' }}>
            <label style={labelStyle}>{t('finance.category')}</label>
            <select
              value={filters.categoryId}
              onChange={e => handleFilterChange('categoryId', e.target.value)}
              style={inputStyle}
            >
              <option value="">{t('finance.allCategories')}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div style={{ flex: '0 1 150px' }}>
            <label style={labelStyle}>{t('finance.from')}</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => handleFilterChange('startDate', e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ flex: '0 1 150px' }}>
            <label style={labelStyle}>{t('finance.to')}</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => handleFilterChange('endDate', e.target.value)}
              style={inputStyle}
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
          <Icon name="receipt" size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' }} />
          <div style={{ color: 'var(--color-text-secondary)' }}>
            {t('finance.noTransactions')}
          </div>
          <button
            className="btn"
            onClick={() => navigate('/finance/import')}
            style={{ marginTop: '1rem' }}
          >
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
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
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
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--color-accent-muted)',
                          fontSize: '0.8rem',
                        }}>
                          {tx.category?.name || tx.categoryName || t('finance.uncategorized')}
                        </span>
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
