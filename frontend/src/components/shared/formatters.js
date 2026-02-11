// formatNumberShort - BUG FIX: remove .toFixed(0) coercion that was in WorkoutShared
export function formatNumberShort(num) {
  if (num === null || num === undefined || isNaN(num)) return '0'
  const n = Number(num)
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1) + 'B'
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M'
  if (abs >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + 'K'
  return String(n)
}

// formatDuration - from SpotifyShared, formats ms to human readable
export function formatDuration(ms) {
  if (!ms || isNaN(ms)) return '0m'
  const minutes = Math.floor(ms / 1000 / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ${hours % 24}h`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ${days % 7}d`
  const months = Math.floor(weeks / 4.345)
  if (months < 12) return `${months}mo ${weeks % 4}w`
  const years = Math.floor(months / 12)
  return `${years}y ${months % 12}mo`
}

// formatSessionDuration - renamed from WorkoutShared formatDuration (takes start/end dates)
export function formatSessionDuration(startAt, endAt) {
  if (!startAt) return '—'
  const start = new Date(startAt)
  const end = endAt ? new Date(endAt) : new Date()
  const diffMs = end - start
  if (diffMs < 0) return '—'
  const mins = Math.floor(diffMs / 1000 / 60)
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  if (hrs > 0) return `${hrs}h ${remainMins}m`
  return `${mins}m`
}

export function formatDateTime(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatTime(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function formatWeight(kg) {
  if (kg === null || kg === undefined) return '—'
  return `${formatNumberShort(kg)} kg`
}

export function formatDistance(meters) {
  if (meters === null || meters === undefined) return '—'
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`
  return `${meters} m`
}

export function formatDurationSec(sec) {
  if (sec === null || sec === undefined) return '—'
  if (sec < 60) return `${sec}s`
  const mins = Math.floor(sec / 60)
  const secs = sec % 60
  return `${mins}m ${secs}s`
}

export function calculateVolume(sets) {
  if (!Array.isArray(sets)) return 0
  return sets.reduce((sum, s) => {
    if (s.reps && s.weight) return sum + (s.reps * s.weight)
    return sum
  }, 0)
}
