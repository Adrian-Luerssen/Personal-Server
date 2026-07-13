export function getSpotifyProfileImageUrl(user = {}) {
  const direct =
    user.profileImageUrl ||
    user.profile_image_url ||
    user.profileimageurl ||
    user.profileImage ||
    user.imageUrl ||
    ''

  if (direct) return direct

  const imageFromList = Array.isArray(user.images)
    ? user.images.find(image => image?.url)?.url
    : ''

  return imageFromList || ''
}

const SPOTIFY_TIMEFRAMES = new Set(['today', 'week', 'month', '6m', 'year', 'all', 'custom'])

export function normalizeSpotifyTimeframe(value, fallback = 'week') {
  return SPOTIFY_TIMEFRAMES.has(value) ? value : fallback
}

export function getRankMovement(item = {}) {
  const current = Number(item.rank)
  const previous = Number(item.previousRank ?? item.previous_rank)
  if (!Number.isFinite(previous) || !Number.isFinite(current)) {
    return { direction: 'new', delta: null, label: 'New' }
  }
  const delta = Math.abs(previous - current)
  if (delta === 0) return { direction: 'flat', delta: 0, label: 'No change' }
  return previous > current
    ? { direction: 'up', delta, label: `Up ${delta}` }
    : { direction: 'down', delta, label: `Down ${delta}` }
}

export function getListeningArtworkUrl(details = {}) {
  return details?.images?.find(image => image?.url)?.url
    || details?.album?.images?.find(image => image?.url)?.url
    || details?.imageUrl
    || details?.image_url
    || ''
}
