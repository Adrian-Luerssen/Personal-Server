import React from 'react'
import { LoadingLine } from './LoadingLine'

export function SkeletonCard({ lines = 3, widths }) {
  const defaultWidths = widths || ["80%", "60%", "40%"]
  const rows = Array.from({ length: lines })
  return (
    <div className="card" style={{ padding: '.75rem' }}>
      {rows.map((_, i) => (
        <LoadingLine key={i} width={defaultWidths[i % defaultWidths.length]} />
      ))}
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div className="card" style={{ padding: '.75rem' }}>
      <LoadingLine width={"50%"} />
      <div style={{ height: 8 }} />
      <LoadingLine width={"70%"} />
    </div>
  )
}

export function SkeletonSessionCard() {
  return (
    <div className="card" style={{ padding: '.75rem' }}>
      <LoadingLine width={"40%"} />
      <LoadingLine width={"30%"} />
      <div style={{ height: 8 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.5rem' }}>
        <LoadingLine width={"80%"} />
        <LoadingLine width={"60%"} />
        <LoadingLine width={"70%"} />
      </div>
    </div>
  )
}
