import React, { useState, useRef, useCallback } from 'react'
import { apiFetch } from '../../api'
import { LoadingSpinner, StepIndicator, ProgressBar } from '../../components/shared'

const FINANCE_COLOR = '#fbbf24'
const STEPS = ['File', 'Preview', 'Import', 'Done']

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatCurrency(amount, currency = '€') {
  const formatted = Math.abs(amount).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${amount < 0 ? '-' : ''}${currency}${formatted}`
}

// ─── Step 1: File Select ─────────────────────────────────────────────────────

function FileSelectStep({ file, setFile, onNext }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (f) => {
    if (f) setFile(f)
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
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="material-icons">upload_file</span>
        Select Cashew Backup
      </h3>

      {/* Drag & drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          border: `2px dashed ${dragging ? FINANCE_COLOR : file ? 'var(--color-success)' : 'var(--glass-border)'}`,
          borderRadius: 'var(--radius-lg)',
          background: dragging
            ? `${FINANCE_COLOR}22`
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
        <span
          className="material-icons"
          style={{
            fontSize: 48,
            color: file ? 'var(--color-success)' : FINANCE_COLOR,
            marginBottom: '0.75rem',
            display: 'block',
          }}
        >
          {file ? 'check_circle' : 'cloud_upload'}
        </span>

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
              Drag & drop your Cashew backup here
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              or click to browse · .json, .backup
            </div>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".json,.backup"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {/* Instructions */}
      <details style={{ marginBottom: '1.5rem' }}>
        <summary style={{
          cursor: 'pointer',
          fontSize: '0.9rem',
          color: 'var(--color-text-secondary)',
          userSelect: 'none',
          padding: '0.5rem 0',
        }}>
          <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>
            help_outline
          </span>
          How to export from Cashew
        </summary>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          <li>Open Cashew on your device</li>
          <li>Go to Settings → Backup</li>
          <li>Create a backup file</li>
          <li>Transfer the backup file to this computer</li>
        </ol>
      </details>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          className="btn"
          onClick={onNext}
          disabled={!file}
          style={{ opacity: file ? 1 : 0.4, background: FINANCE_COLOR, color: '#000' }}
        >
          <span className="material-icons" style={{ fontSize: 18 }}>search</span>
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
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <LoadingSpinner size={40} />
        <div style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
          Analysing your Cashew backup…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
        <button className="btn" onClick={onBack} style={{ background: 'var(--glass-border)' }}>
          <span className="material-icons" style={{ fontSize: 18 }}>arrow_back</span>
          Back
        </button>
      </div>
    )
  }

  if (!preview) return null

  const counts = preview.counts || {}

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="material-icons">preview</span>
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
          <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>
            storage
          </span>
          {preview.file?.name || 'Cashew backup'}
        </span>
        {preview.dateRange?.earliest && (
          <span>
            <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>
              date_range
            </span>
            {preview.dateRange.earliest} → {preview.dateRange.latest}
          </span>
        )}
      </div>

      {/* Counts table */}
      <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Type</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
              <th style={{ ...thStyle, textAlign: 'right', color: 'var(--color-success)' }}>New</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Existing</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Wallets', icon: 'account_balance', counts: counts.wallets },
              { label: 'Categories', icon: 'category', counts: counts.categories },
              { label: 'Transactions', icon: 'receipt_long', counts: counts.transactions },
            ].filter(r => r.counts).map(({ label, icon, counts: c }) => (
              <tr key={label}>
                <td style={tdStyle}>
                  <span className="material-icons" style={{ fontSize: 15, verticalAlign: 'middle', marginRight: 6, color: FINANCE_COLOR }}>
                    {icon}
                  </span>
                  {label}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{(c.total || 0).toLocaleString()}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-success)', fontWeight: 700 }}>{(c.new || 0).toLocaleString()}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-text-muted)' }}>{(c.existing || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary stats */}
      {preview.summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}>
          <div style={statBox}>
            <div style={statLabel}>Total Income</div>
            <div style={{ ...statValue, color: 'var(--color-success)' }}>
              {formatCurrency(preview.summary.totalIncome || 0)}
            </div>
          </div>
          <div style={statBox}>
            <div style={statLabel}>Total Expenses</div>
            <div style={{ ...statValue, color: 'var(--color-error)' }}>
              {formatCurrency(preview.summary.totalExpenses || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {preview.warnings?.length > 0 && (
        <div className="alert-warning" style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>⚠ Warnings</div>
          {preview.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: '0.9rem' }}>{w}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={onBack}>
          <span className="material-icons" style={{ fontSize: 18 }}>arrow_back</span>
          Back
        </button>
        <button className="btn" onClick={onNext} style={{ background: FINANCE_COLOR, color: '#000' }}>
          <span className="material-icons" style={{ fontSize: 18 }}>play_arrow</span>
          Start Import
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Progress ────────────────────────────────────────────────────────

function ProgressStep({ previewId, onComplete, onError }) {
  const [progress, setProgress] = useState({ stage: 'starting', progress: 0, message: 'Starting import...' })
  const [errorMsg, setErrorMsg] = useState(null)

  React.useEffect(() => {
    if (!previewId) return

    let cancelled = false

    const run = async () => {
      try {
        const result = await apiFetch(`/finance/import/cashew/execute`, {
          method: 'POST',
          body: JSON.stringify({ previewId }),
        })

        if (!cancelled) {
          setProgress({ stage: 'complete', progress: 100, message: 'Complete!' })
          onComplete(result.summary || result)
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e.message)
          onError(e.message)
        }
      }
    }

    run()
    return () => { cancelled = true }
  }, [previewId])

  const isError = errorMsg
  const isDone = progress.stage === 'complete'

  return (
    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
      <span
        className="material-icons"
        style={{
          fontSize: 56,
          color: isError ? 'var(--color-error)' : isDone ? 'var(--color-success)' : FINANCE_COLOR,
          marginBottom: '1rem',
          display: 'block',
          animation: (!isError && !isDone) ? 'spin 2s linear infinite' : 'none',
        }}
      >
        {isError ? 'error' : isDone ? 'check_circle' : 'sync'}
      </span>

      <h3 style={{ marginBottom: '0.5rem' }}>
        {isError ? 'Import Failed' : isDone ? 'Import Complete!' : 'Importing…'}
      </h3>

      {errorMsg ? (
        <div className="alert-error" style={{ marginTop: '1rem', textAlign: 'left' }}>{errorMsg}</div>
      ) : (
        <>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            {progress.message}
          </p>
          <ProgressBar value={progress.progress} color={FINANCE_COLOR} />
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ─── Step 4: Summary ─────────────────────────────────────────────────────────

function SummaryStep({ summary, onReset }) {
  if (!summary) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <span className="material-icons" style={{ fontSize: 56, color: 'var(--color-success)', marginBottom: '1rem', display: 'block' }}>
          check_circle
        </span>
        <h3>Import Complete!</h3>
        <p style={{ color: 'var(--color-text-secondary)' }}>Your Cashew data has been imported.</p>
        <button className="btn" onClick={onReset} style={{ marginTop: '1.5rem' }}>
          Import Another File
        </button>
      </div>
    )
  }

  const rows = []
  const addRow = (label, icon, obj) => {
    if (!obj) return
    rows.push({ label, icon, imported: obj.imported ?? obj.created ?? 0, skipped: obj.skipped ?? obj.existing ?? 0 })
  }
  addRow('Wallets', 'account_balance', summary.wallets)
  addRow('Categories', 'category', summary.categories)
  addRow('Transactions', 'receipt_long', summary.transactions)

  const totalImported = rows.reduce((s, r) => s + r.imported, 0)

  return (
    <div className="card">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <span className="material-icons" style={{ fontSize: 56, color: 'var(--color-success)', marginBottom: '0.75rem', display: 'block' }}>
          check_circle
        </span>
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
                <th style={thStyle}>Type</th>
                <th style={{ ...thStyle, textAlign: 'right', color: 'var(--color-success)' }}>Imported</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Skipped</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, icon, imported, skipped }) => (
                <tr key={label}>
                  <td style={tdStyle}>
                    <span className="material-icons" style={{ fontSize: 15, verticalAlign: 'middle', marginRight: 6, color: FINANCE_COLOR }}>
                      {icon}
                    </span>
                    {label}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-success)', fontWeight: 700 }}>
                    {imported.toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-text-muted)' }}>
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
          <span className="material-icons" style={{ fontSize: 18 }}>refresh</span>
          Import Another File
        </button>
        <a href="/finance" className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="material-icons" style={{ fontSize: 18 }}>account_balance_wallet</span>
          Go to Finance
        </a>
      </div>
    </div>
  )
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export default function FinanceImport() {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [importError, setImportError] = useState(null)

  const handlePreview = async () => {
    if (!file) return
    setPreviewLoading(true)
    setPreviewError(null)
    setStep(2)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const data = await apiFetch('/finance/import/cashew/preview', {
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

  const handleStartImport = () => {
    setImportError(null)
    setSummary(null)
    setStep(3)
  }

  const handleComplete = (summaryData) => {
    setSummary(summaryData)
    setStep(4)
  }

  const handleImportError = (msg) => {
    setImportError(msg)
  }

  const handleReset = () => {
    setStep(1)
    setFile(null)
    setPreview(null)
    setPreviewError(null)
    setPreviewLoading(false)
    setSummary(null)
    setImportError(null)
  }

  return (
    <>
      <h2>
        <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 8, color: FINANCE_COLOR }}>
          file_download
        </span>
        Import Cashew Data
      </h2>

      <StepIndicator current={step} steps={STEPS} />

      {step === 1 && (
        <FileSelectStep file={file} setFile={setFile} onNext={handlePreview} />
      )}

      {step === 2 && (
        <PreviewStep
          preview={preview}
          loading={previewLoading}
          error={previewError}
          onNext={handleStartImport}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <>
          {importError && (
            <div className="alert-error" style={{ marginBottom: '1rem' }}>{importError}</div>
          )}
          <ProgressStep
            previewId={preview?.previewId}
            onComplete={handleComplete}
            onError={handleImportError}
          />
          {importError && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={() => setStep(2)}>
                <span className="material-icons" style={{ fontSize: 18 }}>arrow_back</span>
                Back to Preview
              </button>
              <button className="btn" onClick={handleReset}>
                <span className="material-icons" style={{ fontSize: 18 }}>refresh</span>
                Start Over
              </button>
            </div>
          )}
        </>
      )}

      {step === 4 && (
        <SummaryStep summary={summary} onReset={handleReset} />
      )}
    </>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '0.5rem 0.75rem',
  fontSize: '0.8rem',
  color: 'var(--color-text-muted)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '1px solid var(--glass-border)',
}

const tdStyle = {
  padding: '0.6rem 0.75rem',
  fontSize: '0.9rem',
  borderBottom: '1px solid var(--glass-border)',
}

const statBox = {
  padding: '0.75rem',
  background: 'var(--color-bg-elevated)',
  borderRadius: 'var(--radius-md)',
}

const statLabel = {
  fontSize: '0.75rem',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '0.25rem',
}

const statValue = {
  fontSize: '1.1rem',
  fontWeight: 700,
}
