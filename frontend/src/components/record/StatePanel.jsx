import React from 'react'
import Icon from '../icons/Icon'

const ICONS = { loading: 'loader', empty: 'inbox', error: 'alert-triangle', offline: 'wifi-off', success: 'check-circle' }

export default function StatePanel({ action, detail, kind = 'empty', title }) {
  return (
    <div className={`record-state record-state--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon name={ICONS[kind] || ICONS.empty} size={20} />
      <div><strong>{title}</strong>{detail && <p>{detail}</p>}</div>
      {action && <div className="record-state__action">{action}</div>}
    </div>
  )
}
