import React, { useState } from 'react'
import { api } from '../../api'
import { clearApiCache } from '../../api'
import { Modal } from '../../components/shared'
import Icon from '../../components/icons/Icon'

const DATA_MODULES = [
  {
    key: 'workout',
    label: 'Workout',
    icon: 'dumbbell',
    color: '#4ade80',
    description: 'Sessions, sets, exercises, categories, bodyweight entries, and routines',
    endpoint: '/data/workout',
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: 'wallet',
    color: '#fbbf24',
    description: 'Transactions, wallets, categories, and subscriptions',
    endpoint: '/data/finance',
  },
  {
    key: 'habits',
    label: 'Habits',
    icon: 'heart-pulse',
    color: '#a78bfa',
    description: 'All habits and their entry history',
    endpoint: '/data/habits',
  },
  {
    key: 'music',
    label: 'Music',
    icon: 'music',
    color: '#60a5fa',
    description: 'Spotify streams, tracks, albums, artists, and playlists',
    endpoint: '/data/music',
  },
  {
    key: 'chat',
    label: 'Chat',
    icon: 'message-circle',
    color: '#f87171',
    description: 'All conversations and messages',
    endpoint: '/data/chat',
  },
]

function DeleteConfirmModal({ module, onClose, onDeleted }) {
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const expected = `delete ${module.key}`

  const handleDelete = async () => {
    if (confirmText !== expected) return
    setDeleting(true)
    setError('')
    try {
      await api.delete(module.endpoint)
      clearApiCache()
      onDeleted(module.key)
      onClose()
    } catch (e) {
      setError(e.message || `Failed to delete ${module.label} data`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal title={`Delete All ${module.label} Data`} onClose={onClose} size="small">
      {error && <div className="alert-error">{error}</div>}

      <div style={{
        padding: '1rem',
        background: 'rgba(248, 113, 113, 0.1)',
        border: '1px solid rgba(248, 113, 113, 0.3)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Icon name="alert-triangle" size={18} style={{ color: '#f87171' }} />
          <strong style={{ color: '#f87171' }}>This action is irreversible</strong>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
          This will permanently delete all your {module.label.toLowerCase()} data: {module.description.toLowerCase()}.
        </p>
      </div>

      <div className="field">
        <label style={{ fontSize: '0.85rem' }}>
          Type <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>{expected}</code> to confirm
        </label>
        <input
          className="input"
          type="text"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder={expected}
          autoFocus
        />
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={deleting}>Cancel</button>
        <button
          className="btn btn-danger"
          onClick={handleDelete}
          disabled={deleting || confirmText !== expected}
        >
          {deleting ? 'Deleting...' : `Delete All ${module.label} Data`}
        </button>
      </div>
    </Modal>
  )
}

export default function DataManagement() {
  const [deleteModule, setDeleteModule] = useState(null)
  const [deleted, setDeleted] = useState({})

  const handleDeleted = (key) => {
    setDeleted(prev => ({ ...prev, [key]: true }))
    setTimeout(() => setDeleted(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    }), 3000)
  }

  return (
    <div className="card section">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '0.25rem' }}>Data Management</h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          Delete all data for a specific module. This cannot be undone.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {DATA_MODULES.map(mod => (
          <div
            key={mod.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: 'rgba(0,0,0,0.1)',
              borderRadius: 'var(--radius-md)',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
              <div style={{
                width: 40, height: 40, minWidth: 40,
                borderRadius: '50%',
                background: `${mod.color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={mod.icon} size={20} style={{ color: mod.color }} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{mod.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {mod.description}
                </div>
              </div>
            </div>

            {deleted[mod.key] ? (
              <span style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                color: '#4ade80', fontSize: '0.85rem', fontWeight: 600,
              }}>
                <Icon name="check" size={16} /> Deleted
              </span>
            ) : (
              <button
                className="btn small btn-danger"
                onClick={() => setDeleteModule(mod)}
              >
                <Icon name="trash-2" size={16} />
                Delete All
              </button>
            )}
          </div>
        ))}
      </div>

      {deleteModule && (
        <DeleteConfirmModal
          module={deleteModule}
          onClose={() => setDeleteModule(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
