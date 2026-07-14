import React, { useEffect, useRef } from 'react'

import Icon from '../icons/Icon'

export default function CaptureSheet({ actions, open, onClose, onSelect }) {
  const closeButtonRef = useRef(null)
  const firstActionRef = useRef(null)
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    const focusFrame = window.requestAnimationFrame(() => (firstActionRef.current || closeButtonRef.current)?.focus())
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="capture-sheet-layer">
      <button type="button" className="capture-sheet-backdrop" onClick={onClose} aria-label="Close capture menu" />
      <section ref={dialogRef} className="capture-sheet" role="dialog" aria-modal="true" aria-labelledby="capture-sheet-title">
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
