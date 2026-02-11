import React, { useState } from 'react'
import { apiFetch } from '../../api'
import { LoadingSpinner } from '../../components/shared'

export default function WorkoutImport() {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function handleFileChange(e) {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) { setFile(selectedFile); setError(''); setSuccess('') }
  }

  // BUG FIX B2: apiFetch already returns parsed data, so remove response.ok / response.json()
  async function handleImport() {
    if (!file) { setError('Please select a file'); return }
    setImporting(true); setError(''); setSuccess('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      await apiFetch('/workout/import/fitnotes', { method: 'POST', body: formData })
      setSuccess('Import completed successfully! Your data has been synced.')
      setFile(null)
      const fileInput = document.getElementById('fitnotes-file')
      if (fileInput) fileInput.value = ''
    } catch (e) { setError(e.message || 'Import failed') }
    finally { setImporting(false) }
  }

  return (
    <>
      <h2><span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 8 }}>file_download</span>Import FitNotes Data</h2>

      <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--color-info-muted)' }}>
        <h3 style={{ marginBottom: '.75rem' }}>About FitNotes Import</h3>
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '.75rem' }}>
          Import your historical workout data from FitNotes (Android). This tool will:
        </p>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
          <li>Create or update exercises and categories</li>
          <li>Import workout sessions and sets with all details</li>
          <li>Sync bodyweight entries</li>
          <li>Automatically deduplicate existing data</li>
        </ul>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Upload FitNotes Database</h3>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', color: 'var(--color-text-secondary)' }}>Select FitNotes .db file</label>
          <input
            id="fitnotes-file"
            type="file"
            accept=".db,.sqlite,.sqlite3,.fitnotes"
            onChange={handleFileChange}
            disabled={importing}
            style={{ display: 'block', width: '100%', padding: '.75rem', border: '2px dashed var(--glass-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-accent-muted)', cursor: importing ? 'not-allowed' : 'pointer' }}
          />
          {file && (
            <div style={{ marginTop: '.5rem', fontSize: '.9rem', color: 'var(--color-text-muted)' }}>
              Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        <div className="alert-warning" style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '.5rem' }}>Important Notes</div>
          <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.6, fontSize: '.9rem' }}>
            <li>The import process may take a few minutes for large databases</li>
            <li>Duplicate data will be automatically skipped</li>
            <li>Existing exercises/categories with matching names will be reused</li>
            <li>Make sure you have a backup of your FitNotes data before importing</li>
          </ul>
        </div>

        <button className="btn" onClick={handleImport} disabled={!file || importing} style={{ opacity: (!file || importing) ? 0.5 : 1, cursor: (!file || importing) ? 'not-allowed' : 'pointer' }}>
          {importing ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><LoadingSpinner size={16} />Importing...</span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><span className="material-icons" style={{ fontSize: 18 }}>file_download</span>Start Import</span>
          )}
        </button>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '.75rem' }}>How to Export from FitNotes</h3>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
          <li>Open FitNotes on your Android device</li>
          <li>Tap the menu (three dots) &rarr; <strong>Backup</strong></li>
          <li>Choose <strong>Export Database</strong></li>
          <li>Save the <code>.db</code> file to your device</li>
          <li>Transfer the file to this computer (email, cloud, USB, etc.)</li>
          <li>Upload it using the form above</li>
        </ol>
      </div>
    </>
  )
}
