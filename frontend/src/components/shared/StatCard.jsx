import React from 'react'
import Icon from '../icons/Icon'
import Sparkline from '../Sparkline'

export function StatCard({ label, value, subtitle, icon, accentColor, trend }) {
  return (
    <div className="stat-card">
      {icon && (
        <div className="stat-card-icon" style={{
          background: accentColor ? `${accentColor}15` : 'var(--color-accent-muted)',
          color: accentColor || 'var(--color-accent)',
        }}>
          <Icon name={icon} size={20} />
        </div>
      )}
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accentColor ? {
        background: `linear-gradient(135deg, ${accentColor}, color-mix(in srgb, ${accentColor} 60%, white))`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      } : undefined}>
        {value}
      </div>
      {trend && trend.length > 1 && (
        <div style={{ marginTop: '0.35rem' }}>
          <Sparkline data={trend} color={accentColor || 'var(--color-accent)'} />
        </div>
      )}
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  )
}
