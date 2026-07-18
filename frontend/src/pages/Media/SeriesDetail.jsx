import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../../components/icons/Icon'
import AnimeContinuity from './AnimeContinuity'
import SeriesSeasonList from './SeriesSeasonList'
import {
  getCatalogProgressLabel,
  getNextEpisodeAction,
  summarizeSeriesMetadata,
} from './seriesCatalogModel.mjs'

export default function SeriesDetail({
  item,
  catalog,
  loading,
  error,
  onClose,
  onRefresh,
  onToggleEpisode,
  onEdit,
  onUpdateRating,
  onOpenRelated,
  onAddPreview,
  busyEpisodeId,
}) {
  const dialogRef = useRef(null)
  const firstRegularSeason = catalog?.seasons?.find((season) => season.number > 0)?.number
  const [selectedSeason, setSelectedSeason] = useState(firstRegularSeason ?? catalog?.seasons?.[0]?.number ?? 0)
  const [rating, setRating] = useState(item?.rating ?? '')
  const [ratingSaving, setRatingSaving] = useState(false)
  const metadata = useMemo(() => summarizeSeriesMetadata(item), [item])
  const nextAction = getNextEpisodeAction(catalog)
  const isMovie = item?.type === 'movie'

  useEffect(() => {
    setSelectedSeason(firstRegularSeason ?? catalog?.seasons?.[0]?.number ?? 0)
    setRating(item?.rating ?? '')
  }, [item?.id, firstRegularSeason])

  const saveRating = async () => {
    if (item?.isCatalogPreview || ratingSaving) return
    const parsed = rating === '' ? null : Number(rating)
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0 || parsed > 10)) {
      setRating(item?.rating ?? '')
      return
    }
    if (parsed === (item?.rating == null ? null : Number(item.rating))) return
    setRatingSaving(true)
    try { await onUpdateRating?.(parsed) }
    catch { setRating(item?.rating ?? '') }
    finally { setRatingSaving(false) }
  }

  useEffect(() => {
    if (!item) return undefined
    const previous = document.activeElement
    const focusDialog = window.requestAnimationFrame(() => dialogRef.current?.querySelector('button')?.focus())
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusDialog)
      window.removeEventListener('keydown', handleKeyDown)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [item, onClose])

  if (!item) return null

  return createPortal(
    <div className="series-detail-overlay" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="series-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="series-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="series-detail__hero">
          <div className="series-detail__cover">
            {item.coverUrl ? <img src={item.coverUrl} alt="" /> : <Icon name="clapperboard" size={30} />}
          </div>
          <div className="series-detail__intro">
            <span className="series-detail__kicker">{item.type === 'anime' ? 'Anime release' : isMovie ? 'Film' : 'Television series'}</span>
            <h2 id="series-detail-title">{item.title}</h2>
            <div className="series-detail__facts" aria-label="Title facts">
              {metadata.year && <span>{metadata.year}</span>}
              {metadata.format && <span>{metadata.format}</span>}
              {metadata.studio && <span>{metadata.studio}</span>}
              {metadata.providerScore != null && <span>{metadata.providerScore} provider score</span>}
              {metadata.airingStatus && <span>{metadata.airingStatus}</span>}
            </div>
            {!isMovie && <strong className="series-detail__progress">{getCatalogProgressLabel(catalog, item)}</strong>}
            {!item.isCatalogPreview && (
              <label className="series-detail__rating">
                <span>Your rating</span>
                <input
                  type="number"
                  aria-label="Your rating"
                  min="0"
                  max="10"
                  step="0.5"
                  value={rating}
                  disabled={ratingSaving}
                  placeholder="—"
                  onChange={(event) => setRating(event.target.value)}
                  onBlur={saveRating}
                  onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
                />
                <span>/ 10</span>
              </label>
            )}
          </div>
          <button type="button" className="series-detail__close" onClick={onClose} aria-label={`Close ${item.title}`}>
            <Icon name="x" size={20} />
          </button>
        </header>

        <div className="series-detail__actions">
          {nextAction && !nextAction.upcoming && (
            <button
              type="button"
              className="series-detail__primary"
              disabled={busyEpisodeId === nextAction.episodeId}
              onClick={() => onToggleEpisode({ id: nextAction.episodeId }, true)}
            >
              <Icon name="play" size={17} />
              <span>{nextAction.label}<small>{nextAction.detail}</small></span>
            </button>
          )}
          {nextAction?.upcoming && (
            <div className="series-detail__upcoming">
              <span>{nextAction.label}</span>
              <strong>{nextAction.detail}</strong>
              {nextAction.airDate && <span>{nextAction.airDate}</span>}
            </div>
          )}
          {item.isCatalogPreview ? (
            <button type="button" className="series-detail__primary" onClick={() => onAddPreview?.(item)} disabled={loading}>
              <Icon name="plus" size={16} /> Add to library
            </button>
          ) : <>
            <button type="button" onClick={onRefresh} disabled={loading}>
              <Icon name="refresh-cw" size={16} /> {loading ? 'Syncing…' : isMovie ? 'Refresh details' : 'Refresh catalog'}
            </button>
            <button type="button" onClick={() => onEdit(item)}>
              <Icon name="pen" size={16} /> Edit record
            </button>
          </>}
        </div>

        {error && <div className="series-detail__error" role="alert">{error}</div>}
        {loading && !catalog ? <div className="series-detail__loading">Loading catalog…</div> : (
          <div className="series-detail__content">
            {metadata.synopsis && (
              <section className="series-detail__about">
                <span className="series-detail__kicker">About</span>
                <p>{metadata.synopsis}</p>
                {!!metadata.genres.length && <div>{metadata.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>}
              </section>
            )}
            {(metadata.releaseStartDate || metadata.releaseEndDate) && (
              <section className="series-detail__release-dates" aria-label="Release dates">
                <span className="series-detail__kicker">Release dates</span>
                <dl>
                  <div><dt>First aired</dt><dd>{metadata.releaseStartDate || 'Unknown'}</dd></div>
                  <div><dt>Final aired</dt><dd>{metadata.releaseEndDate || (metadata.airingStatus === 'Currently Airing' ? 'Still airing' : 'Unknown')}</dd></div>
                </dl>
              </section>
            )}
            {item.type === 'tv' && (
              <SeriesSeasonList
                seasons={catalog?.seasons || []}
                selectedSeason={selectedSeason}
                onSelectSeason={setSelectedSeason}
                onToggleEpisode={onToggleEpisode}
                busyEpisodeId={busyEpisodeId}
                nextEpisodeId={catalog?.nextEpisode?.id}
              />
            )}
            {item.type === 'anime' && <AnimeContinuity item={item} relations={catalog?.relations || []} onOpenRelated={onOpenRelated} />}
          </div>
        )}
      </section>
    </div>,
    document.body,
  )
}
