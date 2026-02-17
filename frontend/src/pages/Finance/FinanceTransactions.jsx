import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { formatDate, SkeletonCard } from '../../components/shared'

const FINANCE_COLOR = '#fbbf24'

function formatCurrency(amount, currency = '€') {
  const formatted = Math.abs(amount).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${amount < 0 ? '-' : ''}${currency}${formatted}`
}

export default function FinanceTransactions() {
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
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      if (filters.search) params.set('search', filters.search)

      const txData = await api.get(`/finance/transactions?${params}`)
      setTransactions(txData?.items || txData?.transactions || txData || [])
      setTotalCount(txData?.total || txData?.items?.length || txData?.length || 0)
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
      startDate: '',
      endDate: '',
      search: '',
    })
    setPage(1)
  }

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <>
      <h2>
        <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 8, color: FINANCE_COLOR }}>
          receipt_long
        </span>
        Transactions
      </h2>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          {/* Search */}
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>Search</label>
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Wallet */}
          <div style={{ flex: '0 1 180px' }}>
            <label style={labelStyle}>Wallet</label>
            <select
              value={filters.walletId}
              onChange={e => handleFilterChange('walletId', e.target.value)}
              style={inputStyle}
            >
              <option value="">All Wallets</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div style={{ flex: '0 1 180px' }}>
            <label style={labelStyle}>Category</label>
            <select
              value={filters.categoryId}
              onChange={e => handleFilterChange('categoryId', e.target.value)}
              style={inputStyle}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div style={{ flex: '0 1 150px' }}>
            <label style={labelStyle}>From</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => handleFilterChange('startDate', e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ flex: '0 1 150px' }}>
            <label style={labelStyle}>To</label>
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
            <span className="material-icons" style={{ fontSize: 16 }}>clear</span>
            Clear
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <SkeletonCard lines={8} />
      ) : transactions.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <span className="material-icons" style={{ fontSize: 48, color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' }}>
            receipt_long
          </span>
          <div style={{ color: 'var(--color-text-secondary)' }}>
            No transactions found
          </div>
          <button
            className="btn"
            onClick={() => navigate('/finance/import')}
            style={{ marginTop: '1rem' }}
          >
            <span className="material-icons" style={{ fontSize: 18 }}>file_download</span>
            Import Data
          </button>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-elevated)' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Wallet</th>
                  <th style={thStyle}>Category</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={tdStyle}>{formatDate(tx.date)}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500 }}>{tx.description || tx.name || '—'}</div>
                      {tx.notes && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {tx.notes}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="material-icons" style={{ fontSize: 16, color: FINANCE_COLOR }}>
                          account_balance_wallet
                        </span>
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
                        {tx.category?.name || tx.categoryName || 'Uncategorized'}
                      </span>
                    </td>
                    <td style={{
                      ...tdStyle,
                      textAlign: 'right',
                      fontWeight: 700,
                      color: tx.amount >= 0 ? 'var(--color-success)' : 'var(--color-error)',
                    }}>
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                <span className="material-icons" style={{ fontSize: 18 }}>chevron_left</span>
                Previous
              </button>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn small"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ opacity: page === totalPages ? 0.4 : 1 }}
              >
                Next
                <span className="material-icons" style={{ fontSize: 18 }}>chevron_right</span>
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
