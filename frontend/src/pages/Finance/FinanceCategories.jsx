import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import { Modal } from '../../components/shared/Modal'
import CategoryIcon from '../../components/finance/CategoryIcon'
import IconPicker from '../../components/finance/IconPicker'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'
import ScrollReveal from '../../components/ScrollReveal'

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

        {/* Type toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="button" className={`btn small ${!form.isIncome ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setField('isIncome', false)}>
            Expense
          </button>
          <button type="button" className={`btn small ${form.isIncome ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setField('isIncome', true)}>
            Income
          </button>
        </div>

        {/* Name */}
        <label className="form-label">Name</label>
        <input className="input" type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Groceries" required style={{ marginBottom: '0.75rem' }} />

        {/* Colour */}
        <label className="form-label">Colour</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <input type="color" value={form.colour} onChange={e => setField('colour', e.target.value)} style={{ width: 40, height: 40, border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'transparent' }} />
          <CategoryIcon category={{ colour: form.colour, iconName: form.iconName }} size={40} />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{form.colour}</span>
        </div>

        {/* Icon */}
        <label className="form-label">Icon</label>
        <div style={{ marginBottom: '0.75rem' }}>
          <IconPicker value={form.iconName} onChange={val => setField('iconName', val)} colour={form.colour} />
        </div>

        {/* Parent Category */}
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

        {/* Actions */}
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

export default function FinanceCategories() {
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <PageHeader icon="layers" title="Categories" subtitle="Manage your transaction categories" />
        <button className="btn btn-primary" onClick={openAdd}>
          <Icon name="plus" size={16} /> Add Category
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Loading...</div>
      ) : (
        <>
          {/* Expense Categories */}
          <ScrollReveal>
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
          </ScrollReveal>

          {/* Income Categories */}
          <ScrollReveal>
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
          </ScrollReveal>
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
    </div>
  )
}
