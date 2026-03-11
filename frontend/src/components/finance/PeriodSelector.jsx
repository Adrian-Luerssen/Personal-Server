import React from 'react'

const PERIODS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
]

export function getDateRange(period) {
  const now = new Date()
  let from = null, to = null

  if (period === 'week') {
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    from = monday.toISOString().slice(0, 10)
    to = sunday.toISOString().slice(0, 10)
  } else if (period === 'month') {
    from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    to = lastDay.toISOString().slice(0, 10)
  } else if (period === 'year') {
    from = `${now.getFullYear()}-01-01`
    to = `${now.getFullYear()}-12-31`
  }
  return { from, to }
}

export function getPeriodLabel(period) {
  const now = new Date()
  if (period === 'week') {
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmt = d => d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
    return `${fmt(monday)} – ${fmt(sunday)}`
  }
  if (period === 'month') {
    return now.toLocaleDateString('en', { month: 'long', year: 'numeric' })
  }
  if (period === 'year') return now.getFullYear().toString()
  return 'All Time'
}

export default function PeriodSelector({ value, onChange }) {
  return (
    <div className="period-selector">
      {PERIODS.map(p => (
        <button
          key={p.key}
          className={`btn small ${value === p.key ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onChange(p.key)}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
