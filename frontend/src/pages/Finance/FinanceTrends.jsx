import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import Icon from '../../components/icons/Icon'
import { normalizeFinanceColor } from '../../components/finance/financeVisuals.mjs'
import {
  NativeCashflowChart,
  NativeCategoryMixPanel,
  NativeTransactionTimeline,
  formatCurrency,
  getCategorySpending,
  getLargestExpense,
  getTransactionCategory,
  getTransactionName,
  normalizeTransactionList,
  numberValue,
} from './nativeFinanceComponents'

function getCurrentMonthRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { from, to }
}

function getWalletDistribution(wallets) {
  const total = wallets.reduce((sum, wallet) => sum + Math.abs(numberValue(wallet.balance)), 0)
  return wallets.slice(0, 5).map((wallet) => ({
    ...wallet,
    share: total > 0 ? Math.round((Math.abs(numberValue(wallet.balance)) / total) * 100) : 0,
  }))
}

export default function FinanceTrends() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [wallets, setWallets] = useState([])
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({})

  useEffect(() => {
    let cancelled = false
    async function loadTrends() {
      setLoading(true)
      try {
        const { from, to } = getCurrentMonthRange()
        const params = new URLSearchParams({ limit: '100', from, to })
        const [walletsData, txData, summaryData] = await Promise.all([
          api.get('/finance/wallets'),
          api.get(`/finance/transactions?${params}`),
          api.get(`/finance/transactions/summary?from=${from}&to=${to}`),
        ])
        if (cancelled) return
        setWallets(walletsData || [])
        setTransactions(normalizeTransactionList(txData))
        setSummary(summaryData || {})
      } catch (error) {
        console.error('Failed to load finance trends:', error)
        if (!cancelled) {
          setWallets([])
          setTransactions([])
          setSummary({})
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadTrends()
    return () => { cancelled = true }
  }, [])

  const categories = getCategorySpending(summary, transactions)
  const largestExpense = getLargestExpense(transactions)
  const walletDistribution = getWalletDistribution(wallets)
  const totalExpense = Math.abs(numberValue(summary.totalExpense ?? summary.totalExpenses))
  const dailyAverage = totalExpense / Math.max(1, new Date().getDate())

  return (
    <div className="native-finance-page native-dashboard" data-testid="native-finance-trends">
      <section className="native-finance-hero native-finance-hero--ledger">
        <div>
          <span className="native-eyebrow">Monthly read</span>
          <h1>Trends</h1>
          <p>Patterns from the current transaction set.</p>
        </div>
        <button type="button" className="native-finance-fab-inline" aria-label="Open transactions" onClick={() => navigate('/finance/transactions')}>
          <Icon name="receipt" size={18} />
        </button>
      </section>

      <section className="native-finance-metrics">
        <div className="native-finance-metric native-finance-metric--expense">
          <span>Spent</span>
          <strong>{formatCurrency(totalExpense)}</strong>
        </div>
        <div className="native-finance-metric">
          <span>Daily avg</span>
          <strong>{formatCurrency(dailyAverage)}</strong>
        </div>
        <div className="native-finance-metric">
          <span>Records</span>
          <strong>{transactions.length}</strong>
        </div>
      </section>

      <NativeCashflowChart transactions={transactions} title="Cashflow" subtitle="Cumulative movement this month" />
      <NativeCategoryMixPanel categories={categories} title="Category mix" />

      <section className="native-finance-card">
        <div className="native-section-head">
          <div>
            <h2>Largest expense</h2>
            <p>Highest single outgoing record in this view.</p>
          </div>
        </div>
        {loading ? (
          <div className="native-empty-state native-empty-state--compact">Loading expense...</div>
        ) : largestExpense ? (
          <div className="native-largest-expense">
            <span>
              <Icon name={getTransactionCategory(largestExpense).iconName} size={20} />
            </span>
            <div>
              <strong>{getTransactionName(largestExpense)}</strong>
              <small>{getTransactionCategory(largestExpense).name}</small>
            </div>
            <em>-{formatCurrency(Math.abs(numberValue(largestExpense.amount)))}</em>
          </div>
        ) : (
          <div className="native-empty-state native-empty-state--compact">No expenses in this period.</div>
        )}
      </section>

      <section className="native-finance-card">
        <div className="native-section-head">
          <div>
            <h2>Wallet distribution</h2>
            <p>Where the current balance lives.</p>
          </div>
        </div>
        <div className="native-wallet-distribution">
          {walletDistribution.length === 0 ? (
            <div className="native-empty-state native-empty-state--compact">No wallets yet.</div>
          ) : (
            walletDistribution.map((wallet) => (
              <div key={wallet.id || wallet.name} className="native-wallet-distribution__row">
                <span>{wallet.name}</span>
                <div aria-hidden="true"><i style={{ width: `${wallet.share}%`, background: normalizeFinanceColor(wallet.colour, '#d8aa35') }} /></div>
                <strong>{formatCurrency(wallet.balance || 0, wallet.currency || 'EUR')}</strong>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="native-finance-card">
        <div className="native-section-head">
          <div>
            <h2>Recent records</h2>
            <p>Latest entries behind the trend.</p>
          </div>
        </div>
        <NativeTransactionTimeline transactions={transactions} limit={4} />
      </section>
    </div>
  )
}
