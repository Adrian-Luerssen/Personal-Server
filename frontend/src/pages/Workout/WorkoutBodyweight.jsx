import React, { useEffect, useState } from 'react'
import { api } from '../../api'
import {
  StatCard,
  Modal,
  LoadingLine,
  SkeletonStatCard,
  formatDate,
} from '../../components/shared'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'

export default function WorkoutBodyweight() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ id: null, date: '', weightKg: '', note: '' })

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

  async function saveEntry() {
    if (!form.date || !form.weightKg) { setError('Date and weight are required'); return }
    setError('')
    try {
      const payload = { date: form.date, weightKg: Number(form.weightKg), note: form.note.trim() || null }
      if (form.id) {
        const updated = await api.post(`/workout/bodyweight/${form.id}`, payload)
        setEntries(entries.map(e => e.id === updated.id ? updated : e))
      } else {
        const created = await api.post('/workout/bodyweight', payload)
        const exists = entries.find(e => e.date === created.date)
        if (exists) setEntries(entries.map(e => e.date === created.date ? created : e))
        else setEntries([created, ...entries].sort((a, b) => b.date.localeCompare(a.date)))
      }
      closeModal()
    } catch (e) { setError(e.message || 'Failed to save entry') }
  }

  // BUG FIX B3: use api.delete instead of api.post with { method: 'DELETE' }
  async function deleteEntry(entry) {
    if (!window.confirm('Delete this bodyweight entry?')) return
    setError('')
    try {
      await api.delete(`/workout/bodyweight/${entry.id}`)
      setEntries(entries.filter(e => e.id !== entry.id))
    } catch (e) { setError(e.message || 'Failed to delete entry') }
  }

  const latestEntry = entries.length > 0 ? entries[0] : null
  const oldest = entries.length > 0 ? entries[entries.length - 1] : null
  const change = latestEntry && oldest && entries.length > 1 ? (latestEntry.weightKg - oldest.weightKg).toFixed(1) : null
  const last30Days = entries.filter(e => { const d = new Date(e.date); const ago = new Date(); ago.setDate(ago.getDate() - 30); return d >= ago })
  const avg30 = last30Days.length > 0 ? (last30Days.reduce((sum, e) => sum + e.weightKg, 0) / last30Days.length).toFixed(1) : null

  return (
    <>
      <PageHeader icon="scale" title="Body Weight" accentColor="#4ade80" />

      {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard label="Latest Weight" value={latestEntry ? `${latestEntry.weightKg} kg` : '—'} subtitle={latestEntry ? formatDate(latestEntry.date) : ''} />
            <StatCard label="30-Day Average" value={avg30 ? `${avg30} kg` : '—'} />
            <StatCard label="Total Change" value={change !== null ? `${change > 0 ? '+' : ''}${change} kg` : '—'} subtitle={oldest && latestEntry ? `since ${formatDate(oldest.date)}` : ''} />
            <StatCard label="Total Entries" value={entries.length} />
          </>
        )}
      </div>

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
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Weight Over Time</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, borderBottom: '1px solid var(--glass-border)', paddingBottom: 4 }}>
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

          <h3 style={{ marginBottom: '.75rem' }}>Recent Entries</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {entries.slice(0, 30).map(entry => (
              <div key={entry.id} className="card" style={{ padding: '.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{entry.weightKg} kg</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '.9rem' }}>{formatDate(entry.date)}</div>
                  </div>
                  {entry.note && <div style={{ fontSize: '.85rem', color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic' }}>{entry.note}</div>}
                </div>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <button className="btn small" onClick={() => openModal(entry)}><Icon name="pencil" size={18} /></button>
                  <button className="btn small btn-danger" onClick={() => deleteEntry(entry)}><Icon name="trash-2" size={18} /></button>
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
              <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} autoFocus />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>Weight (kg) <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input type="number" step="0.1" className="input" placeholder="e.g. 75.5" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>Note</label>
              <textarea className="input" rows={3} placeholder="Optional note..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
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
