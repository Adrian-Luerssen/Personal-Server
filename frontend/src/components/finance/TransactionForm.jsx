import React, { useState, useEffect } from 'react'
import { Modal } from '../shared/Modal'
import { api } from '../../api'
import CategoryPicker from './CategoryPicker'
import Icon from '../icons/Icon'

export default function TransactionForm({ transaction, wallets, categories, onClose, onSaved }) {
  const isEdit = !!transaction?.id

  const [form, setForm] = useState({
    name: '',
    amount: '',
    isIncome: false,
    transactionDate: new Date().toISOString().slice(0, 10),
    walletId: '',
    categoryId: '',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (transaction) {
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
      })
    }
  }, [transaction])

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        amount: parseFloat(form.amount),
        isIncome: form.isIncome,
        transactionDate: form.transactionDate,
        walletId: form.walletId || null,
        categoryId: form.categoryId || null,
        note: form.note.trim() || null,
      }
      if (isEdit) {
        await api.patch(`/finance/transactions/${transaction.id}`, payload)
      } else {
        await api.post('/finance/transactions', payload)
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

  return (
    <Modal title={isEdit ? 'Edit Transaction' : 'Add Transaction'} onClose={onClose} size="medium">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Income/Expense Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className={`btn small ${!form.isIncome ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setField('isIncome', false)}
          >
            <Icon name="arrow-up" size={14} /> Expense
          </button>
          <button
            type="button"
            className={`btn small ${form.isIncome ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setField('isIncome', true)}
          >
            <Icon name="arrow-down" size={14} /> Income
          </button>
        </div>

        {/* Name */}
        <label className="form-label">Description</label>
        <input
          className="input"
          type="text"
          value={form.name}
          onChange={e => setField('name', e.target.value)}
          placeholder="e.g. Grocery shopping"
          required
          style={{ marginBottom: '0.75rem' }}
        />

        {/* Amount */}
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

        {/* Wallet */}
        <label className="form-label">Wallet</label>
        <select
          className="input"
          value={form.walletId}
          onChange={e => setField('walletId', e.target.value)}
          style={{ marginBottom: '0.75rem' }}
        >
          <option value="">Select wallet...</option>
          {(wallets || []).map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        {/* Category */}
        <label className="form-label">Category</label>
        <div style={{ marginBottom: '0.75rem' }}>
          <CategoryPicker
            categories={(categories || []).filter(c => c.isIncome === form.isIncome)}
            value={form.categoryId}
            onChange={val => setField('categoryId', val)}
          />
        </div>

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
