import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../../api'
import Icon from '../../components/icons/Icon'
import PageHeader from '../../components/PageHeader'
import InlineConfirmation from '../../components/record/InlineConfirmation'

const MEDIA_COLOR = '#7c5cff'

export default function MediaSettings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'general'

  const [reclassifying, setReclassifying] = useState(false)
  const [reclassifyResult, setReclassifyResult] = useState(null)
  const [confirmingReclassify, setConfirmingReclassify] = useState(false)

  const handleReclassify = async () => {
    setReclassifying(true)
    setReclassifyResult(null)
    try {
      const result = await apiFetch('/media/reclassify', { method: 'POST' })
      setReclassifyResult({ success: true, count: result.reset })
    } catch (e) {
      setReclassifyResult({ success: false, error: e.message })
    } finally {
      setReclassifying(false)
      setConfirmingReclassify(false)
    }
  }

  return (
    <>
      <PageHeader title="Media Settings" />

      <div className="card">
        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="tags" size={20} style={{ color: MEDIA_COLOR }} />
          Classification
        </h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.6 }}>
          Items are automatically classified by checking external databases (Jikan for anime/manga, TMDB for TV/movies, OpenLibrary for books).
          If items are misclassified, you can reset and re-run the classification process.
        </p>

        {!confirmingReclassify && <button
          className="btn"
          onClick={() => setConfirmingReclassify(true)}
          disabled={reclassifying}
          style={{
            background: 'transparent',
            border: `1px solid ${MEDIA_COLOR}`,
            color: MEDIA_COLOR,
          }}
        >
          <Icon name={reclassifying ? 'loader' : 'refresh-cw'} size={18} style={reclassifying ? { animation: 'spin 1s linear infinite' } : {}} />
          {reclassifying ? 'Reclassifying...' : 'Reset & Reclassify All'}
        </button>}

        {confirmingReclassify && (
          <InlineConfirmation
            busy={reclassifying}
            message="Reset classification for every enriched item and fetch its metadata again?"
            confirmLabel="Reset and reclassify"
            onCancel={() => setConfirmingReclassify(false)}
            onConfirm={handleReclassify}
          />
        )}

        {reclassifyResult && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.6rem 0.8rem',
              borderRadius: 'var(--radius-md)',
              background: reclassifyResult.success ? 'var(--color-success-muted)' : 'var(--color-error-muted, rgba(248,113,113,0.1))',
              fontSize: '0.85rem',
              color: reclassifyResult.success ? 'var(--color-success)' : 'var(--color-error)',
            }}
          >
            {reclassifyResult.success
              ? `Reset ${reclassifyResult.count} items. They will be re-enriched over the next few minutes.`
              : `Error: ${reclassifyResult.error}`
            }
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
