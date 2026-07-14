import React from 'react'
import Icon from '../../components/icons/Icon'
import { buildContinuity, getContinuityTarget } from './seriesCatalogModel.mjs'

const POSITION_LABELS = {
  before: 'Before',
  current: 'Current release',
  after: 'Next',
  related: 'Related',
}

export default function AnimeContinuity({ item, relations = [], onOpenRelated }) {
  const continuity = buildContinuity(item, relations)
  if (continuity.length <= 1) {
    return <p className="series-detail__empty">No prequel or sequel relationships were returned for this release.</p>
  }
  return (
    <section className="anime-continuity" aria-labelledby="anime-continuity-title">
      <div className="series-detail__section-heading">
        <div>
          <span className="series-detail__kicker">Release order</span>
          <h3 id="anime-continuity-title">Series continuity</h3>
        </div>
        <span>{continuity.length} releases</span>
      </div>
      <ol className="anime-continuity__rail">
        {continuity.map((entry) => (
          <li key={`${entry.position}-${entry.id}`} className={entry.position === 'current' ? 'is-current' : ''}>
            <div className="anime-continuity__marker" aria-hidden="true" />
            <span className="anime-continuity__position">{POSITION_LABELS[entry.position]}</span>
            {entry.position === 'current' ? <strong>{entry.title}</strong> : (
              <button
                type="button"
                className="anime-continuity__link"
                disabled={!getContinuityTarget(entry)}
                onClick={() => onOpenRelated?.(entry)}
              >
                <strong>{entry.title}</strong><Icon name="arrow-right" size={15} />
              </button>
            )}
            <span>{entry.year || (entry.mediaItemId ? 'In your library' : 'Not tracked')}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
