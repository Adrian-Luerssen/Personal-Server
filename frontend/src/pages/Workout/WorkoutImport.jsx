import React, { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch } from '../../api'
import { getTokens } from '../../auth'
import { getApiBase } from '../../config'
import { LoadingSpinner, StepIndicator, ImportProgressPanel } from '../../components/shared'
import Icon from '../../components/icons/Icon'
import { getImportAccept, getImportFileDescription } from '../../importFileTypes.mjs'
import { isNativeMobileApp } from '../../mobilePlatform'
import { streamImportProgress } from '../../importProgress.mjs'

// ─── Styles ──────────────────────────────────────────────────────────────────

const card = {
  marginBottom: '1.5rem',
}

const sectionTitle = {
  marginBottom: '1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

const btnRow = {
  display: 'flex',
  gap: '0.75rem',
  marginTop: '1.5rem',
  flexWrap: 'wrap',
}

const tableTh = {
  textAlign: 'left',
  padding: '0.5rem 0.75rem',
  fontSize: '0.8rem',
  color: 'var(--color-text-muted)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '1px solid var(--glass-border)',
}

const tableTd = {
  padding: '0.6rem 0.75rem',
  fontSize: '0.9rem',
  borderBottom: '1px solid var(--glass-border)',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STEPS = ['File', 'Preview', 'Options', 'Import', 'Done']

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Step 1: File Select ─────────────────────────────────────────────────────

function FileSelectStep({ file, setFile, onNext }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const fileDescription = getImportFileDescription('fitnotes')

  const handleFile = (f) => {
    if (f) { setFile(f) }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }, [])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  return (
    <div className="card" style={card}>
      <h3 style={sectionTitle}>
        <Icon name="upload" size={20} />
        Select FitNotes Database
      </h3>

      {/* Drag & drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          border: `2px dashed ${dragging ? 'var(--color-accent)' : file ? 'var(--color-success)' : 'var(--glass-border)'}`,
          borderRadius: 'var(--radius-lg)',
          background: dragging
            ? 'var(--color-accent-muted)'
            : file
            ? 'var(--color-success-muted)'
            : 'var(--color-bg-elevated)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          marginBottom: '1rem',
        }}
      >
        <Icon
          name={file ? 'check' : 'upload-cloud'}
          size={48}
          style={{
            color: file ? 'var(--color-success)' : 'var(--color-accent)',
            marginBottom: '0.75rem',
            display: 'block',
          }}
        />

        {file ? (
          <>
            <div style={{ fontWeight: 700, color: 'var(--color-success)', marginBottom: '0.25rem' }}>
              {file.name}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {formatFileSize(file.size)} · Click to change
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              Drag & drop your .db file here
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              or click to browse · {fileDescription}
            </div>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={getImportAccept('fitnotes', { native: isNativeMobileApp() })}
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {/* How to export instructions */}
      <details style={{ marginBottom: '1.5rem' }}>
        <summary style={{
          cursor: 'pointer',
          fontSize: '0.9rem',
          color: 'var(--color-text-secondary)',
          userSelect: 'none',
          padding: '0.5rem 0',
        }}>
          <Icon name="help-circle" size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          How to export from FitNotes
        </summary>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          <li>Open FitNotes on your Android device</li>
          <li>Tap the menu (⋮) → <strong>Backup</strong></li>
          <li>Choose <strong>Export Database</strong></li>
          <li>Transfer the <code>.db</code> file to this computer</li>
        </ol>
      </details>

      <div style={btnRow}>
        <button
          className="btn"
          onClick={onNext}
          disabled={!file}
          style={{ opacity: file ? 1 : 0.4 }}
        >
          <Icon name="search" size={18} />
          Preview Import
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: Preview ─────────────────────────────────────────────────────────

function PreviewStep({ preview, loading, error, onNext, onBack }) {
  if (loading) {
    return (
      <div className="card" style={{ ...card, textAlign: 'center', padding: '3rem' }}>
        <LoadingSpinner size={40} />
        <div style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
          Analysing your FitNotes database…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card" style={card}>
        <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
        <button className="btn" onClick={onBack} style={{ background: 'var(--glass-border)' }}>
          <Icon name="arrow-left" size={18} />
          Back
        </button>
      </div>
    )
  }

  if (!preview) return null

  const rows = [
    { label: 'Categories', icon: 'tag',       counts: preview.counts.categories },
    { label: 'Exercises',  icon: 'dumbbell',  counts: preview.counts.exercises },
    { label: 'Sessions',   icon: 'calendar',  counts: preview.counts.sessions },
    { label: 'Sets',       icon: 'list',      counts: preview.counts.sets },
    { label: 'Bodyweight', icon: 'scale',     counts: preview.counts.bodyweight },
  ]

  return (
    <div className="card" style={card}>
      <h3 style={sectionTitle}>
        <Icon name="eye" size={20} />
        Import Preview
      </h3>

      {/* File info */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        marginBottom: '1.25rem',
        padding: '0.75rem 1rem',
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.85rem',
        color: 'var(--color-text-secondary)',
      }}>
        <span>
          <Icon name="hard-drive" size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {preview.file.name}
        </span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          {formatFileSize(preview.file.size)}
        </span>
        {preview.dateRange.earliest && (
          <span>
            <Icon name="calendar" size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {preview.dateRange.earliest} → {preview.dateRange.latest}
          </span>
        )}
      </div>

      {/* Counts table */}
      <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={tableTh}>Type</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>Total</th>
              <th style={{ ...tableTh, textAlign: 'right', color: 'var(--color-success)' }}>New</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>Existing</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, icon, counts }) => (
              <tr key={label}>
                <td style={tableTd}>
                  <Icon name={icon} size={15} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--color-accent)' }} />
                  {label}
                </td>
                <td style={{ ...tableTd, textAlign: 'right', fontWeight: 600 }}>{counts.total.toLocaleString()}</td>
                <td style={{ ...tableTd, textAlign: 'right', color: 'var(--color-success)', fontWeight: 700 }}>{counts.new.toLocaleString()}</td>
                <td style={{ ...tableTd, textAlign: 'right', color: 'var(--color-text-muted)' }}>{counts.existing.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top exercises */}
      {preview.topExercises?.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
            Top Exercises
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {preview.topExercises.slice(0, 8).map(ex => (
              <span key={ex.name} style={{
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-accent-muted)',
                color: 'var(--color-accent)',
                fontSize: '0.8rem',
              }}>
                {ex.name}
                <span style={{ color: 'var(--color-text-muted)', marginLeft: 4 }}>×{ex.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {preview.warnings?.length > 0 && (
        <div className="alert-warning" style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Warnings</div>
          {preview.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: '0.9rem' }}>{w}</div>
          ))}
        </div>
      )}

      <div style={btnRow}>
        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={onBack}>
          <Icon name="arrow-left" size={18} />
          Back
        </button>
        <button className="btn" onClick={onNext} disabled={preview.counts.sessions.new === 0 && preview.counts.exercises.new === 0}>
          <Icon name="sliders-horizontal" size={18} />
          Configure Options
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Options ─────────────────────────────────────────────────────────

function OptionsStep({ options, setOptions, preview, onNext, onBack }) {
  const toggle = (key) => setOptions(o => ({ ...o, [key]: !o[key] }))

  const ToggleRow = ({ label, icon, optKey, disabled }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-elevated)',
        marginBottom: '0.5rem',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onClick={() => !disabled && toggle(optKey)}
    >
      <Icon name={icon} size={20} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '0.95rem' }}>{label}</span>
      {/* Toggle switch */}
      <div style={{
        width: 40,
        height: 22,
        borderRadius: 'var(--radius-full)',
        background: options[optKey] ? 'var(--color-accent)' : 'var(--glass-border)',
        position: 'relative',
        transition: 'background var(--transition-fast)',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute',
          top: 3,
          left: options[optKey] ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left var(--transition-fast)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </div>
    </div>
  )

  return (
    <div className="card" style={card}>
      <h3 style={sectionTitle}>
        <Icon name="sliders-horizontal" size={20} />
        Import Options
      </h3>

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          What to import
        </div>
        <ToggleRow label="Categories" icon="tag" optKey="importCategories"
          disabled={preview?.counts.categories.new === 0} />
        <ToggleRow label="Exercises" icon="dumbbell" optKey="importExercises"
          disabled={preview?.counts.exercises.new === 0} />
        <ToggleRow label="Workout Sessions & Sets" icon="calendar" optKey="importSessions"
          disabled={preview?.counts.sessions.new === 0} />
        <ToggleRow label="Bodyweight Entries" icon="scale" optKey="importBodyweight"
          disabled={preview?.counts.bodyweight.new === 0} />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          Conflict handling
        </div>
        <ToggleRow label="Overwrite existing data (use imported values)" icon="refresh-cw" optKey="overwriteExisting" />
      </div>

      {preview?.dateRange.earliest && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-info-muted)',
          fontSize: '0.85rem',
          color: 'var(--color-text-secondary)',
          marginBottom: '1rem',
        }}>
          <Icon name="info" size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Data spans <strong>{preview.dateRange.earliest}</strong> → <strong>{preview.dateRange.latest}</strong>. All dates will be imported.
        </div>
      )}

      <div style={btnRow}>
        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={onBack}>
          <Icon name="arrow-left" size={18} />
          Back
        </button>
        <button className="btn" onClick={onNext}>
          <Icon name="play" size={18} />
          Start Import
        </button>
      </div>
    </div>
  )
}

// ─── Step 4: Progress (SSE) ───────────────────────────────────────────────────

const STAGE_LABELS = {
  starting:    'Preparing…',
  categories:  'Importing categories…',
  exercises:   'Importing exercises…',
  sessions:    'Importing sessions…',
  bodyweight:  'Importing bodyweight…',
  complete:    'Complete!',
  error:       'Error',
}

const STAGE_ICONS = {
  starting:    'hourglass',
  categories:  'tag',
  exercises:   'dumbbell',
  sessions:    'calendar',
  bodyweight:  'scale',
  complete:    'check',
  error:       'alert-circle',
}

function ProgressStep({ previewId, options, onComplete, onError }) {
  const [progress, setProgress] = useState({ stage: 'starting', progress: 0, current: 0, total: 0, message: '' })
  const [errorMsg, setErrorMsg] = useState(null)
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!previewId) return

    let cancelled = false
    const controller = new AbortController()

    const run = async () => {
      try {
        const { accessToken } = getTokens()
        const base = getApiBase()
        const params = new URLSearchParams({
          importCategories: String(options.importCategories),
          importExercises: String(options.importExercises),
          importSessions: String(options.importSessions),
          importBodyweight: String(options.importBodyweight),
          overwriteExisting: String(options.overwriteExisting),
        })

        const url = `${base}/workout/import/fitnotes/execute/${previewId}?${params}`
        await streamImportProgress({
          url,
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
        if (!cancelled && e.name !== 'AbortError') {
          setErrorMsg(e.message)
          onError(e.message)
        }
      }
    }

    run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [previewId, options])

  return (
    <ImportProgressPanel
      progress={progress}
      events={events}
      errorMsg={errorMsg}
      stageIcons={STAGE_ICONS}
      stageLabels={STAGE_LABELS}
    />
  )

}

// ─── Step 5: Summary ──────────────────────────────────────────────────────────

function SummaryStep({ summary, onReset }) {
  if (!summary) {
    return (
      <div className="card" style={{ ...card, textAlign: 'center', padding: '3rem' }}>
        <Icon name="check" size={56} style={{ color: 'var(--color-success)', marginBottom: '1rem', display: 'block' }} />
        <h3>Import Complete!</h3>
        <p style={{ color: 'var(--color-text-secondary)' }}>Your FitNotes data has been imported.</p>
        <button className="btn" onClick={onReset} style={{ marginTop: '1.5rem' }}>
          Import Another File
        </button>
      </div>
    )
  }

  // Build summary rows from whatever the server returns
  const rows = []
  const addRow = (label, icon, obj) => {
    if (!obj) return
    rows.push({ label, icon, imported: obj.imported ?? obj.created ?? 0, skipped: obj.skipped ?? obj.existing ?? 0 })
  }
  addRow('Categories',    'tag',       summary.categories)
  addRow('Exercises',     'dumbbell',  summary.exercises)
  addRow('Sessions',      'calendar',  summary.sessions)
  addRow('Sets',          'list',      summary.sets)
  addRow('Bodyweight',    'scale',     summary.bodyweight)

  const totalImported = rows.reduce((s, r) => s + r.imported, 0)

  return (
    <div className="card" style={card}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <Icon name="check" size={56} style={{ color: 'var(--color-success)', marginBottom: '0.75rem', display: 'block' }} />
        <h3 style={{ marginBottom: '0.25rem' }}>Import Complete!</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Successfully imported <strong style={{ color: 'var(--color-success)' }}>{totalImported.toLocaleString()}</strong> records
        </p>
      </div>

      {rows.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableTh}>Type</th>
                <th style={{ ...tableTh, textAlign: 'right', color: 'var(--color-success)' }}>Imported</th>
                <th style={{ ...tableTh, textAlign: 'right' }}>Skipped</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, icon, imported, skipped }) => (
                <tr key={label}>
                  <td style={tableTd}>
                    <Icon name={icon} size={15} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--color-accent)' }} />
                    {label}
                  </td>
                  <td style={{ ...tableTd, textAlign: 'right', color: 'var(--color-success)', fontWeight: 700 }}>
                    {imported.toLocaleString()}
                  </td>
                  <td style={{ ...tableTd, textAlign: 'right', color: 'var(--color-text-muted)' }}>
                    {skipped.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={onReset}>
          <Icon name="refresh-cw" size={18} />
          Import Another File
        </button>
        <a href="/workout" className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Icon name="dumbbell" size={18} />
          Go to Workouts
        </a>
      </div>
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function WorkoutImport() {
  const [step, setStep]       = useState(1)
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError]     = useState(null)
  const [options, setOptions] = useState({
    importCategories: true,
    importExercises:  true,
    importSessions:   true,
    importBodyweight: true,
    overwriteExisting: false,
  })
  const [summary, setSummary] = useState(null)
  const [importError, setImportError] = useState(null)

  // ── Step 1 → 2: upload & preview ──
  const handlePreview = async () => {
    if (!file) return
    setPreviewLoading(true)
    setPreviewError(null)
    setStep(2)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const data = await apiFetch('/workout/import/fitnotes/preview', {
        method: 'POST',
        body: formData,
      })
      setPreview(data)
    } catch (e) {
      setPreviewError(e.message || 'Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }

  // ── Step 3 → 4: start import ──
  const handleStartImport = () => {
    setImportError(null)
    setSummary(null)
    setStep(4)
  }

  // ── Step 4 → 5: complete ──
  const handleComplete = (summaryData) => {
    setSummary(summaryData)
    setStep(5)
  }

  const handleImportError = (msg) => {
    setImportError(msg)
    // Stay on step 4 to show the error
  }

  // ── Reset wizard ──
  const handleReset = () => {
    setStep(1)
    setFile(null)
    setPreview(null)
    setPreviewError(null)
    setPreviewLoading(false)
    setSummary(null)
    setImportError(null)
    setOptions({
      importCategories: true,
      importExercises:  true,
      importSessions:   true,
      importBodyweight: true,
      overwriteExisting: false,
    })
  }

  return (
    <>
      <h2>
        <Icon name="download" size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Import FitNotes Data
      </h2>

      <StepIndicator current={step} steps={STEPS} />

      {step === 1 && (
        <FileSelectStep
          file={file}
          setFile={setFile}
          onNext={handlePreview}
        />
      )}

      {step === 2 && (
        <PreviewStep
          preview={preview}
          loading={previewLoading}
          error={previewError}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <OptionsStep
          options={options}
          setOptions={setOptions}
          preview={preview}
          onNext={handleStartImport}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <>
          {importError && (
            <div className="alert-error" style={{ marginBottom: '1rem' }}>{importError}</div>
          )}
          <ProgressStep
            previewId={preview?.previewId}
            options={options}
            onComplete={handleComplete}
            onError={handleImportError}
          />
          {importError && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={() => setStep(3)}>
                <Icon name="arrow-left" size={18} />
                Back to Options
              </button>
              <button className="btn" onClick={handleReset}>
                <Icon name="refresh-cw" size={18} />
                Start Over
              </button>
            </div>
          )}
        </>
      )}

      {step === 5 && (
        <SummaryStep
          summary={summary}
          onReset={handleReset}
        />
      )}
    </>
  )
}
