import React from 'react'

/**
 * ProgressBar
 * Props:
 *   value: number 0-100
 *   color?: string (CSS color)
 *   height?: number (px, default 8)
 *   animated?: boolean (default true when value < 100)
 *   label?: string
 */
export function ProgressBar({ value = 0, color, height = 8, label }) {
  const clampedValue = Math.max(0, Math.min(100, value))

  return (
    <div style={{ width: '100%' }}>
      {label !== undefined && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.4rem',
          fontSize: '0.85rem',
          color: 'var(--color-text-secondary)',
        }}>
          <span>{label}</span>
          <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
            {Math.round(clampedValue)}%
          </span>
        </div>
      )}
      <div style={{
        width: '100%',
        height,
        borderRadius: 'var(--radius-full)',
        background: 'var(--glass-border)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${clampedValue}%`,
          borderRadius: 'var(--radius-full)',
          background: color || 'var(--color-accent)',
          transition: 'width 0.4s ease',
          boxShadow: `0 0 8px ${color || 'var(--color-accent)'}66`,
        }} />
      </div>
    </div>
  )
}
