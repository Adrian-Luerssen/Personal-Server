import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from '../../api'
import Icon from '../../components/icons/Icon'
import { PageHeading, StatePanel, SummaryItem, SummaryStrip } from '../../components/record'
import {
  getNextProgressUpdate,
  getSeriesProgress,
  groupSeriesByStatus,
  normalizeSeriesCollection,
} from './seriesViewModel.mjs'
import {
  getCatalogProgressLabel,
  getNextEpisodeAction,
  summarizeSeriesMetadata,
} from './seriesCatalogModel.mjs'
import SeriesDetail from './SeriesDetail'

const TYPE_META = {
  anime:  { icon: 'tv',           label: 'Anime' },
  manga:  { icon: 'book-open',    label: 'Manga' },
  tv:     { icon: 'monitor',      label: 'TV' },
  movie:  { icon: 'clapperboard', label: 'Movies' },
  book:   { icon: 'book',         label: 'Books' },
}

const STATUS_META = {
  planning:  { label: 'Planning' },
  watching:  { label: 'Watching' },
  reading:   { label: 'Reading' },
  completed: { label: 'Completed' },
  paused:    { label: 'Paused' },
  dropped:   { label: 'Dropped' },
}

function useModalFocus(open, onClose, dialogRef) {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const focusDialog = window.requestAnimationFrame(() => {
      const preferred = dialogRef.current?.querySelector('input[autofocus]')
        || dialogRef.current?.querySelector('input, select, textarea')
        || dialogRef.current?.querySelector('button')
      preferred?.focus()
    })
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusDialog)
      document.removeEventListener('keydown', handleKeyDown)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open, dialogRef])
}

function SeriesRow({ item, catalog, onOpen, onIncrement, onWatchEpisode, busy }) {
  const typeMeta = TYPE_META[item.type] || {}
  const statusMeta = STATUS_META[item.status] || {}
  const progress = getSeriesProgress(item)
  const nextProgress = getNextProgressUpdate(item)
  const metadata = summarizeSeriesMetadata(item)
  const nextAction = getNextEpisodeAction(catalog)
  const seasonCount = catalog?.seasons?.filter((season) => Number(season.number) > 0).length || Number(item.metadata?.seasonCount) || 0
  const relatedCount = catalog?.relations?.length || 0
  const scopeLabel = item.type === 'tv'
    ? (seasonCount ? `${seasonCount} season${seasonCount === 1 ? '' : 's'} in this series` : 'Season catalog pending')
    : item.type === 'anime'
      ? `${metadata.format || 'Anime release'} · ${relatedCount} related release${relatedCount === 1 ? '' : 's'}`
      : metadata.format || typeMeta.label || item.type
  const progressLabel = item.type === 'anime' || item.type === 'tv'
    ? getCatalogProgressLabel(catalog, item)
    : progress
      ? `${progress.value} / ${progress.total ?? 'unknown'} ${progress.unit}${progress.value === 1 ? '' : 's'}`
      : null

  return (
    <article className="series-row" data-status={item.status || 'planning'}>
      <div className="series-row__cover">
        {item.coverUrl && item.coverUrl.length > 1 ? (
          <img src={item.coverUrl} alt={item.title} loading="lazy" />
        ) : (
          <div className="series-row__cover-placeholder" aria-hidden="true">
            <Icon name={typeMeta.icon || 'film'} size={22} />
          </div>
        )}
      </div>
      <div className="series-row__open">
        <button type="button" className="series-row__title series-row__title-button" onClick={() => onOpen(item)} aria-label={`Open ${item.title} details`}>
          {item.title}
        </button>
        <span className="series-row__meta">
          <span>{typeMeta.label || item.type}</span>
          {metadata.year && <span>{metadata.year}</span>}
          {metadata.studio && <span>{metadata.studio}</span>}
          {item.rating != null && <span>{Number(item.rating).toFixed(1)} / 10</span>}
          <span className="series-row__status">{statusMeta.label || item.status}</span>
        </span>
        <span className="series-row__scope">{scopeLabel}</span>
        {progressLabel && (
          <span className="series-row__progress">
            <progress value={catalog?.progress?.watched ?? progress?.value ?? 0} max={catalog?.progress?.total || progress?.total || Math.max(progress?.value || 0, 1)} aria-label={`${item.title}: ${progressLabel}`} />
            <span>{progressLabel}</span>
          </span>
        )}
      </div>
      <div className="series-row__actions">
        {nextAction && !nextAction.upcoming ? (
          <button
            type="button"
            className="series-row__increment series-row__episode-action"
            aria-label={`${nextAction.label}: ${item.title}`}
            disabled={busy}
            onClick={() => onWatchEpisode(item, nextAction.episodeId)}
          >
            {busy ? <Icon name="loader" size={15} /> : nextAction.label.replace('Watch ', '')}
          </button>
        ) : progress && (
          <button
            type="button"
            className="series-row__increment"
            aria-label={`Log next ${progress.unit} for ${item.title}`}
            disabled={!nextProgress || busy}
            onClick={() => onIncrement(item)}
          >
            {busy ? <Icon name="loader" size={15} /> : '+1'}
            <span>{progress.unit === 'episode' ? 'ep' : progress.unit === 'chapter' ? 'ch' : 'pg'}</span>
          </button>
        )}
        <button type="button" className="series-row__edit" aria-label={`Open details for ${item.title}`} onClick={() => onOpen(item)}>
          <Icon name="chevron-right" size={18} />
        </button>
      </div>
    </article>
  )
}

function AddModal({ open, onClose, onSave }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('search') // 'search' | 'manual'
  const [manual, setManual] = useState({ title: '', type: 'anime', status: 'planning', rating: '' })
  const debounce = useRef(null)
  const dialogRef = useRef(null)
  useModalFocus(open, onClose, dialogRef)

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
    setError('')
    setAdding(item.title)
    try {
      const created = await apiFetch('/media', {
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
      if (created?.id && ['anime', 'tv'].includes(created.type) && (created.externalIds?.malId || created.externalIds?.tmdbId)) {
        try { await apiFetch(`/media/${created.id}/catalog/sync`, { method: 'POST' }) } catch { /* Manual tracking remains available. */ }
      }
      onSave()
      onClose()
    } catch (e) {
      setError(e.message || 'This title could not be added.')
    } finally { setAdding(null) }
  }

  const addManual = async () => {
    if (!manual.title.trim()) return
    setError('')
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
    } catch (e) { setError(e.message || 'This title could not be added.') }
    finally { setAdding(null) }
  }

  if (!open) return null

  return (
    <div className="media-modal-overlay" onClick={onClose}>
      <div ref={dialogRef} className="media-modal" role="dialog" aria-modal="true" aria-labelledby="add-series-title" onClick={e => e.stopPropagation()}>
        <div className="media-modal-header">
          <h3 id="add-series-title">Add title</h3>
          <button className="media-modal-close" aria-label="Close add media" onClick={onClose}>
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

        {error && <div className="media-modal-error" role="alert">{error}</div>}

        {mode === 'search' ? (
          <>
            <div className="media-search-row">
              <div className="media-search-input-wrap">
                <Icon name="search" size={16} className="media-search-icon" />
                <input
                  type="text"
                  aria-label="Search external media"
                  placeholder="Search anime, movies, books..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <select aria-label="Media search type" value={type} onChange={e => setType(e.target.value)}>
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
                        <span>{meta.label}</span>
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
              <input type="text" aria-label="Manual media title" value={manual.title} onChange={e => setManual(m => ({ ...m, title: e.target.value }))} placeholder="Enter title..." />
            </label>
            <div className="media-manual-row">
              <label>
                Type
                <select aria-label="Manual media type" value={manual.type} onChange={e => setManual(m => ({ ...m, type: e.target.value }))}>
                  {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <label>
                Status
                <select aria-label="Manual media status" value={manual.status} onChange={e => setManual(m => ({ ...m, status: e.target.value }))}>
                  {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <label>
                Rating
                <input type="number" aria-label="Manual media rating" min="0" max="10" step="0.5" value={manual.rating} onChange={e => setManual(m => ({ ...m, rating: e.target.value }))} placeholder="0-10" />
              </label>
            </div>
            <button className="btn primary" onClick={addManual} disabled={!manual.title.trim() || adding === 'manual'}>
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
  const [tab, setTab] = useState('edit') // 'edit' | 'match'
  const [matchQuery, setMatchQuery] = useState('')
  const [matchType, setMatchType] = useState('')
  const [matchResults, setMatchResults] = useState([])
  const [matchSearching, setMatchSearching] = useState(false)
  const [matching, setMatching] = useState(null)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const matchDebounce = useRef(null)
  const dialogRef = useRef(null)
  useModalFocus(open, onClose, dialogRef)

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
      setTab('edit')
      setMatchQuery(item.title || '')
      setMatchResults([])
      setMatching(null)
      setError('')
      setDeleteConfirm(false)
    }
  }, [item])

  const doMatchSearch = useCallback(async (q, t) => {
    if (!q || q.length < 2) { setMatchResults([]); return }
    setMatchSearching(true)
    try {
      const params = new URLSearchParams({ q })
      if (t) params.set('type', t)
      const data = await apiFetch(`/media/search?${params}`)
      setMatchResults(Array.isArray(data) ? data : [])
    } catch { setMatchResults([]) }
    finally { setMatchSearching(false) }
  }, [])

  useEffect(() => {
    if (tab !== 'match') return
    clearTimeout(matchDebounce.current)
    matchDebounce.current = setTimeout(() => doMatchSearch(matchQuery, matchType), 400)
    return () => clearTimeout(matchDebounce.current)
  }, [matchQuery, matchType, tab])

  const applyMatch = async (result) => {
    setError('')
    setMatching(result.title)
    try {
      await apiFetch(`/media/${item.id}/match`, {
        method: 'PATCH',
        body: JSON.stringify({
          type: result.type,
          coverUrl: result.coverUrl,
          metadata: result.metadata || {},
          externalIds: result.externalIds || {},
        }),
      })
      onSave()
      onClose()
    } catch (e) { setError(e.message || 'The catalog match could not be applied.') }
    finally { setMatching(null) }
  }

  const save = async () => {
    setError('')
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
    } catch (e) { setError(e.message || 'The record could not be saved.') }
    finally { setSaving(false) }
  }

  const remove = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    setError('')
    setDeleting(true)
    try {
      await apiFetch(`/media/${item.id}`, { method: 'DELETE' })
      onDelete()
      onClose()
    } catch (e) { setError(e.message || 'The record could not be deleted.') }
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
      <div ref={dialogRef} className="media-modal media-modal-edit" role="dialog" aria-modal="true" aria-labelledby="edit-series-title" onClick={e => e.stopPropagation()}>
        <div className="media-modal-header">
          <h3 id="edit-series-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name={typeMeta.icon || 'film'} size={20} />
            {item.title}
          </h3>
          <button className="media-modal-close" aria-label={`Close ${item.title}`} onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="media-modal-tabs">
          <button className={`media-tab ${tab === 'edit' ? 'active' : ''}`} onClick={() => setTab('edit')}>
            <Icon name="pen" size={16} /> Edit
          </button>
          <button className={`media-tab ${tab === 'match' ? 'active' : ''}`} onClick={() => setTab('match')}>
            <Icon name="link" size={16} /> Match
          </button>
        </div>

        {error && <div className="media-modal-error" role="alert">{error}</div>}

        {tab === 'edit' ? (
          <>
            <div className="media-edit-layout">
              {item.coverUrl && item.coverUrl.length > 1 && (
                <div className="media-edit-cover">
                  <img src={item.coverUrl} alt={item.title} />
                </div>
              )}
              <div className="media-edit-fields">
                <label>Title <input type="text" aria-label="Media title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></label>
                <div className="media-manual-row">
                  <label>Status
                    <select aria-label="Media status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </label>
                  <label>Rating
                    <input type="number" aria-label="Media rating" min="0" max="10" step="0.5" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} placeholder="0-10" />
                  </label>
                </div>
                <div className="media-manual-row">
                  <label>Start Date <input type="date" aria-label="Media start date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></label>
                  <label>End Date <input type="date" aria-label="Media end date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></label>
                </div>
                {showEpisodes && (
                  <label>
                    Episodes Watched {item.metadata?.episodes ? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--color-text-secondary)' }}>/ {item.metadata.episodes} total</span> : ''}
                    <input type="number" aria-label="Episodes watched" min="0" max={item.metadata?.episodes || undefined} value={form.episodesWatched} onChange={e => setForm(f => ({ ...f, episodesWatched: e.target.value }))} />
                  </label>
                )}
                {showChapters && (
                  <label>
                    Chapters Read {item.metadata?.chapters ? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--color-text-secondary)' }}>/ {item.metadata.chapters} total</span> : ''}
                    <input type="number" aria-label="Chapters read" min="0" max={item.metadata?.chapters || undefined} value={form.chaptersRead} onChange={e => setForm(f => ({ ...f, chaptersRead: e.target.value }))} />
                  </label>
                )}
                {showPages && (
                  <label>
                    Pages Read {item.metadata?.pages ? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--color-text-secondary)' }}>/ {item.metadata.pages} total</span> : ''}
                    <input type="number" aria-label="Pages read" min="0" max={item.metadata?.pages || undefined} value={form.pagesRead} onChange={e => setForm(f => ({ ...f, pagesRead: e.target.value }))} />
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
                      <span key={i} className="media-genre">{String(g)}</span>
                    ))}
                  </div>
                )}
                <label>Notes <textarea rows={3} aria-label="Media notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Personal notes..." /></label>
              </div>
            </div>

            <div className="media-modal-actions">
              {deleteConfirm ? (
                <div className="media-delete-confirm" role="alert">
                  <span>Delete this record permanently?</span>
                  <button className="btn subtle" onClick={() => setDeleteConfirm(false)} disabled={deleting}>Cancel</button>
                  <button className="btn danger" onClick={remove} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
                </div>
              ) : (
                <button className="btn media-delete-btn" onClick={remove} disabled={deleting}>
                  <Icon name="trash-2" size={16} /> Delete
                </button>
              )}
              <button className="btn primary" onClick={save} disabled={saving || deleteConfirm}>
                <Icon name="check" size={16} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Match tab */}
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--glass-border)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.6rem 0' }}>
                Search external databases and pick the correct match to override type, cover, and metadata.
              </p>
              <div className="media-search-row" style={{ padding: 0, border: 'none' }}>
                <div className="media-search-input-wrap" style={{ flex: 1 }}>
                  <Icon name="search" size={16} className="media-search-icon" />
                  <input
                    type="text"
                    aria-label="Search media matches"
                    placeholder="Search..."
                    value={matchQuery}
                    onChange={e => setMatchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <select aria-label="Media match type" value={matchType} onChange={e => setMatchType(e.target.value)} style={{ padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--glass-border)', background: 'var(--color-bg, #0f0f14)', color: 'var(--color-text)', fontSize: '0.82rem' }}>
                  <option value="">All</option>
                  {Object.entries(TYPE_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="media-search-results">
              {matchSearching && (
                <div className="media-search-loading">
                  <Icon name="loader" size={20} style={{ animation: 'spin 1s linear infinite' }} /> Searching...
                </div>
              )}
              {!matchSearching && matchResults.length === 0 && matchQuery.length >= 2 && (
                <div className="media-search-empty">No results found</div>
              )}
              {matchResults.map((result, i) => {
                const meta = TYPE_META[result.type] || {}
                const isApplying = matching === result.title
                return (
                  <div key={i} className="media-search-result">
                    <div className="media-search-result-cover">
                      {result.coverUrl ? <img src={result.coverUrl} alt="" /> : <Icon name={meta.icon || 'film'} size={20} />}
                    </div>
                    <div className="media-search-result-info">
                      <div className="media-search-result-title">{result.title}</div>
                      <div className="media-search-result-meta">
                        <span>{meta.label}</span>
                        {result.year && <span>{result.year}</span>}
                        {result.metadata?.mediaFormat && <span style={{ opacity: 0.7 }}>{result.metadata.mediaFormat}</span>}
                      </div>
                      {result.description && (
                        <div className="media-search-result-desc">{result.description.slice(0, 100)}...</div>
                      )}
                    </div>
                    <button
                      className="btn media-add-btn"
                      onClick={() => applyMatch(result)}
                      disabled={!!matching}
                      title="Apply this match"
                    >
                      {isApplying
                        ? <Icon name="loader" size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Icon name="check" size={16} />
                      }
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

export default function Media() {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [catalogs, setCatalogs] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [detailItem, setDetailItem] = useState(null)
  const [detailCatalog, setDetailCatalog] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [busyEpisodeId, setBusyEpisodeId] = useState(null)
  const [busyItemId, setBusyItemId] = useState(null)
  const [completionPrompt, setCompletionPrompt] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('type', filterType)
      if (filterStatus) params.set('status', filterStatus)
      if (search) params.set('search', search)
      const [dataResult, statsResult, catalogsResult] = await Promise.allSettled([
        apiFetch(`/media?${params}`),
        apiFetch('/media/stats'),
        apiFetch('/media/catalog/summaries'),
      ])
      if (dataResult.status === 'fulfilled') setItems(normalizeSeriesCollection(dataResult.value))
      else setLoadError(dataResult.reason?.message || 'The series library could not be refreshed.')
      if (statsResult.status === 'fulfilled') setStats(statsResult.value)
      if (catalogsResult.status === 'fulfilled') setCatalogs(catalogsResult.value || {})
    } catch (error) { setLoadError(error.message || 'The series library could not be refreshed.') }
    finally { setLoading(false) }
  }, [filterType, filterStatus, search])

  useEffect(() => { load() }, [load])

  const activeCount = items.filter(i => ['watching', 'reading'].includes(i.status)).length
  const completedCount = stats?.completed ?? 0
  const avgRating = stats?.averageRating
  const groups = groupSeriesByStatus(items)

  const applyCatalogView = (view) => {
    if (!view?.item?.id) return
    setCatalogs(current => ({ ...current, [view.item.id]: view }))
    setItems(current => current.map(entry => entry.id === view.item.id ? { ...entry, ...view.item } : entry))
    if (detailItem?.id === view.item.id) {
      setDetailItem(current => ({ ...current, ...view.item }))
      setDetailCatalog(view)
    }
  }

  const openDetail = async (item) => {
    setDetailItem(item)
    setDetailCatalog(catalogs[item.id] || null)
    setDetailError('')
    setDetailLoading(true)
    try {
      const view = await apiFetch(`/media/${item.id}/catalog`)
      applyCatalogView(view)
      setDetailCatalog(view)
    } catch (error) {
      setDetailError(error.message || 'Catalog details could not be loaded.')
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshCatalog = async () => {
    if (!detailItem || detailLoading) return
    setDetailLoading(true)
    setDetailError('')
    try {
      const view = await apiFetch(`/media/${detailItem.id}/catalog/sync`, { method: 'POST' })
      applyCatalogView(view)
    } catch (error) {
      setDetailError(error.message || 'Catalog synchronization failed. Existing progress is still available.')
    } finally {
      setDetailLoading(false)
    }
  }

  const toggleEpisode = async (item, episode, watched) => {
    if (!item || !episode?.id || busyEpisodeId) return
    const previous = catalogs[item.id]
    setBusyEpisodeId(episode.id)
    setDetailError('')
    try {
      const view = await apiFetch(`/media/${item.id}/episodes/${episode.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ watched }),
      })
      applyCatalogView(view)
    } catch (error) {
      if (previous) setCatalogs(current => ({ ...current, [item.id]: previous }))
      setDetailError(error.message || 'Episode progress could not be saved.')
    } finally {
      setBusyEpisodeId(null)
    }
  }

  const incrementProgress = async (item) => {
    const update = getNextProgressUpdate(item)
    if (!update || busyItemId) return
    const metadata = { ...(item.metadata || {}), [update.field]: update.value }
    setBusyItemId(item.id)
    setItems(current => current.map(entry => entry.id === item.id ? { ...entry, metadata } : entry))
    try {
      await apiFetch(`/media/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ metadata }),
      })
      if (update.completionSuggested) {
        setCompletionPrompt({ id: item.id, title: item.title })
      }
    } catch {
      setItems(current => current.map(entry => entry.id === item.id ? item : entry))
    } finally {
      setBusyItemId(null)
    }
  }

  const markCompleted = async () => {
    const prompt = completionPrompt
    if (!prompt) return
    setCompletionPrompt(null)
    setItems(current => current.map(item => item.id === prompt.id ? { ...item, status: 'completed' } : item))
    try {
      await apiFetch(`/media/${prompt.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      })
    } catch {
      await load()
    }
  }

  return (
    <div className="series-register" data-testid="series-register">
      <PageHeading
        eyebrow="Watch and reading record"
        title="Series"
        description="Continue at the exact season, episode, chapter, or release where you stopped."
        meta={`${stats?.total ?? items.length} titles · ${activeCount} active`}
        actions={<button className="record-button record-button--primary" onClick={() => setAddOpen(true)}><Icon name="plus" size={16} /> Add title</button>}
      />

      <SummaryStrip>
        <SummaryItem label="Library" value={loading ? '—' : stats?.total ?? items.length} />
        <SummaryItem label="In progress" value={loading ? '—' : activeCount} />
        <SummaryItem label="Completed" value={loading ? '—' : completedCount} />
        <SummaryItem label="Average score" value={loading || avgRating == null ? '—' : Number(avgRating).toFixed(1)} />
      </SummaryStrip>

      {loadError && <StatePanel kind="offline" title="Using the last series record" detail={loadError} action={<button className="record-button record-button--compact" onClick={load}>Retry</button>} />}

      {completionPrompt && (
        <section className="series-completion" role="status">
          <div>
            <strong>{completionPrompt.title} reached its known total.</strong>
            <span>Mark it completed, or keep the current status if more is expected.</span>
          </div>
          <div>
            <button type="button" onClick={markCompleted}>Mark completed</button>
            <button type="button" onClick={() => setCompletionPrompt(null)}>Keep active</button>
          </div>
        </section>
      )}

      <section className="record-series-filters" aria-label="Filter series library">
        <div className="record-series-filters__search">
          <Icon name="search" size={16} className="media-search-icon" />
          <input
            type="text"
            aria-label="Search media library"
            placeholder="Search library..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="record-series-filters__row">
          <span>Status</span>
          <div className="record-segmented record-segmented--compact">
            <button type="button" className={!filterStatus ? 'is-active' : ''} aria-pressed={!filterStatus} onClick={() => setFilterStatus('')}>All</button>
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <button type="button" key={key} className={filterStatus === key ? 'is-active' : ''} aria-pressed={filterStatus === key} onClick={() => setFilterStatus(filterStatus === key ? '' : key)}>{meta.label}</button>
            ))}
          </div>
        </div>
        <div className="record-series-filters__row">
          <span>Format</span>
          <div className="record-segmented record-segmented--compact">
            <button className={!filterType ? 'is-active' : ''} onClick={() => setFilterType('')} aria-pressed={!filterType}>All</button>
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <button key={key} className={filterType === key ? 'is-active' : ''} onClick={() => setFilterType(filterType === key ? '' : key)} aria-pressed={filterType === key}>
                {meta.label}{stats?.byType?.[key] != null && <span>{stats.byType[key]}</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <StatePanel kind="loading" title="Opening the series record" detail="Season catalogs and continuity are checked without hiding saved titles." />
      ) : items.length === 0 ? (
        <StatePanel kind="empty" title="No titles in this view" detail="Change the filters or add an anime release, television series, film, manga, or book." action={<button className="record-button record-button--primary" onClick={() => setAddOpen(true)}>Add first title</button>} />
      ) : (
        <div className="series-groups">
          {groups.map(group => (
            <section className="series-group" key={group.status}>
              <div className="series-group__heading">
                <h2>{STATUS_META[group.status]?.label || group.status}</h2>
                <span>{group.items.length}</span>
              </div>
              <div className="series-list">
                {group.items.map(item => (
                  <SeriesRow
                    key={item.id}
                    item={item}
                    catalog={catalogs[item.id]}
                    onOpen={openDetail}
                    onIncrement={incrementProgress}
                    onWatchEpisode={(entry, episodeId) => toggleEpisode(entry, { id: episodeId }, true)}
                    busy={busyItemId === item.id || busyEpisodeId === catalogs[item.id]?.nextEpisode?.id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AddModal open={addOpen} onClose={() => setAddOpen(false)} onSave={load} />
      <SeriesDetail
        item={detailItem}
        catalog={detailCatalog}
        loading={detailLoading}
        error={detailError}
        onClose={() => { setDetailItem(null); setDetailCatalog(null); setDetailError('') }}
        onRefresh={refreshCatalog}
        onToggleEpisode={(episode, watched) => toggleEpisode(detailItem, episode, watched)}
        onEdit={(item) => { setDetailItem(null); setEditItem(item) }}
        busyEpisodeId={busyEpisodeId}
      />
      <EditModal key={editItem?.id || 'none'} item={editItem} open={!!editItem} onClose={() => setEditItem(null)} onSave={load} onDelete={load} />

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
