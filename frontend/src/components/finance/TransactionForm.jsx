import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from '../shared/Modal'
import { api } from '../../api'
import CategoryPicker from './CategoryPicker'
import WalletPicker from './WalletPicker'
import Icon from '../icons/Icon'
import CategoryIcon from './CategoryIcon'
import { isNativeMobileApp } from '../../mobilePlatform'

export default function TransactionForm({ transaction, wallets, categories, onClose, onSaved, initialMode = 'expense' }) {
  const isEdit = !!transaction?.id

  const [mode, setMode] = useState(initialMode) // 'expense' | 'income' | 'transfer'

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

  useEffect(() => {
    if (!transaction) {
      setMode(initialMode)
      setForm(f => ({
        ...f,
        isIncome: initialMode === 'income',
      }))
    }
  }, [initialMode, transaction])

  useEffect(() => {
    if (!transaction && wallets?.length) {
      setForm(f => ({
        ...f,
        walletId: f.walletId || wallets[0]?.id || '',
        fromWalletId: f.fromWalletId || wallets[0]?.id || '',
        toWalletId: f.toWalletId || wallets[1]?.id || '',
      }))
    }
  }, [wallets, transaction])

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  function handleModeChange(newMode) {
    setMode(newMode)
    setForm(f => ({
      ...f,
      isIncome: newMode === 'income' ? true : newMode === 'expense' ? false : f.isIncome,
      categoryId: newMode === 'transfer' ? '' : f.categoryId,
    }))
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
  const visibleCategories = useMemo(
    () => (categories || []).filter(c => {
      if (mode === 'transfer') return false
      if (c.isIncome === form.isIncome) return true
      if (c.parentCategoryId) {
        const parent = (categories || []).find(p => p.id === c.parentCategoryId)
        return parent?.isIncome === form.isIncome
      }
      return false
    }),
    [categories, form.isIncome, mode]
  )
  const selectedCategory = useMemo(
    () => visibleCategories.find(c => c.id === form.categoryId),
    [visibleCategories, form.categoryId]
  )

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
      const resolvedName = form.name.trim() || selectedCategory?.name || (mode === 'transfer' ? 'Transfer' : mode === 'income' ? 'Income' : 'Expense')
      if (mode === 'transfer' && !isEdit) {
        const payload = {
          name: resolvedName,
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
          name: resolvedName,
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

  if (isNativeMobileApp()) {
    return (
      <NativeTransactionForm
        isEdit={isEdit}
        isTransfer={isTransfer}
        mode={mode}
        form={form}
        wallets={wallets || []}
        categories={visibleCategories}
        selectedCategory={selectedCategory}
        fromWallet={fromWallet}
        toWallet={toWallet}
        sameCurrency={sameCurrency}
        saving={saving}
        error={error}
        showDeleteConfirm={showDeleteConfirm}
        onClose={onClose}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        onShowDeleteConfirm={setShowDeleteConfirm}
        onModeChange={handleModeChange}
        setField={setField}
      />
    )
  }

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
                categories={(categories || []).filter(c => {
                  if (c.isIncome === form.isIncome) return true
                  // Include subcategories whose parent has the matching isIncome
                  if (c.parentCategoryId) {
                    const parent = (categories || []).find(p => p.id === c.parentCategoryId)
                    return parent?.isIncome === form.isIncome
                  }
                  return false
                })}
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

function NativeTransactionForm({
  isEdit,
  isTransfer,
  mode,
  form,
  wallets,
  categories,
  selectedCategory,
  fromWallet,
  toWallet,
  sameCurrency,
  saving,
  error,
  showDeleteConfirm,
  onClose,
  onSubmit,
  onDelete,
  onShowDeleteConfirm,
  onModeChange,
  setField,
}) {
  const [categoryQuery, setCategoryQuery] = useState('')
  const amountLabel = form.amount ? Number(form.amount).toLocaleString('en', { maximumFractionDigits: 2 }) : '0'
  const selectedWallet = wallets.find(w => w.id === form.walletId)
  const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace']
  const modeOptions = [
    { id: 'expense', label: 'Expense', icon: 'arrow-up' },
    { id: 'income', label: 'Income', icon: 'arrow-down' },
    { id: 'transfer', label: 'Transfer', icon: 'arrow-left-right' },
  ]
  const filteredCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase()
    if (!query) return categories
    return categories.filter(category => {
      return [
        category.name,
        category.parent?.name,
        category.parentName,
      ].filter(Boolean).some(value => String(value).toLowerCase().includes(query))
    })
  }, [categories, categoryQuery])

  function appendAmount(token) {
    const current = form.amount || ''
    if (token === 'backspace') {
      setField('amount', current.slice(0, -1))
      return
    }
    if (token === '.' && current.includes('.')) return
    if (current.includes('.') && current.split('.')[1]?.length >= 2) return
    const next = current === '0' && token !== '.' ? token : `${current}${token}`
    setField('amount', next)
  }

  return (
    <div className="native-transaction-overlay" role="presentation">
      <form className="native-transaction-sheet" data-testid="native-transaction-form" onSubmit={onSubmit}>
        <div className="native-transaction-sheet__header">
          <div>
            <span className="native-eyebrow">Money</span>
            <h2>{isEdit ? 'Edit Transaction' : 'Add Transaction'}</h2>
          </div>
          <button type="button" className="native-icon-button" aria-label="Close transaction form" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        {error && <div className="alert-error native-transaction-error">{error}</div>}

        <div className="native-transaction-modes" role="group" aria-label="Transaction type">
          {modeOptions.map(option => (
            <button
              key={option.id}
              type="button"
              className={mode === option.id ? 'is-active' : ''}
              onClick={() => onModeChange(option.id)}
            >
              <Icon name={option.icon} size={15} />
              {option.label}
            </button>
          ))}
        </div>

        <section className={`native-transaction-amount native-transaction-amount--${mode}`}>
          <div className="native-transaction-amount__icon">
            <Icon name={selectedCategory?.iconName || (isTransfer ? 'arrow-left-right' : mode === 'income' ? 'arrow-down' : 'receipt')} size={24} />
          </div>
          <div>
            <span>{selectedCategory?.name || (isTransfer ? 'Transfer' : mode === 'income' ? 'Income' : 'Expense')}</span>
            <strong>{amountLabel}</strong>
          </div>
        </section>

        {!isTransfer && (
          <section className="native-transaction-section">
            <div className="native-section-head">
              <h3>Category</h3>
              <span>{selectedCategory?.name || 'Choose'}</span>
            </div>
            <label className="native-category-search">
              <Icon name="search" size={16} />
              <input
                type="search"
                aria-label="Search categories"
                value={categoryQuery}
                placeholder="Search categories"
                onChange={event => setCategoryQuery(event.target.value)}
              />
            </label>
            <div className="native-category-grid">
              {filteredCategories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  className={form.categoryId === category.id ? 'is-active' : ''}
                  aria-pressed={form.categoryId === category.id ? 'true' : 'false'}
                  onClick={() => setField('categoryId', category.id)}
                >
                  <CategoryIcon category={category} size={40} />
                  <span>{category.name}</span>
                </button>
              ))}
              {filteredCategories.length === 0 && (
                <div className="native-empty-state native-empty-state--compact">No categories match.</div>
              )}
            </div>
          </section>
        )}

        <section className="native-transaction-section">
          <div className="native-section-head">
            <h3>{isTransfer ? 'Wallets' : 'Wallet'}</h3>
            <span>{isTransfer ? `${fromWallet?.name || 'From'} to ${toWallet?.name || 'To'}` : selectedWallet?.name || 'Choose'}</span>
          </div>
          {isTransfer ? (
            <div className="native-wallet-pickers">
              <div>
                <span>From</span>
                <div className="native-chip-row">
                  {wallets.map(wallet => (
                    <button
                      key={wallet.id}
                      type="button"
                      className={form.fromWalletId === wallet.id ? 'is-active' : ''}
                      aria-pressed={form.fromWalletId === wallet.id ? 'true' : 'false'}
                      disabled={form.toWalletId === wallet.id}
                      onClick={() => setField('fromWalletId', wallet.id)}
                    >
                      {wallet.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span>To</span>
                <div className="native-chip-row">
                  {wallets.map(wallet => (
                    <button
                      key={wallet.id}
                      type="button"
                      className={form.toWalletId === wallet.id ? 'is-active' : ''}
                      aria-pressed={form.toWalletId === wallet.id ? 'true' : 'false'}
                      disabled={form.fromWalletId === wallet.id}
                      onClick={() => setField('toWalletId', wallet.id)}
                    >
                      {wallet.name}
                    </button>
                  ))}
                </div>
              </div>
              {!sameCurrency && (
                <label className="native-transaction-field">
                  <span>Amount received</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amountReceived}
                    onChange={event => setField('amountReceived', event.target.value)}
                    placeholder="0.00"
                    required
                  />
                </label>
              )}
            </div>
          ) : (
            <div className="native-chip-row">
              {wallets.map(wallet => (
                <button
                  key={wallet.id}
                  type="button"
                  className={form.walletId === wallet.id ? 'is-active' : ''}
                  aria-pressed={form.walletId === wallet.id ? 'true' : 'false'}
                  onClick={() => setField('walletId', wallet.id)}
                >
                  {wallet.name}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="native-transaction-fields">
          <label className="native-transaction-field">
            <span>Title</span>
            <input
              type="text"
              value={form.name}
              onChange={event => setField('name', event.target.value)}
              placeholder={selectedCategory?.name || 'Optional title'}
            />
          </label>
          <label className="native-transaction-field">
            <span>Date</span>
            <input
              type="date"
              value={form.transactionDate}
              onChange={event => setField('transactionDate', event.target.value)}
              required
            />
          </label>
          <label className="native-transaction-field native-transaction-field--wide">
            <span>Note</span>
            <input
              type="text"
              value={form.note}
              onChange={event => setField('note', event.target.value)}
              placeholder="Optional note"
            />
          </label>
        </section>

        <div className="native-keypad" aria-label="Amount keypad">
          {keypad.map(key => (
            <button
              key={key}
              type="button"
              aria-label={key === 'backspace' ? 'Backspace' : key}
              onClick={() => appendAmount(key)}
            >
              {key === 'backspace' ? <Icon name="delete" size={18} /> : key}
            </button>
          ))}
        </div>

        <div className="native-transaction-actions">
          {isEdit && !showDeleteConfirm && (
            <button type="button" className="native-secondary-button native-secondary-button--danger" onClick={() => onShowDeleteConfirm(true)}>
              Delete
            </button>
          )}
          {isEdit && showDeleteConfirm && (
            <button type="button" className="native-secondary-button native-secondary-button--danger" disabled={saving} onClick={onDelete}>
              Confirm delete
            </button>
          )}
          <button type="button" className="native-secondary-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="native-primary-button" disabled={saving || !form.amount || (isTransfer && (!form.fromWalletId || !form.toWalletId))}>
            {saving ? 'Saving' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
