import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from '../shared/Modal'
import { api } from '../../api'
import CategoryPicker from './CategoryPicker'
import WalletPicker from './WalletPicker'
import Icon from '../icons/Icon'

export default function TransactionForm({ transaction, wallets, categories, onClose, onSaved }) {
  const isEdit = !!transaction?.id

  const [mode, setMode] = useState('expense') // 'expense' | 'income' | 'transfer'

  const [form, setForm] = useState({
    name: '',
    amount: '',
    isIncome: false,
    transactionDate: new Date().toISOString().slice(0, 10),
    walletId: '',
    categoryId: '',
    note: '',
    // Transfer-specific fields
    fromWalletId: '',
    toWalletId: '',
    amountReceived: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (transaction) {
      const isTransfer = transaction.type === 1 || transaction.type === 3

      if (isTransfer) {
        setMode('transfer')
        const walletId = transaction.wallet?.id || transaction.walletId || ''
        setForm({
          name: transaction.name || '',
          amount: transaction.amount?.toString() || '',
          isIncome: transaction.isIncome || false,
          transactionDate: transaction.transactionDate
            ? new Date(transaction.transactionDate).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          walletId: walletId,
          categoryId: transaction.category?.id || transaction.categoryId || '',
          note: transaction.note || '',
          fromWalletId: transaction.isIncome ? '' : walletId,
          toWalletId: transaction.isIncome ? walletId : '',
          amountReceived: transaction.amount?.toString() || '',
        })
      } else {
        setMode(transaction.isIncome ? 'income' : 'expense')
        setForm({
          name: transaction.name || '',
          amount: transaction.amount?.toString() || '',
          isIncome: transaction.isIncome || false,
          transactionDate: transaction.transactionDate
            ? new Date(transaction.transactionDate).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          walletId: transaction.wallet?.id || transaction.walletId || '',
          categoryId: transaction.category?.id || transaction.categoryId || '',
          note: transaction.note || '',
          fromWalletId: '',
          toWalletId: '',
          amountReceived: '',
        })
      }
    }
  }, [transaction])

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  function handleModeChange(newMode) {
    setMode(newMode)
    if (newMode === 'expense') {
      setField('isIncome', false)
    } else if (newMode === 'income') {
      setField('isIncome', true)
    }
  }

  // Determine currencies for transfer wallets
  const fromWallet = useMemo(
    () => (wallets || []).find(w => w.id === form.fromWalletId),
    [wallets, form.fromWalletId]
  )
  const toWallet = useMemo(
    () => (wallets || []).find(w => w.id === form.toWalletId),
    [wallets, form.toWalletId]
  )
  const sameCurrency = fromWallet && toWallet && fromWallet.currency === toWallet.currency

  // Auto-sync amountReceived when same currency
  useEffect(() => {
    if (mode === 'transfer' && sameCurrency) {
      setForm(f => ({ ...f, amountReceived: f.amount }))
    }
  }, [form.amount, sameCurrency, mode])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (mode === 'transfer' && !isEdit) {
        const payload = {
          name: form.name.trim(),
          fromWalletId: form.fromWalletId || null,
          toWalletId: form.toWalletId || null,
          amountSent: parseFloat(form.amount),
          amountReceived: parseFloat(form.amountReceived),
          transactionDate: form.transactionDate,
          note: form.note.trim() || null,
        }
        await api.post('/finance/transactions/transfer', payload)
      } else {
        const payload = {
          name: form.name.trim(),
          amount: parseFloat(form.amount),
          isIncome: mode === 'income' ? true : mode === 'expense' ? false : form.isIncome,
          transactionDate: form.transactionDate,
          walletId: form.walletId || null,
          categoryId: mode === 'transfer' ? null : (form.categoryId || null),
          note: form.note.trim() || null,
        }
        if (isEdit) {
          await api.patch(`/finance/transactions/${transaction.id}`, payload)
        } else {
          await api.post('/finance/transactions', payload)
        }
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await api.delete(`/finance/transactions/${transaction.id}`)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  const isTransfer = mode === 'transfer'

  return (
    <Modal title={isEdit ? 'Edit Transaction' : 'Add Transaction'} onClose={onClose} size="medium">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Mode Toggle: Expense / Income / Transfer */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className={`btn small ${mode === 'expense' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleModeChange('expense')}
          >
            <Icon name="arrow-up" size={14} /> Expense
          </button>
          <button
            type="button"
            className={`btn small ${mode === 'income' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleModeChange('income')}
          >
            <Icon name="arrow-down" size={14} /> Income
          </button>
          <button
            type="button"
            className={`btn small ${mode === 'transfer' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleModeChange('transfer')}
            style={mode === 'transfer' ? { background: '#60a5fa', borderColor: '#60a5fa' } : {}}
          >
            <Icon name="arrow-left-right" size={14} /> Transfer
          </button>
        </div>

        {/* Name */}
        <label className="form-label">Description</label>
        <input
          className="input"
          type="text"
          value={form.name}
          onChange={e => setField('name', e.target.value)}
          placeholder={isTransfer ? 'e.g. Move to savings' : 'e.g. Grocery shopping'}
          required
          style={{ marginBottom: '0.75rem' }}
        />

        {/* Amount fields */}
        {isTransfer ? (
          <>
            <label className="form-label">
              Amount Sent {fromWallet ? `(${fromWallet.currency || '€'})` : ''}
            </label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={e => setField('amount', e.target.value)}
              placeholder="0.00"
              required
              style={{ marginBottom: '0.75rem' }}
            />

            <label className="form-label">
              Amount Received {toWallet ? `(${toWallet.currency || '€'})` : ''}
            </label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              value={form.amountReceived}
              onChange={e => setField('amountReceived', e.target.value)}
              placeholder="0.00"
              required
              readOnly={!!sameCurrency}
              style={{
                marginBottom: '0.75rem',
                ...(sameCurrency ? { opacity: 0.7, cursor: 'not-allowed' } : {}),
              }}
            />
          </>
        ) : (
          <>
            <label className="form-label">Amount</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={e => setField('amount', e.target.value)}
              placeholder="0.00"
              required
              style={{ marginBottom: '0.75rem' }}
            />
          </>
        )}

        {/* Date */}
        <label className="form-label">Date</label>
        <input
          className="input"
          type="date"
          value={form.transactionDate}
          onChange={e => setField('transactionDate', e.target.value)}
          required
          style={{ marginBottom: '0.75rem' }}
        />

        {/* Wallet(s) */}
        {isTransfer ? (
          <>
            <label className="form-label">From Wallet</label>
            <div style={{ marginBottom: '0.75rem' }}>
              <WalletPicker
                wallets={wallets}
                value={form.fromWalletId}
                onChange={val => setField('fromWalletId', val)}
                placeholder="Select source wallet..."
                required
              />
            </div>

            <label className="form-label">To Wallet</label>
            <div style={{ marginBottom: '0.75rem' }}>
              <WalletPicker
                wallets={wallets}
                value={form.toWalletId}
                onChange={val => setField('toWalletId', val)}
                placeholder="Select destination wallet..."
                exclude={form.fromWalletId}
                required
              />
            </div>

            {!isEdit && (
              <div style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                background: 'var(--color-bg-elevated)',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}>
                <Icon name="info" size={14} />
                Creates 2 linked transactions
              </div>
            )}
          </>
        ) : (
          <>
            <label className="form-label">Wallet</label>
            <div style={{ marginBottom: '0.75rem' }}>
              <WalletPicker
                wallets={wallets}
                value={form.walletId}
                onChange={val => setField('walletId', val)}
                placeholder="Select wallet..."
              />
            </div>
          </>
        )}

        {/* Category — hidden for transfers */}
        {!isTransfer && (
          <>
            <label className="form-label">Category</label>
            <div style={{ marginBottom: '0.75rem' }}>
              <CategoryPicker
                categories={(categories || []).filter(c => c.isIncome === form.isIncome)}
                value={form.categoryId}
                onChange={val => setField('categoryId', val)}
              />
            </div>
          </>
        )}

        {/* Note */}
        <label className="form-label">Note</label>
        <textarea
          className="input"
          value={form.note}
          onChange={e => setField('note', e.target.value)}
          placeholder="Optional note..."
          rows={2}
          style={{ marginBottom: '1rem', resize: 'vertical' }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          {isEdit && !showDeleteConfirm && (
            <button
              type="button"
              className="btn small btn-ghost"
              style={{ color: 'var(--color-danger)', marginRight: 'auto' }}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Icon name="trash-2" size={14} /> Delete
            </button>
          )}
          {isEdit && showDeleteConfirm && (
            <div style={{ marginRight: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>Delete?</span>
              <button type="button" className="btn small btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={handleDelete} disabled={saving}>
                Yes
              </button>
              <button type="button" className="btn small btn-ghost" onClick={() => setShowDeleteConfirm(false)}>
                No
              </button>
            </div>
          )}
          <button type="button" className="btn small btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn small btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
