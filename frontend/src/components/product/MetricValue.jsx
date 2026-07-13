import React from 'react'

export default function MetricValue({ label, value, detail, trend, domain = 'today', compact = false }) {
  return (
    <div className={`metric-value${compact ? ' metric-value--compact' : ''}`} data-domain={domain}>
      <span>{label}</span>
      <output>{value}</output>
      <div>{detail ? <small>{detail}</small> : null}{trend ? <em>{trend}</em> : null}</div>
    </div>
  )
}
