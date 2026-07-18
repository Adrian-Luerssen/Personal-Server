import React from 'react'

export function SummaryItem({ detail, label, tone = 'neutral', value }) {
  return <div className={`record-summary__item record-summary__item--${tone}`}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
}

export default function SummaryStrip({ children, className = '', ...props }) {
  return <section className={`record-summary ${className}`.trim()} data-count={React.Children.count(children)} {...props}>{children}</section>
}
