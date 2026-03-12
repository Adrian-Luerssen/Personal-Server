import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../api'
import { Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import {
  StatCard,
  SkeletonStatCard,
  SkeletonCard,
  formatDate,
  formatNumberShort,
} from '../../components/shared'
import Icon from '../../components/icons/Icon'
import ScrollReveal from '../../components/ScrollReveal'
import PageHeader from '../../components/PageHeader'
import PeriodSelector, { getDateRange, getPeriodLabel } from '../../components/finance/PeriodSelector'
import CategoryIcon from '../../components/finance/CategoryIcon'
import CategoryLabel from '../../components/finance/CategoryLabel'
import TransactionForm from '../../components/finance/TransactionForm'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend)

// Finance accent color
const FINANCE_COLOR = '#fbbf24'
const FINANCE_COLOR_MUTED = 'rgba(251, 191, 36, 0.15)'

// Transaction type colors
const TYPE_COLORS = {
  income: 'var(--color-success)',
  expense: 'var(--color-error)',
  transfer: '#60a5fa',
}

// Category colors for charts
const CATEGORY_COLORS = [
  '#fbbf24', '#f472b6', '#60a5fa', '#4ade80', '#a78bfa',
  '#fb923c', '#22d3ee', '#e879f9', '#84cc16', '#f87171',
]

const CURRENCY_SYMBOLS = {
  EUR: '€', USD: '$', GBP: '£', JPY: '¥', CNY: '¥',
  KRW: '₩', INR: '₹', BRL: 'R$', RUB: '₽', CHF: 'CHF ',
  CAD: 'C$', AUD: 'A$', MXN: 'MX$', SEK: 'kr', NOK: 'kr',
  DKK: 'kr', PLN: 'zł', CZK: 'Kč', HUF: 'Ft', TRY: '₺',
}

function formatCurrency(amount, currency = 'EUR') {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' '
  const formatted = Math.abs(amount).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${amount < 0 ? '-' : ''}${symbol}${formatted}`
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

export default function Finance() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [wallets, setWallets] = useState([])
  const [categories, setCategories] = useState([])
  const [summary, setSummary] = useState(null)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [period, setPeriod] = useState('month')
  const [showTxForm, setShowTxForm] = useState(false)

  // Fire-and-forget: generate any pending subscription transactions on mount
  useEffect(() => {
    api.post('/finance/subscriptions/generate').catch(() => {})
  }, [])

  useEffect(() => { loadDashboard() }, [period])

  async function loadDashboard() {
    setLoading(true)
    try {
      const { from, to } = getDateRange(period)
      const summaryParams = new URLSearchParams()
      if (from) summaryParams.set('from', from)
      if (to) summaryParams.set('to', to)

      const txParams = new URLSearchParams({ limit: '5' })
      if (from) txParams.set('from', from)
      if (to) txParams.set('to', to)

      const [walletsData, categoriesData, summaryData, transactionsData] = await Promise.all([
        api.get('/finance/wallets'),
        api.get('/finance/categories'),
        api.get(`/finance/transactions/summary?${summaryParams}`),
        api.get(`/finance/transactions?${txParams}`),
      ])
      setWallets(walletsData || [])
      setCategories(categoriesData || [])
      setSummary(summaryData || {})
      setRecentTransactions(transactionsData?.items || transactionsData?.transactions || transactionsData || [])
    } catch (e) {
      console.error('Failed to load finance dashboard:', e)
    } finally {
      setLoading(false)
    }
  }

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0)
  const totalIncome = summary?.totalIncome || 0
  const totalExpenses = summary?.totalExpense || summary?.totalExpenses || 0
  const netFlow = totalIncome - Math.abs(totalExpenses)

  // Prepare chart data for spending by category
  const categorySpending = summary?.topExpenseCategories || summary?.byCategory || []
  const pieData = {
    labels: categorySpending.map(c => c.categoryName || c.name || t('finance.uncategorized')),
    datasets: [{
      data: categorySpending.map(c => Math.abs(c.total || c.amount || 0)),
      backgroundColor: categorySpending.map((c, i) => c.categoryColour || CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
      borderWidth: 0,
    }]
  }

  const isMobile = window.innerWidth <= 640
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: isMobile ? 'bottom' : 'right',
        labels: {
          color: '#b0bec5',
          font: { size: 11 },
          padding: isMobile ? 8 : 12,
          usePointStyle: true,
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}`
        }
      }
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <PageHeader icon="wallet" title="Finance" accentColor="#fbbf24" />
        <button className="btn btn-primary" onClick={() => setShowTxForm(true)}>
          <Icon name="plus" size={16} /> Add Transaction
        </button>
      </div>

      {/* Period Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <PeriodSelector value={period} onChange={setPeriod} />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{getPeriodLabel(period)}</span>
      </div>

      {/* Stats Grid */}
      <ScrollReveal>
        <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <StatCard icon="wallet" accentColor="#fbbf24" label={t('finance.totalBalance')} value={formatCurrency(totalBalance)} />
              <StatCard icon="trending-up" accentColor="#4ade80" label="Income" value={formatCurrency(totalIncome)} />
              <StatCard icon="trending-down" accentColor="#f87171" label="Expenses" value={formatCurrency(Math.abs(totalExpenses))} />
              <StatCard
                icon="arrow-right-left"
                accentColor="#fbbf24"
                label="Net Flow"
                value={formatCurrency(netFlow)}
                subtitle={netFlow >= 0 ? 'Positive' : 'Negative'}
              />
            </>
          )}
        </div>
      </ScrollReveal>

      {/* Quick Actions */}
      <ScrollReveal delay={100}>
      <div className="section">
        <h3>{t('finance.quickActions')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
          {[
            { icon: 'receipt', label: 'Transactions', onClick: () => navigate('/finance/transactions'), accent: true },
            { icon: 'landmark', label: t('finance.wallets'), onClick: () => navigate('/finance/settings?tab=wallets') },
            { icon: 'layers', label: 'Categories', onClick: () => navigate('/finance/settings?tab=categories') },
            { icon: 'repeat', label: 'Subscriptions', onClick: () => navigate('/finance/settings?tab=subscriptions') },
            { icon: 'download', label: t('finance.importCashew'), onClick: () => navigate('/finance/import') },
          ].map(action => (
            <button
              key={action.label}
              className="card interactive"
              style={{
                padding: '1.5rem',
                textAlign: 'center',
                color: 'inherit',
                border: action.accent ? `2px solid ${FINANCE_COLOR}` : undefined,
                background: action.accent ? FINANCE_COLOR_MUTED : undefined,
              }}
              onClick={action.onClick}
            >
              <Icon name={action.icon} size={40} style={{ marginBottom: '.5rem', color: FINANCE_COLOR }} />
              <div style={{ fontWeight: 700 }}>{action.label}</div>
            </button>
          ))}
        </div>
      </div>
      </ScrollReveal>

      {/* Two columns: Chart & Wallets */}
      <ScrollReveal delay={200}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Spending by Category */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>
            <Icon name="pie-chart" size={20} style={{ marginRight: 8 }} />
            {t('finance.spendingByCategory')}
          </h3>
          {loading ? (
            <SkeletonCard lines={5} />
          ) : categorySpending.length === 0 ? (
            <div className="empty-state">{t('finance.noSpendingData')}</div>
          ) : (
            <div style={{ height: 220 }}>
              <Pie data={pieData} options={pieOptions} />
            </div>
          )}
          {/* Category legend with icons */}
          {!loading && categorySpending.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
              {categorySpending.slice(0, 5).map((c, i) => (
                <div key={c.categoryId || i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <CategoryIcon category={{ colour: c.categoryColour || CATEGORY_COLORS[i % CATEGORY_COLORS.length], iconName: c.categoryIcon }} size={24} />
                  <span style={{ flex: 1 }}>{c.categoryName || 'Uncategorized'}</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(Math.abs(c.total || 0))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wallets Overview */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>
              <Icon name="landmark" size={20} style={{ marginRight: 8 }} />
              {t('finance.wallets')}
            </h3>
            <button className="btn small" onClick={() => navigate('/finance/settings?tab=wallets')}>{t('common.viewAll')}</button>
          </div>
          {loading ? (
            <SkeletonCard lines={3} />
          ) : wallets.length === 0 ? (
            <div className="empty-state">{t('finance.noWalletsYet')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {wallets.slice(0, 5).map(wallet => (
                <div
                  key={wallet.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: 'var(--color-bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Icon name={wallet.iconName || 'wallet'} size={20} style={{ color: wallet.colour || FINANCE_COLOR }} />
                    <span style={{ fontWeight: 600 }}>{wallet.name}</span>
                  </div>
                  <span style={{
                    fontWeight: 700,
                    color: wallet.balance >= 0 ? 'var(--color-success)' : 'var(--color-error)',
                  }}>
                    {formatCurrency(wallet.balance || 0, wallet.currency || 'EUR')}
                  </span>
                  {wallet.currency && wallet.currency !== 'EUR' && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>
                      {wallet.currency}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </ScrollReveal>

      {/* Recent Transactions */}
      <ScrollReveal delay={300}>
      <div className="section" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
          <h3>
            <Icon name="receipt" size={20} style={{ marginRight: 8 }} />
            {t('finance.recentTransactions')}
          </h3>
          <button className="btn small" onClick={() => navigate('/finance/transactions')}>{t('common.viewAll')}</button>
        </div>

        {loading ? (
          <SkeletonCard lines={4} />
        ) : recentTransactions.length === 0 ? (
          <div className="empty-state">{t('finance.noTransactionsYet')}</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-elevated)' }}>
                  <th style={thStyle}>{t('finance.date')}</th>
                  <th style={thStyle}>{t('finance.description')}</th>
                  <th style={thStyle}>{t('finance.wallet')}</th>
                  <th style={thStyle}>{t('finance.category')}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{t('finance.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map(tx => {
                  const txType = getTransactionType(tx)
                  const txColor = getTransactionColor(tx)
                  const txIcon = getTransactionIcon(tx)

                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={tdStyle}>{formatDate(tx.transactionDate || tx.date)}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Icon name={txIcon} size={16} style={{ color: txColor }} />
                          {tx.name || tx.description || '—'}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Icon name={tx.wallet?.iconName || 'wallet'} size={16} style={{ color: tx.wallet?.colour || FINANCE_COLOR }} />
                          {tx.wallet?.name || '—'}
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
                        {formatCurrency(Math.abs(tx.amount), tx.wallet?.currency || 'EUR')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
      </ScrollReveal>

      {showTxForm && (
        <TransactionForm
          wallets={wallets}
          categories={categories}
          onClose={() => setShowTxForm(false)}
          onSaved={loadDashboard}
        />
      )}
    </>
  )
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
