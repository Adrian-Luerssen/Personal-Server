import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../api'
import { SkeletonCard } from '../../components/shared'
import { Modal } from '../../components/shared/Modal'
import CategoryIcon from '../../components/finance/CategoryIcon'
import CategoryPicker from '../../components/finance/CategoryPicker'
import WalletPicker from '../../components/finance/WalletPicker'
import IconPicker from '../../components/finance/IconPicker'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'

const FINANCE_COLOR = '#fbbf24'

function formatCurrency(amount, currency = '€') {
  const formatted = Math.abs(amount).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${amount < 0 ? '-' : ''}${currency}${formatted}`
}

const TABS = [
  { key: 'wallets', label: 'Wallets', icon: 'landmark' },
  { key: 'categories', label: 'Categories', icon: 'layers' },
  { key: 'subscriptions', label: 'Subscriptions', icon: 'repeat' },
  { key: 'budgets', label: 'Budgets', icon: 'piggy-bank' },
]

// ─── Wallet Form Modal ──────────────────────────────────────────────────────

function WalletForm({ wallet, onClose, onSaved }) {
  const isEdit = !!wallet?.id
  const [form, setForm] = useState({
    name: '',
    iconName: 'wallet',
    colour: FINANCE_COLOR,
    currency: 'EUR',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (wallet) {
      setForm({
        name: wallet.name || '',
        iconName: wallet.iconName || 'wallet',
        colour: wallet.colour || FINANCE_COLOR,
        currency: wallet.currency || 'EUR',
      })
    }
  }, [wallet])

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), iconName: form.iconName, colour: form.colour, currency: form.currency }
      if (isEdit) {
        await api.patch(`/finance/wallets/${wallet.id}`, payload)
      } else {
        await api.post('/finance/wallets', payload)
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
      await api.delete(`/finance/wallets/${wallet.id}`)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Wallet' : 'Add Wallet'} onClose={onClose} size="medium">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <label className="form-label">Name</label>
        <input className="input" type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Main Account" required style={{ marginBottom: '0.75rem' }} />

        <label className="form-label">Icon</label>
        <div style={{ marginBottom: '0.75rem' }}>
          <IconPicker value={form.iconName} onChange={val => setField('iconName', val)} colour={form.colour} />
        </div>

        <label className="form-label">Color</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <input type="color" value={form.colour} onChange={e => setField('colour', e.target.value)} style={{ width: 40, height: 40, border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'transparent' }} />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{form.colour}</span>
        </div>

        <label className="form-label">Currency</label>
        <input className="input" type="text" value={form.currency} onChange={e => setField('currency', e.target.value)} placeholder="EUR" style={{ marginBottom: '1rem' }} />

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          {isEdit && !showDelete && (
            <button type="button" className="btn small btn-ghost" style={{ color: 'var(--color-danger)', marginRight: 'auto' }} onClick={() => setShowDelete(true)}>
              <Icon name="trash-2" size={14} /> Delete
            </button>
          )}
          {isEdit && showDelete && (
            <div style={{ marginRight: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>Delete?</span>
              <button type="button" className="btn small btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={handleDelete} disabled={saving}>Yes</button>
              <button type="button" className="btn small btn-ghost" onClick={() => setShowDelete(false)}>No</button>
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

// ─── Category Form Modal ────────────────────────────────────────────────────

function CategoryForm({ category, parents, onClose, onSaved }) {
  const isEdit = !!category?.id
  const [form, setForm] = useState({
    name: '',
    iconName: 'circle',
    colour: '#6b7280',
    isIncome: false,
    parentCategoryId: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name || '',
        iconName: category.iconName || 'circle',
        colour: category.colour || '#6b7280',
        isIncome: category.isIncome || false,
        parentCategoryId: category.parentCategoryId || '',
      })
    }
  }, [category])

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        iconName: form.iconName,
        colour: form.colour,
        isIncome: form.isIncome,
        parentCategoryId: form.parentCategoryId || null,
      }
      if (isEdit) {
        await api.patch(`/finance/categories/${category.id}`, payload)
      } else {
        await api.post('/finance/categories', payload)
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
      await api.delete(`/finance/categories/${category.id}`)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Category' : 'Add Category'} onClose={onClose} size="medium">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="button" className={`btn small ${!form.isIncome ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setField('isIncome', false)}>
            Expense
          </button>
          <button type="button" className={`btn small ${form.isIncome ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setField('isIncome', true)}>
            Income
          </button>
        </div>

        <label className="form-label">Name</label>
        <input className="input" type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Groceries" required style={{ marginBottom: '0.75rem' }} />

        <label className="form-label">Colour</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <input type="color" value={form.colour} onChange={e => setField('colour', e.target.value)} style={{ width: 40, height: 40, border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'transparent' }} />
          <CategoryIcon category={{ colour: form.colour, iconName: form.iconName }} size={40} />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{form.colour}</span>
        </div>

        <label className="form-label">Icon</label>
        <div style={{ marginBottom: '0.75rem' }}>
          <IconPicker value={form.iconName} onChange={val => setField('iconName', val)} colour={form.colour} />
        </div>

        {!isEdit || !category?.subcategories?.length ? (
          <>
            <label className="form-label">Parent Category (optional)</label>
            <select className="input" value={form.parentCategoryId} onChange={e => setField('parentCategoryId', e.target.value)} style={{ marginBottom: '1rem' }}>
              <option value="">None (top-level)</option>
              {parents.filter(p => p.id !== category?.id).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </>
        ) : null}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          {isEdit && !showDelete && (
            <button type="button" className="btn small btn-ghost" style={{ color: 'var(--color-danger)', marginRight: 'auto' }} onClick={() => setShowDelete(true)}>
              <Icon name="trash-2" size={14} /> Delete
            </button>
          )}
          {isEdit && showDelete && (
            <div style={{ marginRight: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>Delete?</span>
              <button type="button" className="btn small btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={handleDelete} disabled={saving}>Yes</button>
              <button type="button" className="btn small btn-ghost" onClick={() => setShowDelete(false)}>No</button>
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

// ─── Subscription Form Modal ────────────────────────────────────────────────

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function SubscriptionForm({ subscription, wallets, categories, onClose, onSaved }) {
  const isEdit = !!subscription?.id
  const [form, setForm] = useState({
    name: '',
    isIncome: false,
    amount: '',
    frequency: 'monthly',
    billingDay: 1,
    billingMonth: 1,
    walletId: '',
    categoryId: '',
    note: '',
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (subscription) {
      setForm({
        name: subscription.name || '',
        isIncome: subscription.isIncome || false,
        amount: subscription.amount || '',
        frequency: subscription.frequency || 'monthly',
        billingDay: subscription.billingDay || 1,
        billingMonth: subscription.billingMonth || 1,
        walletId: subscription.walletId || '',
        categoryId: subscription.categoryId || '',
        note: subscription.note || '',
        isActive: subscription.isActive !== false,
      })
    }
  }, [subscription])

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const filteredCategories = (categories || []).filter(c => c.isIncome === form.isIncome)

  const billingDayLabel = form.frequency === 'weekly' ? 'Day of week (1-7)' : 'Day of month (1-31)'

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        isIncome: form.isIncome,
        amount: parseFloat(form.amount),
        frequency: form.frequency,
        billingDay: parseInt(form.billingDay),
        billingMonth: form.frequency === 'yearly' ? parseInt(form.billingMonth) : undefined,
        walletId: form.walletId || null,
        categoryId: form.categoryId || null,
        note: form.note.trim() || null,
        isActive: form.isActive,
      }
      if (isEdit) {
        await api.patch(`/finance/subscriptions/${subscription.id}`, payload)
      } else {
        await api.post('/finance/subscriptions', payload)
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
      await api.delete(`/finance/subscriptions/${subscription.id}`)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Subscription' : 'Add Subscription'} onClose={onClose} size="medium">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="button" className={`btn small ${!form.isIncome ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setField('isIncome', false)}>
            Expense
          </button>
          <button type="button" className={`btn small ${form.isIncome ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setField('isIncome', true)}>
            Income
          </button>
        </div>

        <label className="form-label">Name</label>
        <input className="input" type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Netflix" required style={{ marginBottom: '0.75rem' }} />

        <label className="form-label">Amount</label>
        <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="0.00" required style={{ marginBottom: '0.75rem' }} />

        <label className="form-label">Frequency</label>
        <select className="input" value={form.frequency} onChange={e => setField('frequency', e.target.value)} style={{ marginBottom: '0.75rem' }}>
          {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <label className="form-label">{billingDayLabel}</label>
        <input className="input" type="number" min="1" max={form.frequency === 'weekly' ? 7 : 31} value={form.billingDay} onChange={e => setField('billingDay', e.target.value)} style={{ marginBottom: '0.75rem' }} />

        {form.frequency === 'yearly' && (
          <>
            <label className="form-label">Billing Month</label>
            <select className="input" value={form.billingMonth} onChange={e => setField('billingMonth', e.target.value)} style={{ marginBottom: '0.75rem' }}>
              {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </>
        )}

        <label className="form-label">Wallet</label>
        <div style={{ marginBottom: '0.75rem' }}>
          <WalletPicker
            wallets={wallets}
            value={form.walletId}
            onChange={val => setField('walletId', val)}
            placeholder="Select wallet..."
          />
        </div>

        <label className="form-label">Category</label>
        <div style={{ marginBottom: '0.75rem' }}>
          <CategoryPicker categories={filteredCategories} value={form.categoryId} onChange={val => setField('categoryId', val)} />
        </div>

        <label className="form-label">Note (optional)</label>
        <textarea className="input" value={form.note} onChange={e => setField('note', e.target.value)} placeholder="Optional note..." rows={2} style={{ marginBottom: '0.75rem', resize: 'vertical' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <input type="checkbox" id="sub-active" checked={form.isActive} onChange={e => setField('isActive', e.target.checked)} />
          <label htmlFor="sub-active" style={{ fontSize: '0.9rem' }}>Active</label>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          {isEdit && !showDelete && (
            <button type="button" className="btn small btn-ghost" style={{ color: 'var(--color-danger)', marginRight: 'auto' }} onClick={() => setShowDelete(true)}>
              <Icon name="trash-2" size={14} /> Delete
            </button>
          )}
          {isEdit && showDelete && (
            <div style={{ marginRight: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>Delete?</span>
              <button type="button" className="btn small btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={handleDelete} disabled={saving}>Yes</button>
              <button type="button" className="btn small btn-ghost" onClick={() => setShowDelete(false)}>No</button>
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

// ─── Wallets Tab ────────────────────────────────────────────────────────────

function WalletsTab() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [wallets, setWallets] = useState([])
  const [editWallet, setEditWallet] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/finance/wallets')
      setWallets(data || [])
    } catch (e) {
      console.error('Failed to load wallets:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0)

  function openAdd() {
    setEditWallet(null)
    setShowForm(true)
  }

  function openEdit(wallet) {
    setEditWallet(wallet)
    setShowForm(true)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={openAdd}>
          <Icon name="plus" size={16} /> Add Wallet
        </button>
      </div>

      {/* Total Balance Card */}
      <div className="card" style={{
        padding: '1.5rem',
        marginBottom: '1.5rem',
        background: `linear-gradient(135deg, ${FINANCE_COLOR}22, ${FINANCE_COLOR}08)`,
        border: `1px solid ${FINANCE_COLOR}40`,
      }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
          {t('finance.totalBalance')}
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: FINANCE_COLOR }}>
          {formatCurrency(totalBalance)}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          {t('finance.across')} {wallets.length} {wallets.length !== 1 ? t('finance.walletsCountPlural') : t('finance.walletsCount')}
        </div>
      </div>

      {/* Wallets Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={3} />)}
        </div>
      ) : wallets.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Icon name="wallet" size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' }} />
          <div style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            {t('finance.noWallets')}
          </div>
          <button className="btn" onClick={() => navigate('/settings?section=data')}>
            <Icon name="database" size={18} /> Settings and Data
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {wallets.map(wallet => (
            <div
              key={wallet.id}
              className="card"
              style={{ padding: '1.25rem', cursor: 'pointer' }}
              onClick={() => openEdit(wallet)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 48, height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: `${wallet.colour || FINANCE_COLOR}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={wallet.iconName || 'wallet'} size={24} style={{ color: wallet.colour || FINANCE_COLOR }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{wallet.name}</div>
                  {wallet.currency && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{wallet.currency}</div>
                  )}
                </div>
              </div>
              <div style={{
                fontSize: '1.5rem', fontWeight: 800,
                color: wallet.balance >= 0 ? 'var(--color-success)' : 'var(--color-error)',
              }}>
                {formatCurrency(wallet.balance || 0)}
              </div>
              {wallet.transactionCount > 0 && (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                  {wallet.transactionCount} {wallet.transactionCount !== 1 ? t('finance.transactionsCountPlural') : t('finance.transactionsCount')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <WalletForm
          wallet={editWallet}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}
    </>
  )
}

// ─── Categories Tab ─────────────────────────────────────────────────────────

function CategoriesTab() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editCategory, setEditCategory] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.get('/finance/categories')
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load categories', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const parents = categories.filter(c => !c.parentCategoryId)
  const childrenOf = (parentId) => categories.filter(c => c.parentCategoryId === parentId)

  function openEdit(cat) {
    const children = childrenOf(cat.id)
    setEditCategory({ ...cat, subcategories: children })
    setShowForm(true)
  }

  function openAdd() {
    setEditCategory(null)
    setShowForm(true)
  }

  const expenseParents = parents.filter(c => !c.isIncome)
  const incomeParents = parents.filter(c => c.isIncome)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={openAdd}>
          <Icon name="plus" size={16} /> Add Category
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Loading...</div>
      ) : (
        <>
          {/* Expense Categories */}
          <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Expense Categories ({expenseParents.length})
          </h3>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            {expenseParents.length === 0 && (
              <div style={{ padding: '1rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>No expense categories yet</div>
            )}
            {expenseParents.map(parent => {
              const children = childrenOf(parent.id)
              return (
                <div key={parent.id}>
                  <div className="category-tree-item" onClick={() => openEdit(parent)}>
                    <CategoryIcon category={parent} size={36} />
                    <span className="category-name">{parent.name}</span>
                    {children.length > 0 && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{children.length} sub</span>
                    )}
                    <Icon name="chevron-right" size={16} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                  {children.length > 0 && (
                    <div className="category-tree-children">
                      {children.map(child => (
                        <div key={child.id} className="category-tree-item" onClick={() => openEdit(child)}>
                          <CategoryIcon category={{ ...child, colour: child.colour || parent.colour, iconName: child.iconName || parent.iconName }} size={28} />
                          <span className="category-name">{child.name}</span>
                          <Icon name="chevron-right" size={14} style={{ color: 'var(--color-text-muted)' }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Income Categories */}
          <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Income Categories ({incomeParents.length})
          </h3>
          <div className="card">
            {incomeParents.length === 0 && (
              <div style={{ padding: '1rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>No income categories yet</div>
            )}
            {incomeParents.map(parent => {
              const children = childrenOf(parent.id)
              return (
                <div key={parent.id}>
                  <div className="category-tree-item" onClick={() => openEdit(parent)}>
                    <CategoryIcon category={parent} size={36} />
                    <span className="category-name">{parent.name}</span>
                    {children.length > 0 && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{children.length} sub</span>
                    )}
                    <Icon name="chevron-right" size={16} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                  {children.length > 0 && (
                    <div className="category-tree-children">
                      {children.map(child => (
                        <div key={child.id} className="category-tree-item" onClick={() => openEdit(child)}>
                          <CategoryIcon category={{ ...child, colour: child.colour || parent.colour, iconName: child.iconName || parent.iconName }} size={28} />
                          <span className="category-name">{child.name}</span>
                          <Icon name="chevron-right" size={14} style={{ color: 'var(--color-text-muted)' }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {showForm && (
        <CategoryForm
          category={editCategory}
          parents={parents}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}
    </>
  )
}

// ─── Subscriptions Tab ──────────────────────────────────────────────────────

function computeMonthlyAmount(sub) {
  const amount = Math.abs(sub.amount || 0)
  switch (sub.frequency) {
    case 'weekly': return amount * (52 / 12)
    case 'yearly': return amount / 12
    default: return amount
  }
}

function computeNextBilling(sub) {
  const now = new Date()
  const day = sub.billingDay || 1

  if (sub.frequency === 'weekly') {
    const currentDay = now.getDay() || 7 // 1=Mon..7=Sun
    let diff = day - currentDay
    if (diff <= 0) diff += 7
    const next = new Date(now)
    next.setDate(next.getDate() + diff)
    return next
  }

  if (sub.frequency === 'yearly') {
    const month = (sub.billingMonth || 1) - 1
    let next = new Date(now.getFullYear(), month, day)
    if (next <= now) next = new Date(now.getFullYear() + 1, month, day)
    return next
  }

  // monthly
  let next = new Date(now.getFullYear(), now.getMonth(), day)
  if (next <= now) next = new Date(now.getFullYear(), now.getMonth() + 1, day)
  return next
}

function formatDateShort(d) {
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState([])
  const [wallets, setWallets] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editSub, setEditSub] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [subsData, walletsData, catsData] = await Promise.all([
        api.get('/finance/subscriptions'),
        api.get('/finance/wallets'),
        api.get('/finance/categories'),
      ])
      setSubscriptions(Array.isArray(subsData) ? subsData : subsData?.items || [])
      setWallets(walletsData || [])
      setCategories(catsData || [])
    } catch (err) {
      console.error('Failed to load subscriptions', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditSub(null)
    setShowForm(true)
  }

  function openEdit(sub) {
    setEditSub(sub)
    setShowForm(true)
  }

  const activeCount = subscriptions.filter(s => s.isActive !== false).length
  const monthlyTotal = subscriptions
    .filter(s => s.isActive !== false && !s.isIncome)
    .reduce((sum, s) => sum + computeMonthlyAmount(s), 0)

  const walletMap = Object.fromEntries((wallets || []).map(w => [w.id, w]))

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={openAdd}>
          <Icon name="plus" size={16} /> Add Subscription
        </button>
      </div>

      {/* Summary */}
      <div className="card" style={{
        padding: '1.25rem',
        marginBottom: '1.5rem',
        background: `linear-gradient(135deg, ${FINANCE_COLOR}22, ${FINANCE_COLOR}08)`,
        border: `1px solid ${FINANCE_COLOR}40`,
      }}>
        <div style={{ fontSize: '1rem', color: 'var(--color-text-secondary)' }}>
          {activeCount} active &middot; {formatCurrency(monthlyTotal)}/month
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
          <Icon name="repeat" size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' }} />
          <div style={{ color: 'var(--color-text-secondary)' }}>No subscriptions yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {subscriptions.map(sub => {
            const wallet = walletMap[sub.walletId]
            const nextBilling = computeNextBilling(sub)
            const isPaused = sub.isActive === false

            return (
              <div
                key={sub.id}
                className="card"
                style={{
                  padding: '1rem 1.25rem',
                  cursor: 'pointer',
                  opacity: isPaused ? 0.6 : 1,
                }}
                onClick={() => openEdit(sub)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {/* Category icon */}
                  {sub.category ? (
                    <CategoryIcon category={sub.category} size={36} />
                  ) : (
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-md)',
                      background: `${FINANCE_COLOR}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="repeat" size={18} style={{ color: FINANCE_COLOR }} />
                    </div>
                  )}

                  {/* Name & details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{sub.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      {wallet && <span>{wallet.name}</span>}
                      <span>Next: {formatDateShort(nextBilling)}</span>
                    </div>
                  </div>

                  {/* Amount & badges */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontWeight: 700, fontSize: '1.1rem',
                      color: sub.isIncome ? 'var(--color-success)' : 'var(--color-error)',
                    }}>
                      {sub.isIncome ? '+' : '-'}{formatCurrency(Math.abs(sub.amount || 0))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                      <span style={{
                        fontSize: '0.7rem', padding: '0.15rem 0.5rem',
                        borderRadius: '999px', background: 'var(--color-bg-elevated)',
                        color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'capitalize',
                      }}>
                        {sub.frequency}
                      </span>
                      <span style={{
                        fontSize: '0.7rem', padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        background: isPaused ? 'var(--color-error)22' : 'var(--color-success)22',
                        color: isPaused ? 'var(--color-error)' : 'var(--color-success)',
                        fontWeight: 600,
                      }}>
                        {isPaused ? 'Paused' : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <SubscriptionForm
          subscription={editSub}
          wallets={wallets}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}
    </>
  )
}

// ─── Budget Form Modal ──────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
]

function BudgetForm({ categories, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount: '',
    period: 'monthly',
    categoryId: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = {
        amount: parseFloat(form.amount),
        period: form.period,
        categoryId: form.categoryId || undefined,
      }
      await api.post('/finance/budgets', payload)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create budget')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Add Budget" onClose={onClose} size="medium">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <label className="form-label">Amount</label>
        <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="0.00" required style={{ marginBottom: '0.75rem' }} />

        <label className="form-label">Period</label>
        <select className="input" value={form.period} onChange={e => setField('period', e.target.value)} style={{ marginBottom: '0.75rem' }}>
          {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <label className="form-label">Category (optional)</label>
        <div style={{ marginBottom: '1rem' }}>
          <CategoryPicker categories={categories} value={form.categoryId} onChange={val => setField('categoryId', val)} placeholder="All categories (overall budget)" />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn small btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn small btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Budgets Tab ────────────────────────────────────────────────────────────

function BudgetsTab() {
  const [budgetStatus, setBudgetStatus] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [statusData, catsData] = await Promise.all([
        api.get('/finance/budgets/status'),
        api.get('/finance/categories'),
      ])
      setBudgetStatus(Array.isArray(statusData) ? statusData : statusData?.items || [])
      setCategories(Array.isArray(catsData) ? catsData : [])
    } catch (err) {
      console.error('Failed to load budgets', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    setDeletingId(id)
    try {
      await api.delete(`/finance/budgets/${id}`)
      setConfirmDeleteId(null)
      load()
    } catch (err) {
      console.error('Failed to delete budget', err)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Icon name="plus" size={16} /> Add Budget
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : budgetStatus.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Icon name="piggy-bank" size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' }} />
          <div style={{ color: 'var(--color-text-secondary)' }}>No budgets yet. Create one to start tracking your spending.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {budgetStatus.map(budget => {
            const spent = budget.spent || 0
            const amount = budget.amount || 0
            const remaining = budget.remaining != null ? budget.remaining : amount - spent
            const progress = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0
            const isOver = spent > amount
            const progressColor = isOver ? 'var(--color-error)' : progress > 80 ? '#f59e0b' : 'var(--color-success)'
            const categoryName = budget.category?.name || budget.categoryName || null

            return (
              <div key={budget.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {budget.category ? (
                    <CategoryIcon category={budget.category} size={36} />
                  ) : (
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-md)',
                      background: `${FINANCE_COLOR}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="piggy-bank" size={18} style={{ color: FINANCE_COLOR }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {categoryName || 'Overall Budget'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                      {budget.period}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: isOver ? 'var(--color-error)' : 'var(--color-text-primary)' }}>
                      {formatCurrency(spent)} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>/ {formatCurrency(amount)}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: isOver ? 'var(--color-error)' : 'var(--color-success)', fontWeight: 600 }}>
                      {isOver ? `${formatCurrency(Math.abs(remaining))} over` : `${formatCurrency(remaining)} left`}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{
                  height: 6, borderRadius: 3,
                  background: 'var(--color-bg-elevated)',
                  overflow: 'hidden',
                  marginBottom: '0.5rem',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(progress, 100)}%`,
                    background: progressColor,
                    borderRadius: 3,
                    transition: 'width 0.3s ease',
                  }} />
                </div>

                {/* Delete */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                  {confirmDeleteId === budget.id ? (
                    <>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>Delete?</span>
                      <button className="btn small btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(budget.id)} disabled={deletingId === budget.id}>
                        Yes
                      </button>
                      <button className="btn small btn-ghost" onClick={() => setConfirmDeleteId(null)}>No</button>
                    </>
                  ) : (
                    <button className="btn small btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => setConfirmDeleteId(budget.id)}>
                      <Icon name="trash-2" size={14} /> Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <BudgetForm
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}
    </>
  )
}

// ─── Main Settings Page ─────────────────────────────────────────────────────

export default function FinanceSettings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'wallets'

  function setTab(tab) {
    setSearchParams({ tab })
  }

  return (
    <>
      <PageHeader icon="settings" title="Finance Settings" accentColor={FINANCE_COLOR} />

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--glass-border)',
        marginBottom: '1.5rem',
        gap: '0.5rem',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? `2px solid ${FINANCE_COLOR}` : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              fontWeight: activeTab === tab.key ? 700 : 400,
              cursor: 'pointer',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            <Icon name={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'wallets' && <WalletsTab />}
      {activeTab === 'categories' && <CategoriesTab />}
      {activeTab === 'subscriptions' && <SubscriptionsTab />}
      {activeTab === 'budgets' && <BudgetsTab />}
    </>
  )
}
