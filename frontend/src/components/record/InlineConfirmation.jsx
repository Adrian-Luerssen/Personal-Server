import React from 'react'

export default function InlineConfirmation({ busy = false, confirmLabel = 'Confirm', message, onCancel, onConfirm }) {
  return (
    <div className="record-inline-confirmation" role="alert">
      <span>{message}</span>
      <div>
        <button type="button" className="btn subtle small" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="btn danger small" onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
      </div>
    </div>
  )
}
