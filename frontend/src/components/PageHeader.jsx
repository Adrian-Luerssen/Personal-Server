import React from 'react'
import Icon from './icons/Icon'

export default function PageHeader({ icon, title, subtitle, accentColor = 'var(--color-accent)' }) {
  return (
    <div className="page-header">
      {icon && (
        <div className="page-header-icon" style={{ background: `${accentColor}20`, color: accentColor }}>
          <Icon name={icon} size={28} />
        </div>
      )}
      <div>
        <h1 className="page-header-title">{title}</h1>
        <div className="page-header-underline" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}
