import React, { useEffect, useState } from 'react'
import { api, queueApiMutation } from '../../api'
import {
  Modal,
  LoadingLine,
  formatDate,
} from '../../components/shared'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'
import InlineConfirmation from '../../components/record/InlineConfirmation'
import SummaryStrip, { SummaryItem } from '../../components/record/SummaryStrip'

export default function WorkoutBodyweight() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ id: null, date: '', weightKg: '', note: '' })
  const [pendingDelete, setPendingDelete] = useState(null)

  useEffect(() => { loadEntries() }, [])

  async function loadEntries() {
    setLoading(true); setError('')
    try { setEntries(await api.get('/workout/bodyweight') || []) }
    catch (e) { setError(e.message || 'Failed to load bodyweight entries') }
    finally { setLoading(false) }
  }

  function openModal(entry = null) {
    if (entry) { setForm({ id: entry.id, date: entry.date, weightKg: entry.weightKg, note: entry.note || '' }) }
    else { setForm({ id: null, date: new Date().toISOString().split('T')[0], weightKg: '', note: '' }) }
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setForm({ id: null, date: '', weightKg: '', note: '' }) }

  function saveEntry() {
    if (!form.date || !form.weightKg) { setError('Date and weight are required'); return }
    setError('')
    const payload = { date: form.date, weightKg: Number(form.weightKg), note: form.note.trim() || null }
    const optimistic = { ...payload, id: form.id || `pending-${Date.now()}`, pendingSync: true }
    const updateEntries = (items = []) => {
      const existing = items.find(entry => entry.id === form.id || entry.date === optimistic.date)
      return (existing
        ? items.map(entry => entry.id === existing.id ? { ...entry, ...optimistic } : entry)
        : [optimistic, ...items]
      ).sort((a, b) => b.date.localeCompare(a.date))
    }
    setEntries(updateEntries)
    const mutation = queueApiMutation(form.id ? `/workout/bodyweight/${form.id}` : '/workout/bodyweight', {
      method: 'POST',
      body: payload,
      prefixes: ['/workout', '/dashboard'],
      dedupeKey: form.id ? `bodyweight:${form.id}` : null,
      optimisticUpdates: [{ path: '/workout/bodyweight', updater: updateEntries }],
    })
    mutation.committed.then(created => {
      setEntries(items => items.map(entry => entry.id === optimistic.id ? created : entry))
    }).catch(() => {})
    closeModal()
  }

  // BUG FIX B3: use api.delete instead of api.post with { method: 'DELETE' }
  function deleteEntry(entry) {
    setError('')
    setEntries(current => current.filter(item => item.id !== entry.id))
    queueApiMutation(`/workout/bodyweight/${entry.id}`, {
      method: 'DELETE',
      prefixes: ['/workout', '/dashboard'],
      optimisticUpdates: [{
        path: '/workout/bodyweight',
        updater: items => (items || []).filter(item => item.id !== entry.id),
      }],
    })
    setPendingDelete(null)
  }

  const latestEntry = entries.length > 0 ? entries[0] : null
  const oldest = entries.length > 0 ? entries[entries.length - 1] : null
  const change = latestEntry && oldest && entries.length > 1 ? (latestEntry.weightKg - oldest.weightKg).toFixed(1) : null
  const last30Days = entries.filter(e => { const d = new Date(e.date); const ago = new Date(); ago.setDate(ago.getDate() - 30); return d >= ago })
  const avg30 = last30Days.length > 0 ? (last30Days.reduce((sum, e) => sum + e.weightKg, 0) / last30Days.length).toFixed(1) : null

  return (
    <>
      <PageHeader title="Body Weight" />

      {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {pendingDelete && (
        <InlineConfirmation
          message={`Delete the ${formatDate(pendingDelete.date)} bodyweight entry?`}
          confirmLabel="Delete entry"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteEntry(pendingDelete)}
        />
      )}

      <SummaryStrip aria-label="Bodyweight summary">
        <SummaryItem label="Latest weight" value={loading ? '—' : latestEntry ? `${latestEntry.weightKg} kg` : '—'} detail={!loading && latestEntry ? formatDate(latestEntry.date) : ''} />
        <SummaryItem label="30-day average" value={loading ? '—' : avg30 ? `${avg30} kg` : '—'} />
        <SummaryItem label="Total change" value={loading ? '—' : change !== null ? `${change > 0 ? '+' : ''}${change} kg` : '—'} detail={!loading && oldest && latestEntry ? `Since ${formatDate(oldest.date)}` : ''} />
        <SummaryItem label="Entries" value={loading ? '—' : entries.length} detail="All recorded" />
      </SummaryStrip>

      <div style={{ marginBottom: '1.5rem' }}>
        <button className="btn" onClick={() => openModal()}>
          <Icon name="plus" size={18} style={{ verticalAlign: 'middle', marginRight: 4 }} />Log Weight
        </button>
      </div>

      {loading ? (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <div style={{ background: 'var(--color-accent-muted)', height: 180, borderRadius: 'var(--radius-md)', animation: 'pulse 1.2s infinite alternate' }} />
            <div style={{ fontSize: '.85rem', marginTop: '.5rem' }}><LoadingLine width="40%" /></div>
          </div>
          <h3 style={{ marginBottom: '.75rem' }}>Recent Entries</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card" style={{ padding: '.75rem' }}><LoadingLine width="30%" /><LoadingLine width="20%" /></div>
            ))}
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Icon name="scale" size={48} style={{ marginBottom: '1rem', color: 'var(--color-accent)' }} />
          <h3>No bodyweight entries</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '.5rem' }}>Start tracking your weight to see trends over time</p>
        </div>
      ) : (
        <div>
          <div className="card bodyweight-chart-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Weight Over Time</h3>
            <p className="bodyweight-chart-note">
              Latest record is {latestEntry.weightKg} kg from {formatDate(latestEntry.date)}. The chart shows the most recent {Math.min(entries.length, 60)} entries so changes are readable without opening a separate report.
            </p>
            <div className="bodyweight-chart-bars" style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, borderBottom: '1px solid var(--glass-border)', paddingBottom: 4 }}>
              {entries.slice(0, 60).reverse().map((entry, idx) => {
                const min = Math.min(...entries.map(e => e.weightKg))
                const max = Math.max(...entries.map(e => e.weightKg))
                const range = max - min || 1
                const height = ((entry.weightKg - min) / range) * 100
                return (
                  <div key={entry.id} style={{ flex: 1, background: 'var(--color-accent)', height: `${Math.max(height, 5)}%`, minWidth: 2, opacity: 0.7 + (idx / entries.length) * 0.3, transition: 'all var(--transition-fast)', cursor: 'pointer' }} title={`${entry.date}: ${entry.weightKg} kg`} />
                )
              })}
            </div>
            <div style={{ fontSize: '.85rem', color: 'var(--color-text-muted)', marginTop: '.5rem' }}>Showing last {Math.min(entries.length, 60)} entries</div>
          </div>

          <h3 className="bodyweight-recent-title" style={{ marginBottom: '.75rem' }}>Recent Entries</h3>
          <div className="bodyweight-recent-list" style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {entries.slice(0, 30).map(entry => (
              <div key={entry.id} className="card bodyweight-recent-row" style={{ padding: '.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{entry.weightKg} kg</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '.9rem' }}>{formatDate(entry.date)}</div>
                  </div>
                  {entry.note && <div style={{ fontSize: '.85rem', color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic' }}>{entry.note}</div>}
                </div>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <button className="btn small" onClick={() => openModal(entry)} aria-label={`Edit bodyweight entry ${formatDate(entry.date)}`}><Icon name="pencil" size={18} /></button>
                  <button className="btn small btn-danger" onClick={() => setPendingDelete(entry)} aria-label={`Delete bodyweight entry ${formatDate(entry.date)}`}><Icon name="trash-2" size={18} /></button>
                </div>
              </div>
            ))}
          </div>
          {entries.length > 30 && <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '.9rem' }}>Showing 30 of {entries.length} entries</div>}
        </div>
      )}

      {showModal && (
        <Modal title={form.id ? 'Edit Weight Entry' : 'Log Weight'} onClose={closeModal} size="medium">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>Date <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input type="date" className="input" aria-label="Bodyweight entry date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} autoFocus />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>Weight (kg) <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input type="number" step="0.1" className="input" aria-label="Bodyweight in kilograms" placeholder="e.g. 75.5" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>Note</label>
              <textarea className="input" rows={3} aria-label="Bodyweight note" placeholder="Optional note..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
              <button className="btn" onClick={saveEntry}>{form.id ? 'Save Changes' : 'Log Weight'}</button>
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
