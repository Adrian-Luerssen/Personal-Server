import React, { useState, useEffect, useCallback } from 'react'
import { getApiBase } from '../config'

const POLL_INTERVAL = 30000 // 30 seconds

export default function ApiStatus() {
  const [status, setStatus] = useState('checking') // 'connected' | 'disconnected' | 'checking'

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/health`, { method: 'GET' })
      setStatus(res.ok ? 'connected' : 'disconnected')
    } catch {
      setStatus('disconnected')
    }
  }, [])

  useEffect(() => {
    checkHealth()
    const id = setInterval(checkHealth, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [checkHealth])

  const color = status === 'connected' ? '#22c55e' : status === 'disconnected' ? '#ef4444' : '#facc15'
  const label = status === 'connected' ? 'Connected' : status === 'disconnected' ? 'Disconnected' : 'Checking...'

  return (
    <div
      onClick={checkHealth}
      title="API status — click to refresh"
      className="api-status"
      style={{
        position: 'fixed',
        top: '0.75rem',
        right: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.3rem 0.65rem',
        borderRadius: '999px',
        background: 'var(--glass-bg, rgba(255,255,255,0.06))',
        border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
        backdropFilter: 'blur(8px)',
        fontSize: '0.7rem',
        fontWeight: 500,
        color: 'var(--color-text-secondary, #aaa)',
        cursor: 'pointer',
        zIndex: 1000,
        userSelect: 'none',
        transition: 'opacity 0.2s',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 6px ${color}`,
          flexShrink: 0,
        }}
      />
      <span className="api-status-label">{label}</span>
    </div>
  )
}
