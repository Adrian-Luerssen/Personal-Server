import React from 'react'

export function LoadingLine({ width = 100 }) {
  return <div style={{ background: 'var(--color-accent-muted)', height: 16, width, borderRadius: 'var(--radius-sm)', margin: '4px 0', animation: 'pulse 1.2s infinite alternate' }} />
}

export function LoadingDot() {
  return <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--color-accent-muted)', animation: 'pulse 1.2s infinite alternate' }} />
}

export function LoadingSpinner({ size = 24 }) {
  return (
    <div style={{
      width: size,
      height: size,
      border: '3px solid var(--color-accent-muted)',
      borderTop: '3px solid var(--color-accent)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
  )
}
