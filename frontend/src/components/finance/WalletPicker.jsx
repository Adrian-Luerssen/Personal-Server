import React, { useState, useRef, useEffect } from 'react'
import Icon from '../icons/Icon'

const FINANCE_COLOR = '#fbbf24'

export default function WalletPicker({ wallets, value, onChange, placeholder = 'Select wallet...', exclude, required }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const items = (wallets || []).filter(w => !exclude || w.id !== exclude)
  const selected = items.find(w => w.id === value)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  function select(wallet) {
    onChange(wallet?.id || '')
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        className="input"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          textAlign: 'left',
          padding: '0.6rem 0.75rem',
        }}
      >
        {selected ? (
          <>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24, height: 24, minWidth: 24,
              borderRadius: 6,
              background: `${selected.colour || FINANCE_COLOR}22`,
            }}>
              <Icon name={selected.iconName || 'wallet'} size={14} style={{ color: selected.colour || FINANCE_COLOR }} />
            </span>
            <span style={{ flex: 1 }}>{selected.name}</span>
            {selected.currency && (
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{selected.currency}</span>
            )}
          </>
        ) : (
          <span style={{ flex: 1, color: 'var(--color-text-muted)' }}>{placeholder}</span>
        )}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 9999,
          marginTop: 4,
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          maxHeight: 260,
          overflowY: 'auto',
        }}>
          {/* Clear option */}
          {!required && value && (
            <div
              onClick={() => select(null)}
              style={{
                ...optionStyle,
                color: 'var(--color-text-muted)',
                fontStyle: 'italic',
                borderBottom: '1px solid var(--glass-border)',
              }}
            >
              <Icon name="x" size={14} /> {placeholder}
            </div>
          )}

          {items.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              No wallets available
            </div>
          )}

          {items.map(wallet => (
            <div
              key={wallet.id}
              onClick={() => select(wallet)}
              style={{
                ...optionStyle,
                background: wallet.id === value ? `${wallet.colour || FINANCE_COLOR}15` : undefined,
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30, height: 30, minWidth: 30,
                borderRadius: 8,
                background: `${wallet.colour || FINANCE_COLOR}22`,
              }}>
                <Icon name={wallet.iconName || 'wallet'} size={16} style={{ color: wallet.colour || FINANCE_COLOR }} />
              </span>
              <span style={{ flex: 1, fontWeight: 500 }}>{wallet.name}</span>
              {wallet.currency && (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{wallet.currency}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const optionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  padding: '0.5rem 0.75rem',
  cursor: 'pointer',
  fontSize: '0.9rem',
  transition: 'background 0.15s',
}
