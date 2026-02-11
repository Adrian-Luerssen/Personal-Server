import React from 'react'

export function StatCard({ label, value, subtitle }) {
  return (
    <div className="card" style={{ padding: '.75rem' }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {subtitle && <div style={{ fontSize: '.85rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{subtitle}</div>}
    </div>
  )
}
