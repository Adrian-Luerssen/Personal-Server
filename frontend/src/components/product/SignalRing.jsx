import React from 'react'

export default function SignalRing({ value = 0, max = 100, label, domain = 'today', size = 112 }) {
  const safeMax = Math.max(1, Number(max) || 1)
  const safeValue = Math.min(safeMax, Math.max(0, Number(value) || 0))
  const progress = safeValue / safeMax
  return (
    <div
      className="signal-ring"
      data-domain={domain}
      role="progressbar"
      aria-label={label}
      aria-valuemin="0"
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
      style={{ '--signal-progress': `${progress * 360}deg`, '--signal-size': `${size}px` }}
    >
      <span><output>{Math.round(progress * 100)}</output><small>%</small></span>
    </div>
  )
}
