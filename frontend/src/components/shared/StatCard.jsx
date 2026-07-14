import React from 'react'
import Sparkline from '../Sparkline'

export function StatCard({ label, value, subtitle, trend }) {
  return (
    <div className="record-summary__item legacy-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
      {trend && trend.length > 1 && (
        <div className="legacy-summary-item__trend">
          <Sparkline data={trend} color="var(--record-accent)" />
        </div>
      )}
      {subtitle && <small>{subtitle}</small>}
    </div>
  )
}
