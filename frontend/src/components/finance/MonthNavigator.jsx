import React from 'react'
import Icon from '../icons/Icon'

export function getMonthRange(year, month) {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0)
  const to = lastDay.toISOString().slice(0, 10)
  return { from, to }
}

export default function MonthNavigator({ year, month, onChange }) {
  const label = new Date(year, month).toLocaleDateString('en', { month: 'long', year: 'numeric' })

  function prev() {
    const d = new Date(year, month - 1)
    onChange(d.getFullYear(), d.getMonth())
  }

  function next() {
    const d = new Date(year, month + 1)
    onChange(d.getFullYear(), d.getMonth())
  }

  return (
    <div className="month-navigator">
      <button className="btn small btn-ghost" onClick={prev}>
        <Icon name="chevron-left" size={18} />
      </button>
      <span className="month-navigator-label">{label}</span>
      <button className="btn small btn-ghost" onClick={next}>
        <Icon name="chevron-right" size={18} />
      </button>
    </div>
  )
}
