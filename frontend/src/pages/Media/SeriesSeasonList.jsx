import React from 'react'
import Icon from '../../components/icons/Icon'
import { formatEpisodeCode } from './seriesCatalogModel.mjs'

export default function SeriesSeasonList({
  seasons = [],
  selectedSeason,
  onSelectSeason,
  onToggleEpisode,
  busyEpisodeId,
  nextEpisodeId,
}) {
  if (!seasons.length) {
    return <p className="series-detail__empty">No episode catalog has been synchronized yet.</p>
  }
  const active = seasons.find((season) => season.number === selectedSeason) || seasons.find((season) => season.number > 0) || seasons[0]

  return (
    <section className="series-seasons" aria-labelledby="series-seasons-title">
      <div className="series-detail__section-heading">
        <div>
          <span className="series-detail__kicker">Episode guide</span>
          <h3 id="series-seasons-title">Seasons</h3>
        </div>
        <span>{active?.episodes?.filter((episode) => episode.watched).length || 0} / {active?.episodes?.length || active?.episodeCount || 0}</span>
      </div>
      <div className="series-season-tabs" role="tablist" aria-label="Seasons">
        {seasons.map((season) => (
          <button
            key={season.id}
            type="button"
            role="tab"
            aria-selected={season.id === active?.id}
            className={season.id === active?.id ? 'is-active' : ''}
            onClick={() => onSelectSeason(season.number)}
          >
            {season.number === 0 ? 'Specials' : `Season ${season.number}`}
          </button>
        ))}
      </div>
      <div className="series-episode-list" role="list">
        {(active?.episodes || []).map((episode) => (
          <article
            key={episode.id}
            className={`series-episode ${episode.id === nextEpisodeId ? 'is-next' : ''}`}
            role="listitem"
          >
            <button
              type="button"
              className="series-episode__check"
              aria-label={`${episode.watched ? 'Mark unwatched' : 'Mark watched'}: ${formatEpisodeCode(episode)} ${episode.title}`}
              aria-pressed={episode.watched}
              disabled={busyEpisodeId === episode.id}
              onClick={() => onToggleEpisode(episode, !episode.watched)}
            >
              <Icon name={busyEpisodeId === episode.id ? 'loader' : episode.watched ? 'check' : 'circle'} size={17} />
            </button>
            <div className="series-episode__body">
              <div className="series-episode__title-row">
                <strong>{formatEpisodeCode(episode)} · {episode.title}</strong>
                {episode.id === nextEpisodeId && <span>Next</span>}
              </div>
              <div className="series-episode__meta">
                {episode.airDate && <span>{episode.airDate}</span>}
                {episode.runtime && <span>{episode.runtime} min</span>}
              </div>
              {episode.overview && <p>{episode.overview}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
