import React, { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../icons/Icon'

function toLocalDateTime(value) {
  const date = new Date(value || Date.now())
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function PaymentCaptureSheet({ suggestion, wallets = [], categories = [], busy = false, onClose, onConfirm, onIgnore }) {
  const [merchant, setMerchant] = useState(suggestion?.merchantRaw || 'Detected payment')
  const [amount, setAmount] = useState(String(suggestion?.amount || ''))
  const [occurredAt, setOccurredAt] = useState(toLocalDateTime(suggestion?.occurredAt))
  const [walletId, setWalletId] = useState(suggestion?.walletId || '')
  const [categoryId, setCategoryId] = useState(suggestion?.categoryId || '')
  const merchantRef = useRef(null)

  useEffect(() => {
    merchantRef.current?.focus()
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  const source = suggestion?.sourceAppLabel || suggestion?.sourcePackage || 'your phone'
  const confidenceLabel = useMemo(() => {
    const confidence = Number(suggestion?.confidence || 0)
    if (confidence >= 0.85) return 'High-confidence detection'
    if (confidence >= 0.6) return 'Check the detected details'
    return 'Low-confidence detection — review carefully'
  }, [suggestion])
  const canConfirm = Number(amount) > 0 && merchant.trim() && walletId && categoryId && occurredAt

  function submit(event) {
    event.preventDefault()
    if (!canConfirm || busy) return
    onConfirm(suggestion, {
      name: merchant.trim(), amount: Number(amount), occurredAt: new Date(occurredAt).toISOString(),
      walletId, categoryId, note: `Reviewed from ${source} payment notification.`,
    })
  }

  return (
    <div className="payment-capture-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && !busy && onClose()}>
      <section className="payment-capture-sheet" role="dialog" aria-modal="true" aria-labelledby="payment-capture-title">
        <header className="payment-capture-sheet__header">
          <div><span className="native-eyebrow">Payment review</span><h2 id="payment-capture-title">Make this record accurate</h2><p>Nothing is added to your ledger until you confirm it.</p></div>
          <button type="button" className="payment-capture-sheet__close" aria-label="Close payment review" onClick={onClose} disabled={busy}><Icon name="x" size={19} /></button>
        </header>
        <div className="payment-capture-sheet__provenance">
          <Icon name="smartphone" size={17} />
          <div><strong>{confidenceLabel}</strong><span>Captured locally from {source}; notification text is not uploaded.</span></div>
        </div>
        <form onSubmit={submit} className="payment-capture-form">
          <label className="payment-capture-field payment-capture-field--merchant"><span>Merchant</span><input ref={merchantRef} value={merchant} onChange={event => setMerchant(event.target.value)} autoComplete="off" /></label>
          <label className="payment-capture-field payment-capture-field--amount"><span>Amount ({suggestion?.currency || 'EUR'})</span><input type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label>
          <label className="payment-capture-field"><span>Wallet</span><select value={walletId} onChange={event => setWalletId(event.target.value)} required><option value="">Choose wallet</option>{wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label>
          <label className="payment-capture-field"><span>Category</span><select value={categoryId} onChange={event => setCategoryId(event.target.value)} required><option value="">Choose category</option>{categories.filter(category => category.isIncome !== true).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="payment-capture-field payment-capture-field--wide"><span>Date and time</span><input type="datetime-local" value={occurredAt} onChange={event => setOccurredAt(event.target.value)} required /></label>
          <footer className="payment-capture-sheet__actions">
            <button type="button" className="payment-capture-ignore" onClick={() => onIgnore(suggestion)} disabled={busy}>Ignore</button>
            <button type="submit" className="native-primary-button" disabled={!canConfirm || busy}>{busy ? 'Saving…' : 'Confirm payment'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
