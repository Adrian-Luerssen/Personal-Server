import React from 'react'
import Icon from '../icons/Icon'
import { ProgressBar } from './ProgressBar'
import { formatImportDuration } from '../../importProgress.mjs'

function eventLabel(event, stageLabels) {
  return stageLabels[event.stage] || event.stage || 'Import event'
}

function eventTime(event) {
  if (!event.emittedAt) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(event.emittedAt))
  } catch {
    return ''
  }
}

export function ImportProgressPanel({
  progress,
  events = [],
  errorMsg,
  stageIcons = {},
  stageLabels = {},
  color = 'var(--color-accent)',
  pendingTitle = 'Importing...',
  completeTitle = 'Import Complete!',
  errorTitle = 'Import Failed',
}) {
  const current = progress || { stage: 'starting', progress: 0 }
  const isError = current.stage === 'error' || Boolean(errorMsg)
  const isDone = current.stage === 'complete'
  const icon = isError
    ? (stageIcons.error || 'alert-circle')
    : isDone
      ? (stageIcons.complete || 'check-circle')
      : (stageIcons[current.stage] || 'refresh-cw')
  const label = eventLabel(current, stageLabels)
  const recentEvents = events.slice(-6).reverse()
  const elapsed = formatImportDuration(current.elapsedMs)
  const lastUpdate = eventTime(current)
  const countText = Number(current.total) > 0
    ? `${Number(current.current || 0).toLocaleString()} / ${Number(current.total).toLocaleString()}`
    : 'Waiting'

  return (
    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
      <Icon
        name={icon}
        size={56}
        style={{
          color: isError ? 'var(--color-error)' : isDone ? 'var(--color-success)' : color,
          marginBottom: '1rem',
          display: 'block',
          margin: '0 auto 1rem',
          animation: (!isError && !isDone) ? 'spin 2s linear infinite' : 'none',
        }}
      />

      <h3 style={{ marginBottom: '0.5rem' }}>
        {isError ? errorTitle : isDone ? completeTitle : pendingTitle}
      </h3>

      {errorMsg ? (
        <div className="alert-error" style={{ marginTop: '1rem', textAlign: 'left' }}>{errorMsg}</div>
      ) : (
        <>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            {current.message || label}
          </p>
          <ProgressBar value={current.progress} color={color} label={label} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.75rem',
            marginTop: '1rem',
            textAlign: 'left',
          }}>
            {[
              ['Elapsed', elapsed],
              ['Records', countText],
              ['Stage', label],
              ['Last update', lastUpdate || 'Now'],
            ].map(([key, value]) => (
              <div key={key} style={{
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.7rem 0.75rem',
                background: 'var(--color-bg-elevated)',
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                  {key}
                </div>
                <div style={{ marginTop: '0.25rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {recentEvents.length > 0 && (
            <div style={{ marginTop: '1.25rem', textAlign: 'left' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800, marginBottom: '0.5rem' }}>
                Stream events
              </div>
              <div style={{ display: 'grid', gap: '0.45rem' }}>
                {recentEvents.map((event) => (
                  <div key={event.sequence || `${event.stage}-${event.emittedAt}`} style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(72px, auto) 1fr auto',
                    gap: '0.6rem',
                    alignItems: 'center',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.55rem 0.65rem',
                    background: event.stage === current.stage ? 'var(--color-accent-muted)' : 'transparent',
                    fontSize: '0.85rem',
                  }}>
                    <span style={{ color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{eventTime(event) || '--:--'}</span>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.message || eventLabel(event, stageLabels)}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(Number(event.progress || 0))}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
