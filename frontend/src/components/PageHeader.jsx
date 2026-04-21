import React from 'react'
import Icon from './icons/Icon'

export default function PageHeader({
  icon,
  title,
  subtitle,
  eyebrow,
  meta,
  accentColor = 'var(--color-accent)',
}) {
  return (
    <div className="page-header">
      <div className="page-header-copy">
        {eyebrow && <div className="page-header-eyebrow">{eyebrow}</div>}
        <div className="page-header-main">
          {icon && (
            <div className="page-header-icon" style={{ background: `${accentColor}20`, color: accentColor }}>
              <Icon name={icon} size={28} />
            </div>
          )}
          <div>
            <h1 className="page-header-title">{title}</h1>
            <div className="page-header-underline" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
          </div>
        </div>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {meta && <div className="page-header-meta">{meta}</div>}
    </div>
  )
}
