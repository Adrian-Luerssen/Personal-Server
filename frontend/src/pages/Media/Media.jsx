import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from '../../api'
import { StatCard, SkeletonStatCard, SkeletonCard } from '../../components/shared'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'
import './Media.css'

const MEDIA_COLOR = '#f472b6'

const TYPE_META = {
  anime:  { icon: 'tv',          label: 'Anime',   color: '#818cf8' },
  manga:  { icon: 'book-open',   label: 'Manga',   color: '#34d399' },
  tv:     { icon: 'monitor',     label: 'TV',       color: '#60a5fa' },
  movie:  { icon: 'clapperboard',label: 'Movies',   color: '#fbbf24' },
  book:   { icon: 'book',        label: 'Books',    color: '#f97316' },
}

const STATUS_META = {
  planning:  { label: 'Planning',   color: '#94a3b8' },
  watching:  { label: 'Watching',   color: '#60a5fa' },
  reading:   { label: 'Reading',    color: '#34d399' },
  completed: { label: 'Completed',  color: '#a78bfa' },
  paused:    { label: 'Paused',     color: '#fbbf24' },
  dropped:   { label: 'Dropped',    color: '#f87171' },
}

function MediaCard({ item, onClick }) {
  const typeMeta = TYPE_META[item.type] || {}
  const statusMeta = STATUS_META[item.status] || {}

  return (
    <div className="media-card" onClick={() => onClick(item)}>
      <div className="media-card-cover">
        {item.coverUrl && item.coverUrl.length > 1 ? (
          <img src={item.coverUrl} alt={item.title} loading="lazy" />
        ) : (
          <div className="media-card-cover-placeholder">
            <Icon name={typeMeta.icon || 'film'} size={32} />
          </div>
        )}
        <div className="media-card-type-badge" style={{ background: typeMeta.color }}>
          {typeMeta.label}
        </div>
        {item.rating != null && (
          <div className="media-card-rating">
            <Icon name="star" size={12} />
            {Number(item.rating).toFixed(1)}
          </div>
        )}
      </div>
      <div className="media-card-body">
        <div className="media-card-title">{item.title}</div>
        <div className="media-card-status" style={{ color: statusMeta.color }}>
          {statusMeta.label}
        </div>
        {item.metadata?.episodesWatched != null && item.metadata?.episodes && (
          <div className="media-card-progress-row">
            <div className="media-card-progress-bar">
              <div
                className="media-card-progress-fill"
                style={{
                  width: `${Math.min(100, (item.metadata.episodesWatched / item.metadata.episodes) * 100)}%`,
                  background: typeMeta.color,
                }}
              />
            </div>
            <span className="media-card-progress-text">
              {item.metadata.episodesWatched}/{item.metadata.episodes}
            </span>
          </div>
        )}
        {item.metadata?.chaptersRead != null && item.metadata?.chapters && (
          <div className="media-card-progress-row">
            <div className="media-card-progress-bar">
              <div
                className="media-card-progress-fill"
                style={{
                  width: `${Math.min(100, (item.metadata.chaptersRead / item.metadata.chapters) * 100)}%`,
                  background: typeMeta.color,
                }}
              />
            </div>
            <span className="media-card-progress-text">
              {item.metadata.chaptersRead}/{item.metadata.chapters} ch
            </span>
          </div>
        )}
        {item.metadata?.pagesRead != null && item.metadata?.pages && (
          <div className="media-card-progress-row">
            <div className="media-card-progress-bar">
              <div
                className="media-card-progress-fill"
                style={{
                  width: `${Math.min(100, (item.metadata.pagesRead / item.metadata.pages) * 100)}%`,
                  background: typeMeta.color,
                }}
              />
            </div>
            <span className="media-card-progress-text">
              {item.metadata.pagesRead}/{item.metadata.pages} pg
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function AddModal({ open, onClose, onSave }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(null)
  const [mode, setMode] = useState('search') // 'search' | 'manual'
  const [manual, setManual] = useState({ title: '', type: 'anime', status: 'planning', rating: '' })
  const debounce = useRef(null)

  const doSearch = useCallback(async (q, t) => {
    if (!q || q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const params = new URLSearchParams({ q })
      if (t) params.set('type', t)
      const data = await apiFetch(`/media/search?${params}`)
      setResults(Array.isArray(data) ? data : [])
    } catch { setResults([]) }
    finally { setSearching(false) }
  }, [])

  useEffect(() => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => doSearch(query, type), 400)
    return () => clearTimeout(debounce.current)
  }, [query, type])

  const addFromSearch = async (item) => {
    setAdding(item.title)
    try {
      await apiFetch('/media', {
        method: 'POST',
        body: JSON.stringify({
          title: item.title,
          type: item.type,
          status: 'planning',
          coverUrl: item.coverUrl,
          metadata: item.metadata || {},
          externalIds: item.externalIds || {},
        }),
      })
      onSave()
      onClose()
    } catch (e) {
      alert(e.message)
    } finally { setAdding(null) }
  }

  const addManual = async () => {
    if (!manual.title.trim()) return
    setAdding('manual')
    try {
      await apiFetch('/media', {
        method: 'POST',
        body: JSON.stringify({
          title: manual.title.trim(),
          type: manual.type,
          status: manual.status,
          rating: manual.rating ? parseFloat(manual.rating) : undefined,
        }),
      })
      onSave()
      onClose()
    } catch (e) { alert(e.message) }
    finally { setAdding(null) }
  }

  if (!open) return null

  return (
    <div className="media-modal-overlay" onClick={onClose}>
      <div className="media-modal" onClick={e => e.stopPropagation()}>
        <div className="media-modal-header">
          <h3>Add Media</h3>
          <button className="media-modal-close" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="media-modal-tabs">
          <button className={`media-tab ${mode === 'search' ? 'active' : ''}`} onClick={() => setMode('search')}>
            <Icon name="search" size={16} /> Search
          </button>
          <button className={`media-tab ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>
            <Icon name="pen" size={16} /> Manual
          </button>
        </div>

        {mode === 'search' ? (
          <>
            <div className="media-search-row">
              <div className="media-search-input-wrap">
                <Icon name="search" size={16} className="media-search-icon" />
                <input
                  type="text"
                  placeholder="Search anime, movies, books..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="">All types</option>
                {Object.entries(TYPE_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="media-search-results">
              {searching && (
                <div className="media-search-loading">
                  <Icon name="loader" size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  Searching...
                </div>
              )}
              {!searching && results.length === 0 && query.length >= 2 && (
                <div className="media-search-empty">No results found</div>
              )}
              {results.map((item, i) => {
                const meta = TYPE_META[item.type] || {}
                return (
                  <div key={i} className="media-search-result">
                    <div className="media-search-result-cover">
                      {item.coverUrl ? (
                        <img src={item.coverUrl} alt="" />
                      ) : (
                        <Icon name={meta.icon || 'film'} size={20} />
                      )}
                    </div>
                    <div className="media-search-result-info">
                      <div className="media-search-result-title">{item.title}</div>
                      <div className="media-search-result-meta">
                        <span style={{ color: meta.color }}>{meta.label}</span>
                        {item.year && <span>{item.year}</span>}
                      </div>
                      {item.description && (
                        <div className="media-search-result-desc">{item.description.slice(0, 120)}...</div>
                      )}
                    </div>
                    <button
                      className="btn media-add-btn"
                      onClick={() => addFromSearch(item)}
                      disabled={adding === item.title}
                    >
                      {adding === item.title ? <Icon name="loader" size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon name="plus" size={16} />}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="media-manual-form">
            <label>
              Title
              <input type="text" value={manual.title} onChange={e => setManual(m => ({ ...m, title: e.target.value }))} placeholder="Enter title..." />
            </label>
            <div className="media-manual-row">
              <label>
                Type
                <select value={manual.type} onChange={e => setManual(m => ({ ...m, type: e.target.value }))}>
                  {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <label>
                Status
                <select value={manual.status} onChange={e => setManual(m => ({ ...m, status: e.target.value }))}>
                  {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <label>
                Rating
                <input type="number" min="0" max="10" step="0.5" value={manual.rating} onChange={e => setManual(m => ({ ...m, rating: e.target.value }))} placeholder="0-10" />
              </label>
            </div>
            <button className="btn" onClick={addManual} disabled={!manual.title.trim() || adding === 'manual'} style={{ background: MEDIA_COLOR, color: '#000', marginTop: '1rem' }}>
              <Icon name="plus" size={18} /> Add Item
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EditModal({ item, open, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title || '',
        status: item.status || 'planning',
        rating: item.rating != null ? String(item.rating) : '',
        notes: item.notes || '',
        startDate: item.startDate || '',
        endDate: item.endDate || '',
        episodesWatched: item.metadata?.episodesWatched ?? '',
        chaptersRead: item.metadata?.chaptersRead ?? '',
        pagesRead: item.metadata?.pagesRead ?? '',
      })
    }
  }, [item])

  const save = async () => {
    setSaving(true)
    try {
      const body = {
        title: form.title,
        status: form.status,
        rating: form.rating ? parseFloat(form.rating) : null,
        notes: form.notes || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      }
      const metadata = {}
      if (form.episodesWatched !== '') metadata.episodesWatched = parseInt(form.episodesWatched) || 0
      if (form.chaptersRead !== '') metadata.chaptersRead = parseInt(form.chaptersRead) || 0
      if (form.pagesRead !== '') metadata.pagesRead = parseInt(form.pagesRead) || 0
      if (Object.keys(metadata).length) body.metadata = metadata

      await apiFetch(`/media/${item.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      onSave()
      onClose()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const remove = async () => {
    if (!confirm('Delete this item?')) return
    setDeleting(true)
    try {
      await apiFetch(`/media/${item.id}`, { method: 'DELETE' })
      onDelete()
      onClose()
    } catch (e) { alert(e.message) }
    finally { setDeleting(false) }
  }

  if (!open || !item) return null

  const typeMeta = TYPE_META[item.type] || {}
  const showEpisodes = item.type === 'anime' || item.type === 'tv'
  const showChapters = item.type === 'manga'
  const showPages = item.type === 'book'
  const synopsis = typeof item.metadata?.synopsis === 'string' ? item.metadata.synopsis : ''
  const genres = Array.isArray(item.metadata?.genres) ? item.metadata.genres : []

  return createPortal(
    <div className="media-modal-overlay" onClick={onClose}>
      <div className="media-modal media-modal-edit" onClick={e => e.stopPropagation()}>
        <div className="media-modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name={typeMeta.icon || 'film'} size={20} style={{ color: typeMeta.color }} />
            Edit
          </h3>
          <button className="media-modal-close" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="media-edit-layout">
          {item.coverUrl && item.coverUrl.length > 1 && (
            <div className="media-edit-cover">
              <img src={item.coverUrl} alt={item.title} />
            </div>
          )}
          <div className="media-edit-fields">
            <label>Title <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></label>
            <div className="media-manual-row">
              <label>Status
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <label>Rating
                <input type="number" min="0" max="10" step="0.5" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} placeholder="0-10" />
              </label>
            </div>
            <div className="media-manual-row">
              <label>Start Date <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></label>
              <label>End Date <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></label>
            </div>
            {showEpisodes && (
              <label>
                Episodes Watched {item.metadata?.episodes ? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--color-text-secondary)' }}>/ {item.metadata.episodes} total</span> : ''}
                <input type="number" min="0" max={item.metadata?.episodes || undefined} value={form.episodesWatched} onChange={e => setForm(f => ({ ...f, episodesWatched: e.target.value }))} />
              </label>
            )}
            {showChapters && (
              <label>
                Chapters Read {item.metadata?.chapters ? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--color-text-secondary)' }}>/ {item.metadata.chapters} total</span> : ''}
                <input type="number" min="0" max={item.metadata?.chapters || undefined} value={form.chaptersRead} onChange={e => setForm(f => ({ ...f, chaptersRead: e.target.value }))} />
              </label>
            )}
            {showPages && (
              <label>
                Pages Read {item.metadata?.pages ? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--color-text-secondary)' }}>/ {item.metadata.pages} total</span> : ''}
                <input type="number" min="0" max={item.metadata?.pages || undefined} value={form.pagesRead} onChange={e => setForm(f => ({ ...f, pagesRead: e.target.value }))} />
              </label>
            )}
            {synopsis && (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', lineHeight: 1.5, maxHeight: 80, overflowY: 'auto', padding: '0.5rem 0.6rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--glass-border)' }}>
                {synopsis}
              </div>
            )}
            {genres.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' }}>
                {genres.map((g, i) => (
                  <span key={i} style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full, 999px)', background: `${typeMeta.color}22`, color: typeMeta.color, fontSize: '0.7rem', fontWeight: 600 }}>{String(g)}</span>
                ))}
              </div>
            )}
            <label>Notes <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Personal notes..." /></label>
          </div>
        </div>

        <div className="media-modal-actions">
          <button className="btn media-delete-btn" onClick={remove} disabled={deleting}>
            <Icon name="trash-2" size={16} /> Delete
          </button>
          <button className="btn" onClick={save} disabled={saving} style={{ background: MEDIA_COLOR, color: '#000' }}>
            <Icon name="check" size={16} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function Media() {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('type', filterType)
      if (filterStatus) params.set('status', filterStatus)
      if (search) params.set('search', search)
      const [data, s] = await Promise.all([
        apiFetch(`/media?${params}`),
        apiFetch('/media/stats'),
      ])
      setItems(Array.isArray(data) ? data : [])
      setStats(s)
    } catch { }
    finally { setLoading(false) }
  }, [filterType, filterStatus, search])

  useEffect(() => { load() }, [load])

  const activeCount = items.filter(i => ['watching', 'reading'].includes(i.status)).length
  const completedCount = stats?.completed ?? 0
  const avgRating = stats?.averageRating

  return (
    <>
      <PageHeader icon="clapperboard" title="Media" accentColor={MEDIA_COLOR} />

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        {loading ? (
          <>
            <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard icon="library" label="Total" value={stats?.total ?? 0} accentColor={MEDIA_COLOR} />
            <StatCard icon="play" label="In Progress" value={activeCount} accentColor="#60a5fa" />
            <StatCard icon="check-circle" label="Completed" value={completedCount} accentColor="#a78bfa" />
            <StatCard icon="star" label="Avg Rating" value={avgRating != null ? avgRating.toFixed(1) : '--'} accentColor="#fbbf24" />
          </>
        )}
      </div>

      {/* Type chips */}
      <div className="media-type-chips">
        <button
          className={`media-chip ${!filterType ? 'active' : ''}`}
          onClick={() => setFilterType('')}
          style={!filterType ? { background: MEDIA_COLOR, color: '#000' } : {}}
        >
          All
        </button>
        {Object.entries(TYPE_META).map(([key, meta]) => (
          <button
            key={key}
            className={`media-chip ${filterType === key ? 'active' : ''}`}
            onClick={() => setFilterType(filterType === key ? '' : key)}
            style={filterType === key ? { background: meta.color, color: '#000' } : {}}
          >
            <Icon name={meta.icon} size={14} />
            {meta.label}
            {stats?.byType?.[key] != null && (
              <span className="media-chip-count">{stats.byType[key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="media-toolbar">
        <div className="media-search-input-wrap" style={{ flex: 1, maxWidth: 320 }}>
          <Icon name="search" size={16} className="media-search-icon" />
          <input
            type="text"
            placeholder="Search library..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="media-filter-select">
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className="btn" onClick={() => setAddOpen(true)} style={{ background: MEDIA_COLOR, color: '#000', whiteSpace: 'nowrap' }}>
          <Icon name="plus" size={18} /> Add
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="media-grid">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} style={{ height: 280 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Icon name="clapperboard" size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No media items yet</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Search for anime, movies, TV shows, manga, or books to start tracking.
          </p>
          <button className="btn" onClick={() => setAddOpen(true)} style={{ background: MEDIA_COLOR, color: '#000' }}>
            <Icon name="plus" size={18} /> Add Your First Item
          </button>
        </div>
      ) : (
        <div className="media-grid">
          {items.map(item => (
            <MediaCard key={item.id} item={item} onClick={setEditItem} />
          ))}
        </div>
      )}

      <AddModal open={addOpen} onClose={() => setAddOpen(false)} onSave={load} />
      <EditModal key={editItem?.id || 'none'} item={editItem} open={!!editItem} onClose={() => setEditItem(null)} onSave={load} onDelete={load} />

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
