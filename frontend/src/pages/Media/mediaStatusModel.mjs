const STATUS_OPTIONS = {
  planning: { value: 'planning', label: 'Planning' },
  watching: { value: 'watching', label: 'Watching' },
  reading: { value: 'reading', label: 'Reading' },
  completed: { value: 'completed', label: 'Completed' },
  paused: { value: 'paused', label: 'Paused' },
  dropped: { value: 'dropped', label: 'Dropped' },
}

const CLASSIFICATION_LABELS = {
  anime: 'Anime',
  manga: 'Manga',
  tv: 'TV',
  movie: 'Movie',
  book: 'Book',
}

const CLASSIFICATIONS = new Set(Object.keys(CLASSIFICATION_LABELS))

export function getMediaClassifications(itemOrType, metadataOverride) {
  const item = typeof itemOrType === 'object' && itemOrType
    ? itemOrType
    : { type: itemOrType, metadata: metadataOverride }
  const classifications = []
  const add = (value) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (CLASSIFICATIONS.has(normalized) && !classifications.includes(normalized)) {
      classifications.push(normalized)
    }
  }

  add(item.type)
  const metadata = item.metadata || {}
  const format = String(metadata.mediaFormat || '').trim().toLowerCase()
  if (Array.isArray(metadata.tags)) {
    metadata.tags.forEach((tag) => {
      const normalizedTag = String(tag || '').trim().toLowerCase()
      if (item.type === 'anime' && format && ['tv', 'movie'].includes(normalizedTag)) return
      add(tag)
    })
  }

  if (format === 'movie') add('movie')
  if (item.type === 'anime' && ['tv', 'tv_short', 'ova', 'ona', 'special'].includes(format)) add('tv')

  return classifications
}

export function getMediaClassificationLabel(itemOrType, metadataOverride) {
  const labels = getMediaClassifications(itemOrType, metadataOverride)
    .map(classification => CLASSIFICATION_LABELS[classification])
  return labels.join(' \u00b7 ')
}

export function getMediaStatusOptions(type, metadata) {
  const classifications = getMediaClassifications(type, metadata)
  if (classifications.includes('movie')) {
    return ['planning', 'completed', 'paused', 'dropped'].map(status => STATUS_OPTIONS[status])
  }
  if (type === 'book' || type === 'manga') {
    return ['planning', 'reading', 'completed', 'paused', 'dropped'].map(status => STATUS_OPTIONS[status])
  }
  return ['planning', 'watching', 'completed', 'paused', 'dropped'].map(status => STATUS_OPTIONS[status])
}

export function normalizeMediaStatus(type, status = 'planning', rating = '', metadata) {
  if (!getMediaClassifications(type, metadata).includes('movie')) return status || 'planning'
  if (rating !== '' && rating !== null && rating !== undefined && Number.isFinite(Number(rating))) {
    return 'completed'
  }
  return status === 'watching' || status === 'reading' ? 'planning' : status || 'planning'
}

export function getImportedEpisodeProgressLabel(item) {
  const watched = Number(item?.metadata?.episodesWatched)
  if (!Number.isFinite(watched) || watched < 0) return null

  const total = Number(item?.metadata?.episodes)
  if (Number.isFinite(total) && total > 0) {
    return `${watched.toLocaleString()} / ${total.toLocaleString()} episodes watched`
  }

  return `${watched.toLocaleString()} episodes watched`
}
