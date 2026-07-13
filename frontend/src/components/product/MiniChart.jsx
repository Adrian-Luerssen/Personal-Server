import React, { useId } from 'react'

export default function MiniChart({ values = [], label, domain = 'today' }) {
  const titleId = useId()
  const points = values.length > 1
    ? values.map((value, index) => `${(index / (values.length - 1)) * 100},${36 - (Number(value) || 0) * 0.32}`).join(' ')
    : '0,36 100,36'
  return (
    <figure className="mini-chart" data-domain={domain} aria-labelledby={titleId}>
      <figcaption id={titleId}>{label}</figcaption>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={label}>
        <polyline points={points} vectorEffect="non-scaling-stroke" />
      </svg>
    </figure>
  )
}
