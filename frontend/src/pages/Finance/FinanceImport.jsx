import React, { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../../api'
import { LoadingSpinner, StepIndicator, ProgressBar } from '../../components/shared'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'

const FINANCE_COLOR = '#fbbf24'

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

function FileSelectStep({ file, setFile, onNext, t }) {
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
        <Icon name="upload" size={20} />
        {t('financeImport.selectFile')}
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
        <Icon
          name={file ? 'check-circle' : 'cloud-upload'}
          size={48}
          style={{
            color: file ? 'var(--color-success)' : FINANCE_COLOR,
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
              {formatFileSize(file.size)}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              {t('financeImport.dropFile')}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              .json, .backup, .sqlite
            </div>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".json,.backup,.sqlite"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          className="btn"
          onClick={onNext}
          disabled={!file}
          style={{ opacity: file ? 1 : 0.4, background: FINANCE_COLOR, color: '#000' }}
        >
          <Icon name="search" size={18} />
          {t('financeImport.preview')}
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: Preview ─────────────────────────────────────────────────────────

function PreviewStep({ preview, loading, error, onNext, onBack, t }) {
  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <LoadingSpinner size={40} />
        <div style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
          {t('common.loading')}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
        <button className="btn" onClick={onBack} style={{ background: 'var(--glass-border)' }}>
          <Icon name="arrow-left" size={18} />
          {t('common.back')}
        </button>
      </div>
    )
  }

  if (!preview) return null

  const counts = preview.counts || {}

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon name="eye" size={20} />
        {t('financeImport.preview')}
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
          <Icon name="hard-drive" size={16} style={{ marginRight: 4 }} />
          {preview.file?.name || 'Cashew backup'}
        </span>
        {preview.dateRange?.earliest && (
          <span>
            <Icon name="calendar-range" size={16} style={{ marginRight: 4 }} />
            {t('financeImport.dateRange')}: {preview.dateRange.earliest} → {preview.dateRange.latest}
          </span>
        )}
      </div>

      {/* Counts table */}
      <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>{t('finance.type')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
              <th style={{ ...thStyle, textAlign: 'right', color: 'var(--color-success)' }}>{t('financeImport.new')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>{t('financeImport.existing')}</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: t('financeImport.wallets'), icon: 'landmark', counts: counts.wallets },
              { label: t('financeImport.categories'), icon: 'tag', counts: counts.categories },
              { label: t('financeImport.transactions'), icon: 'receipt', counts: counts.transactions },
            ].filter(r => r.counts).map(({ label, icon, counts: c }) => (
              <tr key={label}>
                <td style={tdStyle}>
                  <Icon name={icon} size={15} style={{ marginRight: 6, color: FINANCE_COLOR }} />
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

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={onBack}>
          <Icon name="arrow-left" size={18} />
          {t('common.back')}
        </button>
        <button className="btn" onClick={onNext} style={{ background: FINANCE_COLOR, color: '#000' }}>
          <Icon name="play" size={18} />
          {t('financeImport.startImport')}
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Progress ────────────────────────────────────────────────────────

function ProgressStep({ previewId, onComplete, onError, t }) {
  const [progress, setProgress] = useState({ stage: 'starting', progress: 0, message: t('financeImport.importing') })
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
          setProgress({ stage: 'complete', progress: 100, message: t('financeImport.importComplete') })
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
      <Icon
        name={isError ? 'alert-circle' : isDone ? 'check-circle' : 'refresh-cw'}
        size={56}
        style={{
          color: isError ? 'var(--color-error)' : isDone ? 'var(--color-success)' : FINANCE_COLOR,
          marginBottom: '1rem',
          display: 'block',
          animation: (!isError && !isDone) ? 'spin 2s linear infinite' : 'none',
        }}
      />

      <h3 style={{ marginBottom: '0.5rem' }}>
        {isError ? t('financeImport.importFailed') : isDone ? t('financeImport.importComplete') : t('financeImport.importing')}
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

function SummaryStep({ summary, onReset, t }) {
  if (!summary) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <Icon name="check-circle" size={56} style={{ color: 'var(--color-success)', marginBottom: '1rem', display: 'block' }} />
        <h3>{t('financeImport.importComplete')}</h3>
        <button className="btn" onClick={onReset} style={{ marginTop: '1.5rem' }}>
          {t('common.back')}
        </button>
      </div>
    )
  }

  const rows = []
  const addRow = (label, icon, obj) => {
    if (!obj) return
    rows.push({ label, icon, imported: obj.imported ?? obj.created ?? 0, skipped: obj.skipped ?? obj.existing ?? 0 })
  }
  addRow(t('financeImport.wallets'), 'landmark', summary.wallets)
  addRow(t('financeImport.categories'), 'tag', summary.categories)
  addRow(t('financeImport.transactions'), 'receipt', summary.transactions)

  const totalImported = rows.reduce((s, r) => s + r.imported, 0)

  return (
    <div className="card">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <Icon name="check-circle" size={56} style={{ color: 'var(--color-success)', marginBottom: '0.75rem', display: 'block' }} />
        <h3 style={{ marginBottom: '0.25rem' }}>{t('financeImport.importComplete')}</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          {totalImported.toLocaleString()} records imported
        </p>
      </div>

      {rows.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>{t('finance.type')}</th>
                <th style={{ ...thStyle, textAlign: 'right', color: 'var(--color-success)' }}>Imported</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Skipped</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, icon, imported, skipped }) => (
                <tr key={label}>
                  <td style={tdStyle}>
                    <Icon name={icon} size={15} style={{ marginRight: 6, color: FINANCE_COLOR }} />
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
          <Icon name="refresh-cw" size={18} />
          {t('common.back')}
        </button>
        <a href="/finance" className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Icon name="wallet" size={18} />
          {t('nav.finance')}
        </a>
      </div>
    </div>
  )
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export default function FinanceImport() {
  const { t } = useTranslation()
  const STEPS = [t('financeImport.selectFile'), t('financeImport.preview'), t('financeImport.importing'), 'Done']
  
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
      setPreviewError(e.message || t('financeImport.importFailed'))
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
      <PageHeader icon="upload" title="Import" accentColor="#fbbf24" />

      <StepIndicator current={step} steps={STEPS} />

      {step === 1 && (
        <FileSelectStep file={file} setFile={setFile} onNext={handlePreview} t={t} />
      )}

      {step === 2 && (
        <PreviewStep
          preview={preview}
          loading={previewLoading}
          error={previewError}
          onNext={handleStartImport}
          onBack={() => setStep(1)}
          t={t}
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
            t={t}
          />
          {importError && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={() => setStep(2)}>
                <Icon name="arrow-left" size={18} />
                {t('common.back')}
              </button>
              <button className="btn" onClick={handleReset}>
                <Icon name="refresh-cw" size={18} />
                {t('common.clear')}
              </button>
            </div>
          )}
        </>
      )}

      {step === 4 && (
        <SummaryStep summary={summary} onReset={handleReset} t={t} />
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
