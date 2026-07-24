import React, { useState, useRef, useCallback } from 'react'
import { apiFetch } from '../../api'
import { getTokens } from '../../auth'
import { getApiBase } from '../../config'
import { LoadingSpinner, StepIndicator, ImportProgressPanel } from '../../components/shared'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'
import { getImportAccept, getImportFileDescription } from '../../importFileTypes.mjs'
import { isNativeMobileApp } from '../../mobilePlatform'
import { streamImportProgress } from '../../importProgress.mjs'

const MEDIA_COLOR = '#7c5cff'
const IMPORT_TYPE_OPTIONS = [
  { type: 'anime', label: 'Anime', icon: 'tv' },
  { type: 'tv', label: 'TV series', icon: 'monitor' },
  { type: 'movie', label: 'Movies', icon: 'clapperboard' },
]

const SOURCES = [
  { id: 'mal-anime',  label: 'MyAnimeList (Anime)', icon: 'tv',        endpoint: '/media/import/mal/anime/preview', fileType: 'mal', desc: 'Export from MAL Settings > Account > Export' },
  { id: 'mal-manga',  label: 'MyAnimeList (Manga)', icon: 'book-open', endpoint: '/media/import/mal/manga/preview', fileType: 'mal', desc: 'Same MAL export, contains manga list' },
  { id: 'tvtime',     label: 'TVTime',              icon: 'monitor',   endpoint: '/media/import/tvtime/preview', fileType: 'tvtime', desc: 'Export from TVTime settings' },
  { id: 'goodreads',  label: 'Goodreads',           icon: 'book',      endpoint: '/media/import/goodreads/preview', fileType: 'goodreads', desc: 'My Books > Import/Export > Export Library' },
]

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Step 1: Source Select ──────────────────────────────────────

function SourceStep({ source, setSource, file, setFile, onNext }) {
  const inputRef = useRef(null)
  const nativePicker = isNativeMobileApp()

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon name="download" size={20} />
        Select Import Source
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {SOURCES.map(s => (
          <div
            key={s.id}
            onClick={() => { setSource(s); setFile(null) }}
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${source?.id === s.id ? MEDIA_COLOR : 'var(--glass-border)'}`,
              background: source?.id === s.id ? `${MEDIA_COLOR}15` : 'var(--color-bg-elevated)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Icon name={s.icon} size={24} style={{ color: source?.id === s.id ? MEDIA_COLOR : 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'block' }} />
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{s.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {source && (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${file ? 'var(--color-success)' : 'var(--glass-border)'}`,
            borderRadius: 'var(--radius-lg)',
            background: file ? 'var(--color-success-muted)' : 'var(--color-bg-elevated)',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: '1rem',
          }}
        >
          <Icon name={file ? 'check' : 'upload-cloud'} size={40} style={{ color: file ? 'var(--color-success)' : MEDIA_COLOR, marginBottom: '0.5rem', display: 'block' }} />
          {file ? (
            <>
              <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>{file.name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{formatFileSize(file.size)}</div>
            </>
          ) : (
            <div style={{ color: 'var(--color-text-muted)' }}>Click to select {getImportFileDescription(source.fileType)} file</div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={getImportAccept(source.fileType, { native: nativePicker })}
            style={{ display: 'none' }}
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
        </div>
      )}

      <button className="btn" onClick={onNext} disabled={!source || !file} style={{ opacity: source && file ? 1 : 0.4, background: MEDIA_COLOR, color: '#000' }}>
        <Icon name="search" size={18} /> Preview Import
      </button>
    </div>
  )
}

// ─── Step 2: Preview + Conflicts ────────────────────────────────

function PreviewStep({ preview, loading, error, onNext, onBack }) {
  const [actions, setActions] = useState({}) // title -> 'skip' | 'replace'
  const [bulkAction, setBulkAction] = useState('') // for "set all"
  const [includedTypes, setIncludedTypes] = useState([])

  React.useEffect(() => {
    if (!preview?.previewId) return
    setIncludedTypes(Object.keys(preview.typeCounts || {}))
  }, [preview?.previewId])

  if (loading) return (
    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
      <LoadingSpinner size={40} />
      <div style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>Analysing export file...</div>
    </div>
  )
  if (error) return (
    <div className="card">
      <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
      <button className="btn" onClick={onBack} style={{ background: 'var(--glass-border)' }}><Icon name="arrow-left" size={18} /> Back</button>
    </div>
  )
  if (!preview) return null

  const newItems = preview.items || []
  const duplicates = preview.duplicates || []
  const selectedTypes = new Set(includedTypes)
  const selectedNewItems = newItems.filter(item => selectedTypes.has(item.type))
  const selectedDuplicates = duplicates.filter(dup => selectedTypes.has(dup.incoming.type))
  const selectedNewCount = includedTypes.reduce((count, type) => count + (preview.newTypeCounts?.[type] || 0), 0)
  const selectedDuplicateCount = includedTypes.reduce((count, type) => count + (preview.duplicateTypeCounts?.[type] || 0), 0)
  const selectedTotal = includedTypes.reduce((count, type) => count + (preview.typeCounts?.[type] || 0), 0)
  const hasDuplicates = selectedDuplicates.length > 0
  const isTvTime = preview.source === 'tvtime'

  const getAction = (title) => actions[title] || 'skip'

  const applyBulk = (action) => {
    setBulkAction(action)
    const newActions = {}
    selectedDuplicates.forEach(d => { newActions[d.incoming.title] = action })
    setActions(newActions)
  }

  const handleNext = () => {
    onNext(actions, includedTypes)
  }

  const replaceCount = selectedDuplicates.filter(dup => getAction(dup.incoming.title) === 'replace').length
  const progressUpdateCount = isTvTime ? selectedDuplicateCount - replaceCount : 0
  const canImport = includedTypes.length > 0 && (selectedNewCount > 0 || replaceCount > 0 || progressUpdateCount > 0)
  const toggleType = (type) => {
    setIncludedTypes(current => current.includes(type)
      ? current.filter(item => item !== type)
      : [...current, type])
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {preview.source === 'tvtime' && (
        <section className="card" style={{ marginBottom: '1rem' }} aria-labelledby="tvtime-import-types">
          <div style={{ marginBottom: '0.9rem' }}>
            <h3 id="tvtime-import-types" style={{ marginBottom: '0.25rem' }}>What to import</h3>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
              Choose the parts of this TV Time library you want to merge. Nothing excluded will be created, replaced, or synchronized.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem' }}>
            {IMPORT_TYPE_OPTIONS.map(option => {
              const checked = includedTypes.includes(option.type)
              const available = (preview.typeCounts?.[option.type] || 0) > 0
              return (
                <label key={option.type} style={{
                  minHeight: 58,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.7rem',
                  padding: '0.7rem 0.8rem',
                  border: `1px solid ${checked ? MEDIA_COLOR : 'var(--glass-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: checked ? `${MEDIA_COLOR}15` : 'var(--color-bg-elevated)',
                  cursor: available ? 'pointer' : 'not-allowed',
                  opacity: available ? 1 : 0.5,
                }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleType(option.type)}
                    disabled={!available}
                    style={{ inlineSize: 18, blockSize: 18, accentColor: MEDIA_COLOR }}
                  />
                  <Icon name={option.icon} size={18} style={{ color: checked ? MEDIA_COLOR : 'var(--color-text-muted)' }} />
                  <span style={{ flex: 1, fontWeight: 650, fontSize: '0.84rem' }}>{option.label}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{preview.typeCounts?.[option.type] || 0}</span>
                </label>
              )
            })}
          </div>
          {(preview.progressSummary?.reconstructable > 0 || preview.progressSummary?.needsReview > 0) && (
            <div className="alert-warning" style={{ marginTop: '0.8rem' }}>
              Episode progress: {preview.progressSummary.reconstructable || 0} up-to-date titles will be rebuilt from aired episodes.
              {(preview.progressSummary.needsReview || 0) > 0 && ` ${preview.progressSummary.needsReview} partial-progress titles have no episode count in this export and will keep their Watching or Paused state.`}
            </div>
          )}
          {selectedTotal < preview.totalItems && (
            <p style={{ margin: '0.7rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
              {preview.totalItems - selectedTotal} {preview.totalItems - selectedTotal === 1 ? 'title' : 'titles'} excluded from this import.
            </p>
          )}
        </section>
      )}

      {/* New items */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="plus-circle" size={20} style={{ color: 'var(--color-success)' }} />
          New Items
          <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>({selectedNewCount})</span>
        </h3>
        {selectedNewCount === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', padding: '0.5rem 0' }}>No new items to import - all already exist in your library.</div>
        ) : (
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {selectedNewItems.slice(0, 30).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.35rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: MEDIA_COLOR, textTransform: 'uppercase', width: 50 }}>{item.type}</span>
                <span style={{ flex: 1, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{item.status}</span>
              </div>
            ))}
            {selectedNewCount > selectedNewItems.length && (
              <div style={{ textAlign: 'center', padding: '0.4rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                ...and {selectedNewCount - selectedNewItems.length} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Duplicates */}
      {hasDuplicates && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="copy" size={20} style={{ color: '#fbbf24' }} />
            Already in Library
            <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>({selectedDuplicateCount})</span>
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
            {isTvTime
              ? <>Choose <strong>Keep & merge</strong> to preserve your record while adding TV Time episode progress, or <strong>replace</strong> to overwrite it with the export.</>
              : <>These titles already exist. Choose to <strong>skip</strong> (keep existing) or <strong>replace</strong> (overwrite with imported data) for each.</>}
          </p>

          {/* Bulk actions */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <button
              className="btn"
              onClick={() => applyBulk('skip')}
              style={{
                fontSize: '0.8rem', padding: '0.3rem 0.7rem',
                background: bulkAction === 'skip' ? 'var(--glass-border)' : 'transparent',
                border: '1px solid var(--glass-border)',
              }}
            >
              {isTvTime ? 'Keep & merge all' : 'Skip All'}
            </button>
            <button
              className="btn"
              onClick={() => applyBulk('replace')}
              style={{
                fontSize: '0.8rem', padding: '0.3rem 0.7rem',
                background: bulkAction === 'replace' ? `${MEDIA_COLOR}33` : 'transparent',
                border: `1px solid ${bulkAction === 'replace' ? MEDIA_COLOR : 'var(--glass-border)'}`,
                color: bulkAction === 'replace' ? MEDIA_COLOR : undefined,
              }}
            >
              Replace All
            </button>
          </div>

          <div style={{ maxHeight: 350, overflowY: 'auto' }}>
            {selectedDuplicates.map((dup, i) => {
              const action = getAction(dup.incoming.title)
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.5rem 0.4rem',
                  borderBottom: '1px solid var(--glass-border)',
                  opacity: action === 'skip' && !isTvTime ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dup.incoming.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.75rem', marginTop: '0.15rem' }}>
                      <span>Existing: <strong>{dup.existing.status}</strong>{dup.existing.rating != null ? ` (${dup.existing.rating})` : ''}</span>
                      <span style={{ color: MEDIA_COLOR }}>Import: <strong>{dup.incoming.status}</strong>{dup.incoming.rating != null ? ` (${dup.incoming.rating})` : ''}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                    <button
                      className="btn"
                      onClick={() => setActions(a => ({ ...a, [dup.incoming.title]: 'skip' }))}
                      style={{
                        fontSize: '0.72rem', padding: '0.2rem 0.5rem',
                        background: action === 'skip' ? 'var(--glass-border)' : 'transparent',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      {isTvTime ? 'Keep & merge' : 'Skip'}
                    </button>
                    <button
                      className="btn"
                      onClick={() => setActions(a => ({ ...a, [dup.incoming.title]: 'replace' }))}
                      style={{
                        fontSize: '0.72rem', padding: '0.2rem 0.5rem',
                        background: action === 'replace' ? `${MEDIA_COLOR}33` : 'transparent',
                        border: `1px solid ${action === 'replace' ? MEDIA_COLOR : 'var(--glass-border)'}`,
                        color: action === 'replace' ? MEDIA_COLOR : undefined,
                      }}
                    >
                      Replace
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={onBack}>
          <Icon name="arrow-left" size={18} /> Back
        </button>
        <button
          className="btn"
          onClick={handleNext}
          disabled={!canImport}
          style={{ background: MEDIA_COLOR, color: '#000', opacity: canImport ? 1 : 0.4 }}
        >
          <Icon name="play" size={18} />
          Import {selectedNewCount} new{replaceCount > 0 ? ` + replace ${replaceCount}` : ''}{progressUpdateCount > 0 ? ` + update progress ${progressUpdateCount}` : ''}
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Progress ───────────────────────────────────────────

function ProgressStep({ previewId, onComplete, onError }) {
  const [progress, setProgress] = useState({ stage: 'starting', progress: 0, current: 0, total: 0, message: 'Starting...' })
  const [errorMsg, setErrorMsg] = useState(null)
  const [events, setEvents] = useState([])

  React.useEffect(() => {
    if (!previewId) return
    let cancelled = false
    const controller = new AbortController()
    const run = async () => {
      try {
        const { accessToken } = getTokens()
        const base = getApiBase()
        await streamImportProgress({
          url: `${base}/media/import/execute/${previewId}`,
          accessToken,
          signal: controller.signal,
          onEvent: (data) => {
            if (cancelled) return
            setProgress(data)
            setEvents((items) => [...items, data].slice(-20))
            if (data.stage === 'complete') {
              onComplete(data.summary || data)
              controller.abort()
            }
            if (data.stage === 'error') {
              const message = data.error || data.message || 'Import error'
              setErrorMsg(message)
              onError(message)
              controller.abort()
            }
          }
        })
      } catch (e) {
        if (!cancelled && e.name !== 'AbortError') { setErrorMsg(e.message); onError(e.message) }
      }
    }
    run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [previewId])

  const STAGE_ICONS = { starting: 'hourglass', creating: 'plus-circle', replacing: 'refresh-cw', catalog: 'database', complete: 'check-circle', error: 'alert-circle' }
  const STAGE_LABELS = { starting: 'Preparing...', creating: 'Creating items...', replacing: 'Updating duplicates...', catalog: 'Synchronizing catalog...', complete: 'Complete!', error: 'Error' }

  return (
    <ImportProgressPanel
      progress={progress}
      events={events}
      errorMsg={errorMsg}
      stageIcons={STAGE_ICONS}
      stageLabels={STAGE_LABELS}
      color={MEDIA_COLOR}
    />
  )
}

// ─── Step 4: Summary ────────────────────────────────────────────

function SummaryStep({ summary, onReset }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
      <Icon name="check-circle" size={56} style={{ color: 'var(--color-success)', marginBottom: '0.75rem', display: 'block' }} />
      <h3 style={{ marginBottom: '0.25rem' }}>Import Complete!</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        <strong style={{ color: 'var(--color-success)' }}>{summary?.created ?? 0}</strong> created
        {(summary?.replaced ?? 0) > 0 && <>, <strong style={{ color: MEDIA_COLOR }}>{summary.replaced}</strong> replaced</>}
        , <strong>{summary?.skipped ?? 0}</strong> skipped
      </p>
      {(summary?.catalogEligible ?? 0) > 0 && (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '-0.75rem 0 1.5rem' }}>
          Catalog: <strong style={{ color: 'var(--color-success)' }}>{summary.catalogSynced ?? 0}</strong> enriched
          {(summary?.catalogFailed ?? 0) > 0 && <>, <strong style={{ color: 'var(--color-warning)' }}>{summary.catalogFailed}</strong> need retry</>}
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={onReset}><Icon name="refresh-cw" size={18} /> Import More</button>
        <a href="/media" className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Icon name="clapperboard" size={18} /> Go to Library
        </a>
      </div>
    </div>
  )
}

// ─── Main ───────────────────────────────────────────────────────

export default function MediaImport() {
  const STEPS = ['Source', 'Preview', 'Import', 'Done']
  const [step, setStep] = useState(1)
  const [source, setSource] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [importError, setImportError] = useState(null)

  const handlePreview = async () => {
    if (!source || !file) return
    setPreviewLoading(true)
    setPreviewError(null)
    setStep(2)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const data = await apiFetch(source.endpoint, { method: 'POST', body: formData })
      setPreview(data)
    } catch (e) { setPreviewError(e.message || 'Preview failed') }
    finally { setPreviewLoading(false) }
  }

  const handleStartImport = async (duplicateActions, includedTypes) => {
    setImportError(null)
    setSummary(null)

    // Send duplicate resolution to backend
    if (preview?.previewId) {
      try {
        await apiFetch('/media/import/resolve', {
          method: 'POST',
          body: JSON.stringify({ previewId: preview.previewId, actions: duplicateActions, includedTypes }),
        })
      } catch (e) {
        setImportError(e.message)
        return
      }
    }

    setStep(3)
  }

  const handleReset = () => {
    setStep(1); setSource(null); setFile(null); setPreview(null)
    setPreviewError(null); setPreviewLoading(false); setSummary(null); setImportError(null)
  }

  return (
    <>
      <PageHeader title="Import Media" />
      <StepIndicator current={step} steps={STEPS} />

      {step === 1 && <SourceStep source={source} setSource={setSource} file={file} setFile={setFile} onNext={handlePreview} />}
      {step === 2 && <PreviewStep preview={preview} loading={previewLoading} error={previewError} onNext={handleStartImport} onBack={() => setStep(1)} />}
      {step === 3 && (
        <>
          {importError && <div className="alert-error" style={{ marginBottom: '1rem' }}>{importError}</div>}
          <ProgressStep previewId={preview?.previewId} onComplete={d => { setSummary(d); setStep(4) }} onError={setImportError} />
          {importError && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={() => setStep(2)}><Icon name="arrow-left" size={18} /> Back</button>
              <button className="btn" onClick={handleReset}><Icon name="refresh-cw" size={18} /> Start Over</button>
            </div>
          )}
        </>
      )}
      {step === 4 && <SummaryStep summary={summary} onReset={handleReset} />}
    </>
  )
}
