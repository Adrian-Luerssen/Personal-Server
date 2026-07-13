import React from 'react'

import Icon from '../icons/Icon'

const STATES = Object.freeze({
  fresh: { icon: 'check', label: 'Saved', action: null },
  queued: { icon: 'clock-3', label: 'Queued offline', action: null },
  syncing: { icon: 'refresh-cw', label: 'Syncing', action: null },
  failed: { icon: 'circle-alert', label: 'Sync failed', action: 'Retry' },
  conflict: { icon: 'git-compare-arrows', label: 'Needs review', action: 'Review' },
})

export default function SyncState({ state = 'fresh', onAction, detail }) {
  const config = STATES[state] || STATES.fresh

  return (
    <span className={`sync-state sync-state--${state}`} role="status">
      <Icon name={config.icon} size={14} aria-hidden="true" />
      <span>{detail || config.label}</span>
      {config.action && onAction ? (
        <button type="button" onClick={onAction}>{config.action}</button>
      ) : null}
    </span>
  )
}
