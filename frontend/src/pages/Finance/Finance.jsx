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
import { isNativeMobileApp } from '../../mobilePlatform'

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

function numberValue(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeTransactionList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.transactions)) return data.transactions
  return []
}

function looksLikeEmptyFinanceCache(summaryData, transactionsData) {
  return (
    normalizeTransactionList(transactionsData).length === 0 &&
    numberValue(summaryData?.totalIncome) === 0 &&
    numberValue(summaryData?.totalExpense ?? summaryData?.totalExpenses) === 0 &&
    numberValue(summaryData?.incomeCount) === 0 &&
    numberValue(summaryData?.expenseCount) === 0
  )
}

export default function Finance() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [wallets, setWallets] = useState([])
  const [categories, setCategories] = useState([])
  const [summary, setSummary] = useState(null)
  const [budgets, setBudgets] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [period, setPeriod] = useState('month')
  const [showTxForm, setShowTxForm] = useState(false)
  const [txFormMode, setTxFormMode] = useState('expense')
  const [txFormData, setTxFormData] = useState(null)

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

      const walletsPath = '/finance/wallets'
      const categoriesPath = '/finance/categories'
      const summaryPath = `/finance/transactions/summary?${summaryParams}`
      const transactionsPath = `/finance/transactions?${txParams}`
      const budgetsPath = '/finance/budgets/status'

      const [walletsData, categoriesData, summaryData, transactionsData, budgetsData] = await Promise.all([
        api.get(walletsPath),
        api.get(categoriesPath),
        api.get(summaryPath),
        api.get(transactionsPath),
        api.get(budgetsPath).catch(() => []),
      ])
      setWallets(walletsData || [])
      setCategories(categoriesData || [])
      setSummary(summaryData || {})
      setRecentTransactions(normalizeTransactionList(transactionsData))
      setBudgets(Array.isArray(budgetsData) ? budgetsData : budgetsData?.items || [])

      if (looksLikeEmptyFinanceCache(summaryData, transactionsData)) {
        const [freshWalletsData, freshCategoriesData, freshSummaryData, freshTransactionsData, freshBudgetsData] = await Promise.all([
          api.get(walletsPath, { force: true }),
          api.get(categoriesPath, { force: true }),
          api.get(summaryPath, { force: true }),
          api.get(transactionsPath, { force: true }),
          api.get(budgetsPath, { force: true }).catch(() => []),
        ])
        setWallets(freshWalletsData || [])
        setCategories(freshCategoriesData || [])
        setSummary(freshSummaryData || {})
        setRecentTransactions(normalizeTransactionList(freshTransactionsData))
        setBudgets(Array.isArray(freshBudgetsData) ? freshBudgetsData : freshBudgetsData?.items || [])
      }
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

  function openTransactionForm(mode = 'expense') {
    setTxFormData(null)
    setTxFormMode(mode)
    setShowTxForm(true)
  }

  function openEditTransaction(transaction) {
    setTxFormData(transaction)
    setTxFormMode(getTransactionType(transaction))
    setShowTxForm(true)
  }

  function closeTransactionForm() {
    setShowTxForm(false)
    setTxFormData(null)
  }

  if (isNativeMobileApp()) {
    return (
      <>
        <NativeFinanceDashboard
          loading={loading}
          wallets={wallets}
          categories={categories}
          budgets={budgets}
          recentTransactions={recentTransactions}
          categorySpending={categorySpending}
          totalBalance={totalBalance}
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          netFlow={netFlow}
          period={period}
          setPeriod={setPeriod}
          navigate={navigate}
          onAddTransaction={openTransactionForm}
          onEditTransaction={openEditTransaction}
        />
        {showTxForm && (
          <TransactionForm
            transaction={txFormData}
            wallets={wallets}
            categories={categories}
            initialMode={txFormMode}
            onClose={closeTransactionForm}
            onSaved={loadDashboard}
          />
        )}
      </>
    )
  }

  return (
    <div className="finance-desktop-page">
      <div className="finance-desktop-page__header">
        <PageHeader
          icon="wallet"
          eyebrow="Finance ledger"
          title="Money"
          subtitle={`${getPeriodLabel(period)} records, wallets, and category pressure.`}
          accentColor="#fbbf24"
        />
        <button className="btn btn-primary finance-primary-action" onClick={() => openTransactionForm('expense')}>
          <Icon name="plus" size={16} /> Add expense
        </button>
      </div>

      <div className="finance-period-row">
        <PeriodSelector value={period} onChange={setPeriod} />
        <span>{getPeriodLabel(period)}</span>
      </div>

      <ScrollReveal>
        <div className="stat-grid finance-ledger-metrics">
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

      <ScrollReveal delay={100}>
      <section className="finance-ledger-section">
        <div className="finance-section-head">
          <div>
            <span>Actions</span>
            <h3>Correct the ledger</h3>
          </div>
        </div>
        <div className="finance-action-strip">
          {[
            { icon: 'receipt', label: 'Transactions', onClick: () => navigate('/finance/transactions'), accent: true },
            { icon: 'database', label: 'Settings and Data', onClick: () => navigate('/settings?section=data') },
          ].map(action => (
            <button
              key={action.label}
              className={`finance-action-tile ${action.accent ? 'finance-action-tile--accent' : ''}`}
              onClick={action.onClick}
            >
              <Icon name={action.icon} size={18} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal delay={200}>
      <div className="finance-ledger-grid">
        <section className="finance-ledger-section">
          <div className="finance-section-head">
          <h3>
            <Icon name="pie-chart" size={20} style={{ marginRight: 8 }} />
            {t('finance.spendingByCategory')}
          </h3>
          </div>
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
        </section>

        <section className="finance-ledger-section">
          <div className="finance-section-head">
            <h3>
              <Icon name="landmark" size={20} style={{ marginRight: 8 }} />
              {t('finance.wallets')}
            </h3>
            <button className="btn small" onClick={() => navigate('/settings?section=data')}>Data</button>
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
        </section>
      </div>
      </ScrollReveal>

      <ScrollReveal delay={300}>
      <section className="finance-ledger-section">
        <div className="finance-section-head">
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
          <div className="finance-table-shell">
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="finance-ledger-table">
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
      </section>
      </ScrollReveal>

      {showTxForm && (
        <TransactionForm
          wallets={wallets}
          categories={categories}
          initialMode={txFormMode}
          onClose={() => setShowTxForm(false)}
          onSaved={loadDashboard}
        />
      )}
    </div>
  )
}

function NativeFinanceDashboard({
  loading,
  wallets,
  budgets,
  recentTransactions,
  categorySpending,
  totalBalance,
  totalIncome,
  totalExpenses,
  netFlow,
  period,
  setPeriod,
  navigate,
  onAddTransaction,
  onEditTransaction,
}) {
  const periodOptions = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
    { id: 'all', label: 'All' },
  ]
  const topWallets = wallets.slice(0, 3)
  const visibleBudgets = (budgets || []).slice(0, 3)
  const visibleTransactions = recentTransactions.slice(0, 5)
  const visibleCategories = categorySpending.slice(0, 5)

  return (
    <div className="native-finance-page native-dashboard" data-testid="native-finance-dashboard">
      <section className="native-finance-hero">
        <div>
          <span className="native-eyebrow">Finance</span>
          <h1>Money</h1>
          <p>{getPeriodLabel(period)} overview</p>
        </div>
        <div className="native-finance-balance">
          <span>Total balance</span>
          <strong>{loading ? '...' : formatCurrency(totalBalance)}</strong>
        </div>
      </section>

      <div className="native-finance-periods" role="group" aria-label="Finance period">
        {periodOptions.map(option => (
          <button
            key={option.id}
            type="button"
            className={period === option.id ? 'is-active' : ''}
            onClick={() => setPeriod(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <section className="native-finance-actions" aria-label="Quick transaction actions">
        <button type="button" className="native-finance-action native-finance-action--expense" aria-label="Add expense" onClick={() => onAddTransaction('expense')}>
          <Icon name="arrow-up" size={18} />
          <span>Add expense</span>
        </button>
        <button type="button" className="native-finance-action native-finance-action--income" aria-label="Add income" onClick={() => onAddTransaction('income')}>
          <Icon name="arrow-down" size={18} />
          <span>Add income</span>
        </button>
        <button type="button" className="native-finance-action native-finance-action--transfer" aria-label="Add transfer" onClick={() => onAddTransaction('transfer')}>
          <Icon name="arrow-left-right" size={18} />
          <span>Transfer</span>
        </button>
      </section>

      <section className="native-finance-metrics">
        <NativeFinanceMetric label="Income" value={formatCurrency(totalIncome)} tone="income" />
        <NativeFinanceMetric label="Expense" value={formatCurrency(Math.abs(totalExpenses))} tone="expense" />
        <NativeFinanceMetric label="Net" value={formatCurrency(netFlow)} tone={netFlow >= 0 ? 'income' : 'expense'} />
      </section>

      {visibleBudgets.length > 0 && (
        <section className="native-finance-card">
          <div className="native-section-head">
            <div>
              <h2>Budget pressure</h2>
              <p>Live limits for the current period.</p>
            </div>
            <button type="button" onClick={() => navigate('/finance/settings')}>Manage</button>
          </div>
          <div className="native-budget-list">
            {visibleBudgets.map(budget => (
              <NativeBudgetPressureCard key={budget.id} budget={budget} />
            ))}
          </div>
        </section>
      )}

      <section className="native-finance-card">
        <div className="native-section-head">
          <div>
            <h2>Wallets</h2>
            <p>Balances that transactions will use by default.</p>
          </div>
          <button type="button" onClick={() => navigate('/settings?section=data')}>Manage</button>
        </div>
        <div className="native-wallet-list">
          {loading ? (
            <div className="native-empty-state">Loading wallets...</div>
          ) : topWallets.length === 0 ? (
            <div className="native-empty-state">No wallets yet.</div>
          ) : (
            topWallets.map(wallet => (
              <div key={wallet.id} className="native-wallet-row">
                <span style={{ color: wallet.colour || FINANCE_COLOR }}>
                  <Icon name={wallet.iconName || 'wallet'} size={17} />
                </span>
                <strong>{wallet.name}</strong>
                <em>{formatCurrency(wallet.balance || 0, wallet.currency || 'EUR')}</em>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="native-finance-card">
        <div className="native-section-head">
          <div>
            <h2>Recent transactions</h2>
            <p>Tap a row to edit it.</p>
          </div>
          <button type="button" onClick={() => navigate('/finance/transactions')}>All</button>
        </div>
        <div className="native-transaction-list">
          {loading ? (
            <div className="native-empty-state">Loading transactions...</div>
          ) : visibleTransactions.length === 0 ? (
            <div className="native-empty-state">No transactions yet.</div>
          ) : (
            visibleTransactions.map(tx => (
              <NativeTransactionCard
                key={tx.id}
                tx={tx}
                onClick={() => onEditTransaction(tx)}
              />
            ))
          )}
        </div>
      </section>

      <section className="native-finance-card">
        <div className="native-section-head">
          <div>
            <h2>Spending</h2>
            <p>Largest categories in this period.</p>
          </div>
          <button type="button" onClick={() => navigate('/settings?section=data')}>Manage</button>
        </div>
        <div className="native-category-spend-list">
          {loading ? (
            <div className="native-empty-state">Loading categories...</div>
          ) : visibleCategories.length === 0 ? (
            <div className="native-empty-state">No spending data.</div>
          ) : (
            visibleCategories.map((category, index) => (
              <div key={category.categoryId || category.name || index} className="native-category-spend-row">
                <CategoryIcon
                  category={{
                    name: category.categoryName || category.name,
                    iconName: category.categoryIcon,
                    colour: category.categoryColour || CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                  }}
                  size={34}
                />
                <strong>{category.categoryName || category.name || 'Uncategorized'}</strong>
                <em>{formatCurrency(Math.abs(category.total || category.amount || 0))}</em>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function NativeBudgetPressureCard({ budget }) {
  const percent = Math.max(0, Math.min(100, Number(budget.percentage || 0)))
  const isOver = budget.isOver || percent >= 100
  const tone = isOver ? 'danger' : percent >= 80 ? 'warning' : 'ok'
  const category = {
    name: budget.categoryName || budget.category?.name || 'Overall budget',
    iconName: budget.categoryIcon || budget.category?.iconName || 'piggy-bank',
    colour: budget.categoryColour || budget.category?.colour || FINANCE_COLOR,
  }

  return (
    <article className={`native-budget-card native-budget-card--${tone}`}>
      <div className="native-budget-card__head">
        <CategoryIcon category={category} size={34} />
        <span>
          <strong>{category.name}</strong>
          <small>{budget.period || 'monthly'} budget</small>
        </span>
        <em>{percent}%</em>
      </div>
      <div className="native-budget-card__bar" aria-label={`${category.name} budget ${percent}% used`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="native-budget-card__meta">
        <span>{formatCurrency(Math.abs(Number(budget.spent || 0)))} spent</span>
        <span>{formatCurrency(Number(budget.remaining || 0))} left</span>
      </div>
    </article>
  )
}

function NativeFinanceMetric({ label, value, tone }) {
  return (
    <div className={`native-finance-metric native-finance-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function NativeTransactionCard({ tx, onClick }) {
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
          {tx.wallet?.name ? ` - ${tx.wallet.name}` : ''}
        </small>
      </span>
      <em style={{ color: txColor }}>{sign}{formatCurrency(Math.abs(tx.amount), tx.wallet?.currency || 'EUR')}</em>
    </button>
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
