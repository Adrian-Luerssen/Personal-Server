import React, { useState, useEffect } from 'react'
import { Icon } from './icons'

let deferredPrompt = null

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      deferredPrompt = e
      // Only show if user hasn't dismissed before
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) setShowPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Hide if already installed
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false)
      deferredPrompt = null
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    deferredPrompt = null
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '5rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 999,
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      maxWidth: '90vw',
    }}>
      <Icon name="download" size={20} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Install App</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          Add to home screen for a better experience
        </div>
      </div>
      <button
        onClick={handleInstall}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: 'var(--color-accent)',
          color: 'var(--color-accent-text)',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          padding: '0.25rem',
          display: 'flex',
        }}
        aria-label="Dismiss"
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  )
}
