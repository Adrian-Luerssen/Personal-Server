const RELATION_POSITION = Object.freeze({
  prequel: 'before',
  parent_story: 'before',
  sequel: 'after',
  side_story: 'related',
  spin_off: 'related',
  alternative: 'related',
  other: 'related',
})

const POSITION_ORDER = Object.freeze({ before: 0, current: 1, after: 2, related: 3 })

export function formatEpisodeCode(episode) {
  if (!episode) return ''
  const season = Math.max(0, Number(episode.seasonNumber) || 0)
  const number = Math.max(0, Number(episode.number) || 0)
  if (season === 0) return `Special ${number}`
  return `S${String(season).padStart(2, '0')}E${String(number).padStart(2, '0')}`
}

export function getCatalogProgressLabel(catalog, item) {
  if (item?.type === 'movie') {
    return item?.status === 'completed' ? 'Watched' : 'Movie'
  }
  const progress = catalog?.progress
  if (progress && Number(progress.total) > 0) {
    const position = progress.seasonNumber && progress.episodeNumber
      ? `${formatEpisodeCode({ seasonNumber: progress.seasonNumber, number: progress.episodeNumber })} · `
      : ''
    return `${position}${Math.max(0, Number(progress.watched) || 0)} of ${progress.total} watched`
  }
  const watched = Math.max(0, Number(item?.metadata?.episodesWatched) || 0)
  const total = Number(item?.metadata?.episodes)
  return `${watched} of ${Number.isFinite(total) && total > 0 ? total : 'unknown'} episodes`
}

export function getNextEpisodeAction(catalog) {
  const episode = catalog?.nextEpisode || catalog?.upcomingEpisode
  if (!episode) return null
  const upcoming = !catalog?.nextEpisode
  return {
    episodeId: episode.id,
    label: upcoming ? `Upcoming ${formatEpisodeCode(episode)}` : `Watch ${formatEpisodeCode(episode)}`,
    detail: episode.title || `Episode ${episode.number}`,
    upcoming,
    ...(episode.airDate ? { airDate: episode.airDate } : {}),
  }
}

export function isSeriesAiring(item) {
  const status = String(item?.metadata?.airingStatus || '').trim().toLowerCase().replace(/[_-]+/g, ' ')
  return ['currently airing', 'releasing', 'returning series', 'in production'].includes(status)
}

export function getSeriesRowAction(item, catalog) {
  if (item?.status === 'completed') {
    const rating = Number(item?.rating)
    return {
      kind: 'score',
      label: Number.isFinite(rating) && item?.rating != null ? `${rating.toFixed(1)} / 10` : 'Add score',
      needsScore: !(Number.isFinite(rating) && item?.rating != null),
    }
  }
  const episode = getNextEpisodeAction(catalog)
  return episode ? { kind: 'episode', ...episode } : null
}

export function buildContinuity(item, relations = []) {
  const entries = relations.map((relation) => ({
    id: relation.targetMediaItemId || `mal-${relation.targetMalId || relation.id}`,
    title: relation.targetTitle,
    malId: relation.targetMalId || null,
    mediaItemId: relation.targetMediaItemId || null,
    coverUrl: relation.targetCoverUrl || null,
    year: relation.targetYear || null,
    relationType: relation.relationType,
    position: RELATION_POSITION[relation.relationType] || 'related',
  }))
  entries.push({
    id: item.id,
    title: item.title,
    malId: item.externalIds?.malId || null,
    mediaItemId: item.id,
    coverUrl: item.coverUrl || null,
    year: item.metadata?.year || null,
    relationType: 'current',
    position: 'current',
  })
  return entries.sort((left, right) =>
    POSITION_ORDER[left.position] - POSITION_ORDER[right.position]
      || (Number(left.year) || 0) - (Number(right.year) || 0)
      || left.title.localeCompare(right.title),
  )
}

export function getContinuityTarget(entry) {
  if (entry?.mediaItemId) return { kind: 'library', id: entry.mediaItemId }
  const malId = Number(entry?.malId)
  return Number.isInteger(malId) && malId > 0 ? { kind: 'provider', malId } : null
}

export function summarizeSeriesMetadata(item) {
  const metadata = item?.metadata || {}
  const providerScore = Number(metadata.malScore ?? metadata.tmdbScore)
  return {
    year: Number(metadata.year) || null,
    format: metadata.mediaFormat || (item?.type === 'tv' ? 'TV series' : item?.type === 'movie' ? 'Movie' : null),
    airingStatus: metadata.airingStatus || null,
    studio: Array.isArray(metadata.studios) ? metadata.studios[0] || null : null,
    genres: Array.isArray(metadata.genres) ? metadata.genres.slice(0, 4) : [],
    providerScore: Number.isFinite(providerScore) ? Math.round(providerScore * 10) / 10 : null,
    synopsis: typeof metadata.synopsis === 'string' ? metadata.synopsis : '',
    releaseStartDate: metadata.releaseStartDate || null,
    releaseEndDate: metadata.releaseEndDate || null,
  }
}
