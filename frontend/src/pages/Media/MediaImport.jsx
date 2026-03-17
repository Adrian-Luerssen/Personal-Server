import React, { useState, useRef, useCallback } from 'react'
import { apiFetch } from '../../api'
import { getTokens } from '../../auth'
import { getApiBase } from '../../config'
import { LoadingSpinner, StepIndicator, ProgressBar } from '../../components/shared'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'

const MEDIA_COLOR = '#f472b6'

const SOURCES = [
  { id: 'mal-anime',  label: 'MyAnimeList (Anime)', icon: 'tv',        endpoint: '/media/import/mal/anime/preview', accept: '.xml,.gz,.xml.gz', desc: 'Export from MAL Settings > Account > Export' },
  { id: 'mal-manga',  label: 'MyAnimeList (Manga)', icon: 'book-open', endpoint: '/media/import/mal/manga/preview', accept: '.xml,.gz,.xml.gz', desc: 'Same MAL export, contains manga list' },
  { id: 'tvtime',     label: 'TVTime',              icon: 'monitor',   endpoint: '/media/import/tvtime/preview',    accept: '.csv', desc: 'Export from TVTime settings' },
  { id: 'goodreads',  label: 'Goodreads',           icon: 'book',      endpoint: '/media/import/goodreads/preview', accept: '.csv', desc: 'My Books > Import/Export > Export Library' },
]

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Step 1: Source Select ──────────────────────────────────────

function SourceStep({ source, setSource, file, setFile, onNext }) {
  const inputRef = useRef(null)

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
            <div style={{ color: 'var(--color-text-muted)' }}>Click to select {source.accept} file</div>
          )}
          <input ref={inputRef} type="file" accept={source.accept} style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
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
  const hasDuplicates = duplicates.length > 0

  const getAction = (title) => actions[title] || 'skip'

  const applyBulk = (action) => {
    setBulkAction(action)
    const newActions = {}
    duplicates.forEach(d => { newActions[d.incoming.title] = action })
    setActions(newActions)
  }

  const handleNext = () => {
    onNext(actions)
  }

  const replaceCount = Object.values(actions).filter(a => a === 'replace').length

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* New items */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="plus-circle" size={20} style={{ color: 'var(--color-success)' }} />
          New Items
          <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>({preview.newCount})</span>
        </h3>
        {preview.newCount === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', padding: '0.5rem 0' }}>No new items to import - all already exist in your library.</div>
        ) : (
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {newItems.slice(0, 30).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.35rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: MEDIA_COLOR, textTransform: 'uppercase', width: 50 }}>{item.type}</span>
                <span style={{ flex: 1, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{item.status}</span>
              </div>
            ))}
            {preview.newCount > 30 && (
              <div style={{ textAlign: 'center', padding: '0.4rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                ...and {preview.newCount - 30} more
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
            <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>({duplicates.length})</span>
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
            These titles already exist. Choose to <strong>skip</strong> (keep existing) or <strong>replace</strong> (overwrite with imported data) for each.
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
              Skip All
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
            {duplicates.map((dup, i) => {
              const action = getAction(dup.incoming.title)
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.5rem 0.4rem',
                  borderBottom: '1px solid var(--glass-border)',
                  opacity: action === 'skip' ? 0.5 : 1,
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
                      Skip
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
          disabled={preview.newCount === 0 && replaceCount === 0}
          style={{ background: MEDIA_COLOR, color: '#000', opacity: (preview.newCount === 0 && replaceCount === 0) ? 0.4 : 1 }}
        >
          <Icon name="play" size={18} />
          Import {preview.newCount} new{replaceCount > 0 ? ` + replace ${replaceCount}` : ''}
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Progress ───────────────────────────────────────────

function ProgressStep({ previewId, onComplete, onError }) {
  const [progress, setProgress] = useState({ stage: 'starting', progress: 0, current: 0, total: 0, message: 'Starting...' })
  const [errorMsg, setErrorMsg] = useState(null)

  React.useEffect(() => {
    if (!previewId) return
    let cancelled = false
    const run = async () => {
      try {
        const { accessToken } = getTokens()
        const base = getApiBase()
        const res = await fetch(`${base}/media/import/execute/${previewId}`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'text/event-stream' },
        })
        if (!res.ok) throw new Error(`Import failed (${res.status})`)
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done || cancelled) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop()
          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            try {
              const data = JSON.parse(line.slice(5).trim())
              if (!cancelled) {
                setProgress(data)
                if (data.stage === 'complete') { onComplete(data.summary || data); return }
                if (data.stage === 'error') { setErrorMsg(data.error || data.message); onError(data.error); return }
              }
            } catch {}
          }
        }
      } catch (e) {
        if (!cancelled) { setErrorMsg(e.message); onError(e.message) }
      }
    }
    run()
    return () => { cancelled = true }
  }, [previewId])

  const isError = errorMsg
  const isDone = progress.stage === 'complete'

  return (
    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
      <Icon
        name={isError ? 'alert-circle' : isDone ? 'check-circle' : 'clapperboard'}
        size={56}
        style={{ color: isError ? 'var(--color-error)' : isDone ? 'var(--color-success)' : MEDIA_COLOR, marginBottom: '1rem', display: 'block', animation: (!isError && !isDone) ? 'spin 2s linear infinite' : 'none' }}
      />
      <h3 style={{ marginBottom: '0.5rem' }}>{isError ? 'Import Failed' : isDone ? 'Import Complete!' : 'Importing...'}</h3>
      {errorMsg ? (
        <div className="alert-error" style={{ marginTop: '1rem', textAlign: 'left' }}>{errorMsg}</div>
      ) : (
        <>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>{progress.message}</p>
          <ProgressBar value={progress.progress} color={MEDIA_COLOR} />
          {progress.total > 0 && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>{progress.current?.toLocaleString()} / {progress.total?.toLocaleString()}</div>}
        </>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
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

  const handleStartImport = async (duplicateActions) => {
    setImportError(null)
    setSummary(null)

    // Send duplicate resolution to backend
    if (preview?.duplicateCount > 0 && Object.keys(duplicateActions).length > 0) {
      try {
        await apiFetch('/media/import/resolve', {
          method: 'POST',
          body: JSON.stringify({ previewId: preview.previewId, actions: duplicateActions }),
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
      <PageHeader icon="download" title="Import Media" accentColor={MEDIA_COLOR} />
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
