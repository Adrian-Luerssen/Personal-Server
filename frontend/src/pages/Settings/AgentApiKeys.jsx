import React, { useEffect, useState } from 'react'
import { api } from '../../api'
import { getApiBase } from '../../config'
import { Modal, LoadingSpinner } from '../../components/shared'
import Icon from '../../components/icons/Icon'

// Available scopes grouped by module
const SCOPE_GROUPS = {
  'Workout': ['workout:read', 'workout:write'],
  'Finance': ['finance:read', 'finance:write'],
  'Habits': ['habits:read', 'habits:write'],
  'Music': ['music:read'],
  'Dashboard': ['dashboard:read'],
  'Profile': ['profile:read'],
}

const ALL_SCOPES = Object.values(SCOPE_GROUPS).flat()

function ScopeBadge({ scope }) {
  const [module, permission] = scope.split(':')
  const colors = {
    workout: { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ade80' },
    finance: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24' },
    habits: { bg: 'rgba(167, 139, 250, 0.15)', text: '#a78bfa' },
    music: { bg: 'rgba(96, 165, 250, 0.15)', text: '#60a5fa' },
    dashboard: { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' },
    profile: { bg: 'rgba(125, 211, 252, 0.15)', text: '#7dd3fc' },
  }
  const color = colors[module] || { bg: 'var(--color-accent-muted)', text: 'var(--color-accent)' }
  
  return (
    <span
      className="badge"
      style={{
        background: color.bg,
        color: color.text,
        marginRight: '4px',
        marginBottom: '4px',
      }}
    >
      {module}:{permission}
    </span>
  )
}

function ScopeSelector({ selected, onChange }) {
  const toggleScope = (scope) => {
    if (selected.includes(scope)) {
      onChange(selected.filter(s => s !== scope))
    } else {
      onChange([...selected, scope])
    }
  }

  const toggleGroup = (groupScopes) => {
    const allSelected = groupScopes.every(s => selected.includes(s))
    if (allSelected) {
      onChange(selected.filter(s => !groupScopes.includes(s)))
    } else {
      onChange([...new Set([...selected, ...groupScopes])])
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Object.entries(SCOPE_GROUPS).map(([group, scopes]) => {
        const allSelected = scopes.every(s => selected.includes(s))
        const someSelected = scopes.some(s => selected.includes(s)) && !allSelected
        
        return (
          <div key={group} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected }}
                onChange={() => toggleGroup(scopes)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{group}</span>
            </div>
            <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {scopes.map(scope => (
                <label key={scope} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{scope}</span>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CreateKeyModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState([])
  const [expiresIn, setExpiresIn] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdKey, setCreatedKey] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (scopes.length === 0) {
      setError('Select at least one scope')
      return
    }
    
    setSaving(true)
    setError('')
    
    try {
      const body = {
        name: name.trim(),
        scopes,
      }
      
      if (expiresIn) {
        const days = parseInt(expiresIn, 10)
        if (days > 0) {
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + days)
          body.expiresAt = expiresAt.toISOString()
        }
      }
      
      const result = await api.post('/agents/keys', body)
      setCreatedKey(result)
    } catch (e) {
      setError(e.message || 'Failed to create API key')
    } finally {
      setSaving(false)
    }
  }

  const handleDone = () => {
    onCreated()
    onClose()
  }

  if (createdKey) {
    const keyData = createdKey.agentKey || createdKey
    const keyScopes = keyData.scopes || scopes
    const keyName = keyData.name || name
    const serverBase = getApiBase().replace(/\/api$/, '')

    const agentSnippet = `## Personal Server Agent Setup

**Name:** ${keyName}
**Server:** ${serverBase}
**API Key:** ${createdKey.key}

### Authentication

All API requests use the \`X-API-Key\` header:

\`\`\`
X-API-Key: ${createdKey.key}
\`\`\`

### Granted Scopes

${keyScopes.map(s => `- \`${s}\``).join('\n')}

### Available Endpoints

Base path: \`${serverBase}/api/v1/\`

${keyScopes.includes('workout:read') ? `**Workout** (workout:read)
- \`GET /api/v1/workout/sessions\` — List sessions (?page=1&limit=20)
- \`GET /api/v1/workout/sessions/recent\` — Recent sessions (?limit=5)
- \`GET /api/v1/workout/sessions/active\` — Current active session
- \`GET /api/v1/workout/sessions/:id\` — Specific session
- \`GET /api/v1/workout/stats\` — Aggregate stats
- \`GET /api/v1/workout/exercises\` — All exercises
- \`GET /api/v1/workout/bodyweight\` — Bodyweight entries
` : ''}${keyScopes.includes('finance:read') ? `**Finance** (finance:read)
- \`GET /api/v1/finance/transactions\` — Transactions (?page, ?limit, ?type, ?walletId, ?categoryId)
- \`GET /api/v1/finance/wallets\` — Wallets
- \`GET /api/v1/finance/categories\` — Categories
` : ''}${keyScopes.includes('habits:read') ? `**Habits** (habits:read)
- \`GET /api/v1/habits/summary\` — All habits with streaks
- \`GET /api/v1/habits/calendar/:month\` — Calendar view (YYYY-MM)
` : ''}${keyScopes.includes('music:read') ? `**Music** (music:read)
- Read-only access to Spotify listening history via dashboard
` : ''}${keyScopes.includes('dashboard:read') ? `**Dashboard** (dashboard:read)
- \`GET /api/v1/dashboard/streams/workout\` — Spotify during workouts (?timeframe=30d)
` : ''}${keyScopes.includes('chat:read') || keyScopes.includes('chat:write') ? `**Chat** (${[keyScopes.includes('chat:read') && 'chat:read', keyScopes.includes('chat:write') && 'chat:write'].filter(Boolean).join(', ')})
${keyScopes.includes('chat:read') ? `- \`GET /api/v1/chat/unread\` — Poll for unread messages
- \`GET /api/v1/chat/conversations/:id/messages\` — Conversation messages` : ''}
${keyScopes.includes('chat:write') ? `- \`PATCH /api/v1/chat/messages/:id\` — Update message status
- \`POST /api/v1/chat/conversations/:id/messages\` — Send reply` : ''}
` : ''}${keyScopes.includes('profile:read') ? `**Profile** (profile:read)
- Read basic profile information
` : ''}
### Example Request

\`\`\`bash
curl -H "X-API-Key: ${createdKey.key}" "${serverBase}/api/v1/${keyScopes.includes('workout:read') ? 'workout/stats' : keyScopes.includes('habits:read') ? 'habits/summary' : keyScopes.includes('finance:read') ? 'finance/wallets' : keyScopes.includes('chat:read') ? 'chat/unread' : 'dashboard/streams/workout'}"
\`\`\`

### Full Skill Document

The complete agent skill document is available at:
\`GET ${serverBase}/api/agent-skill\` (no auth required)
`

    const handleCopySnippet = async () => {
      await navigator.clipboard.writeText(agentSnippet)
      setCopied('snippet')
      setTimeout(() => setCopied(false), 2000)
    }

    const handleCopyKey = async () => {
      await navigator.clipboard.writeText(createdKey.key)
      setCopied('key')
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <Modal title="API Key Created" onClose={handleDone} size="large">
        <div className="alert-warning" style={{ marginBottom: '1rem' }}>
          <strong>Important:</strong> Copy this key now. You won't be able to see it again!
        </div>

        <div className="field">
          <label>API Key</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              type="text"
              value={createdKey.key}
              readOnly
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            <button className="btn small" onClick={handleCopyKey}>
              <Icon name={copied === 'key' ? 'check' : 'copy'} size={16} />
            </button>
          </div>
        </div>

        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)' }}>
          <div><strong>Name:</strong> {keyName}</div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong>Scopes:</strong>
            <div style={{ marginTop: '0.25rem' }}>
              {keyScopes.map(s => <ScopeBadge key={s} scope={s} />)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>Agent Setup Instructions</label>
            <button className="btn small" onClick={handleCopySnippet}>
              <Icon name={copied === 'snippet' ? 'check' : 'copy'} size={16} />
              {copied === 'snippet' ? 'Copied!' : 'Copy All'}
            </button>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>
            Copy and paste this to your agent so it knows how to interact with your server.
          </p>
          <textarea
            readOnly
            value={agentSnippet}
            style={{
              width: '100%',
              minHeight: '280px',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              padding: '0.75rem',
              background: 'rgba(0,0,0,0.2)',
              color: 'var(--color-text)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-md)',
              resize: 'vertical',
              lineHeight: 1.5,
            }}
          />
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={handleDone}>Done</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Create API Key" onClose={onClose} size="medium">
      {error && <div className="alert-error">{error}</div>}
      
      <div className="field">
        <label>Key Name</label>
        <input
          className="input"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Claudia, Home Assistant"
        />
      </div>
      
      <div className="field">
        <label>Expires In (days, optional)</label>
        <input
          className="input"
          type="number"
          value={expiresIn}
          onChange={e => setExpiresIn(e.target.value)}
          placeholder="Leave empty for no expiration"
          min="1"
        />
      </div>
      
      <div className="field">
        <label>Permissions</label>
        <ScopeSelector selected={scopes} onChange={setScopes} />
      </div>
      
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn" onClick={handleCreate} disabled={saving}>
          {saving ? 'Creating...' : 'Create Key'}
        </button>
      </div>
    </Modal>
  )
}

function EditKeyModal({ apiKey, onClose, onUpdated }) {
  const [name, setName] = useState(apiKey.name)
  const [scopes, setScopes] = useState(apiKey.scopes || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (scopes.length === 0) {
      setError('Select at least one scope')
      return
    }
    
    setSaving(true)
    setError('')
    
    try {
      await api.patch(`/agents/keys/${apiKey.id}`, {
        name: name.trim(),
        scopes,
      })
      onUpdated()
      onClose()
    } catch (e) {
      setError(e.message || 'Failed to update API key')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Edit API Key" onClose={onClose} size="medium">
      {error && <div className="alert-error">{error}</div>}
      
      <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)' }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Key prefix: </span>
        <code style={{ fontFamily: 'monospace' }}>{apiKey.keyPrefix}...</code>
      </div>
      
      <div className="field">
        <label>Key Name</label>
        <input
          className="input"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Claudia, Home Assistant"
        />
      </div>
      
      <div className="field">
        <label>Permissions</label>
        <ScopeSelector selected={scopes} onChange={setScopes} />
      </div>
      
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  )
}

function RevokeKeyModal({ apiKey, onClose, onRevoked }) {
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState('')

  const handleRevoke = async () => {
    setRevoking(true)
    setError('')
    
    try {
      await api.delete(`/agents/keys/${apiKey.id}`)
      onRevoked()
      onClose()
    } catch (e) {
      setError(e.message || 'Failed to revoke API key')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <Modal title="Revoke API Key" onClose={onClose} size="small">
      {error && <div className="alert-error">{error}</div>}
      
      <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
        Are you sure you want to revoke the API key <strong>"{apiKey.name}"</strong>?
      </p>
      <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
        This action cannot be undone. Any applications using this key will lose access.
      </p>
      
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={revoking}>Cancel</button>
        <button className="btn btn-danger" onClick={handleRevoke} disabled={revoking}>
          {revoking ? 'Revoking...' : 'Revoke Key'}
        </button>
      </div>
    </Modal>
  )
}

function ApiKeyRow({ apiKey, onEdit, onRevoke }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()
  const isInactive = !apiKey.isActive || isExpired

  return (
    <div
      style={{
        padding: '1rem',
        background: 'rgba(0,0,0,0.1)',
        borderRadius: 'var(--radius-md)',
        opacity: isInactive ? 0.6 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 600 }}>{apiKey.name}</span>
            {isInactive && (
              <span className="badge" style={{ background: 'var(--color-error-muted)', color: 'var(--color-error)' }}>
                {isExpired ? 'Expired' : 'Inactive'}
              </span>
            )}
            {apiKey.isActive && !isExpired && (
              <span className="badge" style={{ background: 'var(--color-success-muted)', color: 'var(--color-success)' }}>
                Active
              </span>
            )}
          </div>
          <code style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {apiKey.keyPrefix}...
          </code>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn small btn-ghost" onClick={() => onEdit(apiKey)}>
            <Icon name="pencil" size={16} />
          </button>
          <button className="btn small btn-danger" onClick={() => onRevoke(apiKey)}>
            <Icon name="trash-2" size={16} />
          </button>
        </div>
      </div>
      
      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          {(apiKey.scopes || []).map(s => <ScopeBadge key={s} scope={s} />)}
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          <span>
            <Icon name="clock" size={14} style={{ marginRight: '4px' }} />
            Last used: {formatDate(apiKey.lastUsedAt)}
          </span>
          <span>
            <Icon name="calendar" size={14} style={{ marginRight: '4px' }} />
            Created: {formatDate(apiKey.createdAt)}
          </span>
          {apiKey.expiresAt && (
            <span style={{ color: isExpired ? 'var(--color-error)' : undefined }}>
              <Icon name="timer" size={14} style={{ marginRight: '4px' }} />
              Expires: {formatDate(apiKey.expiresAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AgentApiKeys() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editKey, setEditKey] = useState(null)
  const [revokeKey, setRevokeKey] = useState(null)

  const loadKeys = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/agents/keys')
      setKeys(Array.isArray(data) ? data : data.keys || [])
    } catch (e) {
      setError(e.message || 'Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  return (
    <div className="card section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>Agent API Keys</h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            Manage API keys for agents to access your data
          </p>
        </div>
        <button className="btn small" onClick={() => setShowCreate(true)}>
          <Icon name="plus" size={16} />
          New Key
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <div className="loading-center" style={{ minHeight: '150px' }}>
          <LoadingSpinner />
        </div>
      ) : keys.length === 0 ? (
        <div className="empty-state">
          <Icon name="key-round" size={24} />
          <p>No API keys yet</p>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            Create an API key to allow agents to access your data
          </p>
          <button className="btn" onClick={() => setShowCreate(true)} style={{ marginTop: '1rem' }}>
            <Icon name="plus" size={16} />
            Create First Key
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {keys.map(key => (
            <ApiKeyRow
              key={key.id}
              apiKey={key}
              onEdit={setEditKey}
              onRevoke={setRevokeKey}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateKeyModal
          onClose={() => setShowCreate(false)}
          onCreated={loadKeys}
        />
      )}

      {editKey && (
        <EditKeyModal
          apiKey={editKey}
          onClose={() => setEditKey(null)}
          onUpdated={loadKeys}
        />
      )}

      {revokeKey && (
        <RevokeKeyModal
          apiKey={revokeKey}
          onClose={() => setRevokeKey(null)}
          onRevoked={loadKeys}
        />
      )}
    </div>
  )
}
