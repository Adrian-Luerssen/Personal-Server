import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import Icon from '../../components/icons/Icon'
import {
  NativeBudgetLedgerCard,
  formatCurrency,
  numberValue,
} from './nativeFinanceComponents'

function summarizeBudgets(budgets) {
  const spent = budgets.reduce((sum, budget) => sum + Math.abs(numberValue(budget.spent)), 0)
  const remaining = budgets.reduce((sum, budget) => sum + numberValue(budget.remaining), 0)
  const overCount = budgets.filter((budget) => budget.isOver || numberValue(budget.remaining) < 0).length
  return { spent, remaining, overCount }
}

export default function FinanceBudgets() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState([])

  useEffect(() => {
    let cancelled = false
    async function loadBudgets() {
      setLoading(true)
      try {
        const data = await api.get('/finance/budgets/status')
        if (!cancelled) setBudgets(Array.isArray(data) ? data : data?.items || [])
      } catch (error) {
        console.error('Failed to load finance budgets:', error)
        if (!cancelled) setBudgets([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadBudgets()
    return () => { cancelled = true }
  }, [])

  const summary = summarizeBudgets(budgets)

  return (
    <div className="native-finance-page native-dashboard" data-testid="native-finance-budgets">
      <section className="native-finance-hero native-finance-hero--ledger">
        <div>
          <span className="native-eyebrow">Money control</span>
          <h1>Budgets</h1>
          <p>Limits that keep the month readable.</p>
        </div>
        <button type="button" className="native-finance-fab-inline" onClick={() => navigate('/finance/settings?tab=budgets')}>
          <Icon name="settings" size={18} />
        </button>
      </section>

      <section className="native-finance-metrics">
        <div className="native-finance-metric native-finance-metric--expense">
          <span>Spent</span>
          <strong>{formatCurrency(summary.spent)}</strong>
        </div>
        <div className={`native-finance-metric ${summary.remaining >= 0 ? 'native-finance-metric--income' : 'native-finance-metric--expense'}`}>
          <span>Left</span>
          <strong>{formatCurrency(summary.remaining)}</strong>
        </div>
        <div className="native-finance-metric">
          <span>Over</span>
          <strong>{summary.overCount}</strong>
        </div>
      </section>

      <section className="native-finance-card">
        <div className="native-section-head">
          <div>
            <h2>Spending limits</h2>
            <p>Progress, remaining money, and daily allowance.</p>
          </div>
          <button type="button" onClick={() => navigate('/finance/settings?tab=budgets')}>Manage</button>
        </div>
        <div className="native-budget-list native-budget-list--ledger">
          {loading ? (
            <div className="native-empty-state native-empty-state--compact">Loading budgets...</div>
          ) : budgets.length === 0 ? (
            <div className="native-empty-state native-empty-state--compact">No budgets yet.</div>
          ) : (
            budgets.map((budget) => <NativeBudgetLedgerCard key={budget.id} budget={budget} />)
          )}
        </div>
      </section>
    </div>
  )
}
