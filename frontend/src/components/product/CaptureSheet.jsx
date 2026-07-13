import React, { useEffect, useRef } from 'react'

import Icon from '../icons/Icon'

export default function CaptureSheet({ actions, open, onClose, onSelect }) {
  const closeButtonRef = useRef(null)
  const firstActionRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    window.requestAnimationFrame(() => (firstActionRef.current || closeButtonRef.current)?.focus())
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="capture-sheet-layer">
      <button type="button" className="capture-sheet-backdrop" onClick={onClose} aria-label="Close capture menu" />
      <section className="capture-sheet" role="dialog" aria-modal="true" aria-labelledby="capture-sheet-title">
        <header className="capture-sheet__header">
          <div>
            <span>New record</span>
            <h2 id="capture-sheet-title">What happened?</h2>
          </div>
          <button ref={closeButtonRef} type="button" className="capture-sheet__close" onClick={onClose} aria-label="Close capture menu">
            <Icon name="x" size={19} />
          </button>
        </header>
        <div className="capture-sheet__actions">
          {actions.map((action, index) => (
            <button
              key={action.id}
              ref={index === 0 ? firstActionRef : undefined}
              type="button"
              onClick={() => onSelect(action)}
            >
              <Icon name={action.icon} size={20} />
              <span>{action.label}</span>
              <Icon name="chevron-right" size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
