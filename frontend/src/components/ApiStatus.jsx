import React, { useCallback, useEffect, useState } from 'react'
import { getApiBase } from '../config'

const POLL_INTERVAL = 30000

export default function ApiStatus() {
  const [status, setStatus] = useState('checking')

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${getApiBase()}/health`, { method: 'GET' })
      setStatus(response.ok ? 'connected' : 'disconnected')
    } catch {
      setStatus('disconnected')
    }
  }, [])

  useEffect(() => {
    checkHealth()
    const id = setInterval(checkHealth, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [checkHealth])

  const label = status === 'connected' ? 'Connected' : status === 'disconnected' ? 'Disconnected' : 'Checking…'

  return (
    <button
      type="button"
      onClick={checkHealth}
      title="API status — click to refresh"
      className={`api-status is-${status}`}
    >
      <span className="api-status__dot" />
      <span className="api-status-label">{label}</span>
    </button>
  )
}
