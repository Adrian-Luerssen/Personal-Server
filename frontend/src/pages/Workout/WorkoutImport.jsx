import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api, apiFetch } from '../../api'
import { LoadingSpinner, Modal } from './WorkoutShared'

export default function WorkoutImport() {
  const { sidebarCollapsed } = useOutletContext() || {}
  
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function handleFileChange(e) {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
      setSuccess('')
    }
  }

  async function handleImport() {
    if (!file) {
      setError('Please select a file')
      return
    }
    
    setImporting(true)
    setError('')
    setSuccess('')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await apiFetch('/workout/import/fitnotes', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Import failed: ${response.status}`)
      }
      
      const result = await response.json()
      setSuccess('Import completed successfully! Your data has been synced.')
      setFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('fitnotes-file')
      if (fileInput) fileInput.value = ''
    } catch (e) {
      setError(e.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="content" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
      <h1>📥 Import FitNotes Data</h1>

      <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(125,211,252,0.1)' }}>
        <h3 style={{ marginBottom: '.75rem' }}>About FitNotes Import</h3>
        <p style={{ opacity: .9, lineHeight: 1.6, marginBottom: '.75rem' }}>
          Import your historical workout data from FitNotes (Android). This tool will:
        </p>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, opacity: .9 }}>
          <li>Create or update exercises and categories</li>
          <li>Import workout sessions and sets with all details</li>
          <li>Sync bodyweight entries</li>
          <li>Automatically deduplicate existing data</li>
        </ul>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.5)', marginBottom: '1rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="card" style={{ borderColor: 'rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.1)', marginBottom: '1rem' }}>
          <strong>Success!</strong> {success}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Upload FitNotes Database</h3>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '.5rem', fontSize: '.9rem', opacity: .9 }}>
            Select FitNotes .db file
          </label>
          <input 
            id="fitnotes-file"
            type="file"
            accept=".db,.sqlite,.sqlite3,.fitnotes"
            onChange={handleFileChange}
            disabled={importing}
            style={{
              display: 'block',
              width: '100%',
              padding: '.75rem',
              border: '2px dashed rgba(125,211,252,0.3)',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.03)',
              cursor: importing ? 'not-allowed' : 'pointer'
            }}
          />
          {file && (
            <div style={{ marginTop: '.5rem', fontSize: '.9rem', opacity: .7 }}>
              Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        <div className="card" style={{ background: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.3)', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '.5rem' }}>⚠️ Important Notes</div>
          <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.6, fontSize: '.9rem', opacity: .9 }}>
            <li>The import process may take a few minutes for large databases</li>
            <li>Duplicate data will be automatically skipped</li>
            <li>Existing exercises/categories with matching names will be reused</li>
            <li>Make sure you have a backup of your FitNotes data before importing</li>
          </ul>
        </div>

        <button 
          className="btn"
          onClick={handleImport}
          disabled={!file || importing}
          style={{ 
            opacity: (!file || importing) ? 0.5 : 1,
            cursor: (!file || importing) ? 'not-allowed' : 'pointer'
          }}
        >
          {importing ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <LoadingSpinner size={16} />
              Importing...
            </span>
          ) : (
            '📥 Start Import'
          )}
        </button>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '.75rem' }}>How to Export from FitNotes</h3>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: 1.8, opacity: .9 }}>
          <li>Open FitNotes on your Android device</li>
          <li>Tap the menu (three dots) → <strong>Backup</strong></li>
          <li>Choose <strong>Export Database</strong></li>
          <li>Save the <code>.db</code> file to your device</li>
          <li>Transfer the file to this computer (email, cloud, USB, etc.)</li>
          <li>Upload it using the form above</li>
        </ol>
      </div>
    </div>
  )
}
