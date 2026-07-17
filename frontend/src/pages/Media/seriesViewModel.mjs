const STATUS_ORDER = ['watching', 'reading', 'paused', 'planning', 'completed', 'dropped']

const PROGRESS_FIELDS = {
  anime: { field: 'episodesWatched', totalField: 'episodes', unit: 'episode' },
  tv: { field: 'episodesWatched', totalField: 'episodes', unit: 'episode' },
  manga: { field: 'chaptersRead', totalField: 'chapters', unit: 'chapter' },
  book: { field: 'pagesRead', totalField: 'pages', unit: 'page' },
}

export function normalizeSeriesCollection(data) {
  if (Array.isArray(data)) return data
  return Array.isArray(data?.items) ? data.items : []
}

export function getSeriesProgress(item) {
  const definition = PROGRESS_FIELDS[item?.type]
  if (!definition) return null

  const value = Math.max(0, Number(item?.metadata?.[definition.field]) || 0)
  const parsedTotal = Number(item?.metadata?.[definition.totalField])
  const total = Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : null
  return { ...definition, value, total }
}

export function getNextProgressUpdate(item) {
  const progress = getSeriesProgress(item)
  if (!progress) return null
  if (progress.total !== null && progress.value >= progress.total) return null

  const value = progress.total === null
    ? progress.value + 1
    : Math.min(progress.total, progress.value + 1)

  return {
    field: progress.field,
    value,
    total: progress.total,
    unit: progress.unit,
    completionSuggested: progress.total !== null && value === progress.total && item.status !== 'completed',
  }
}

export function groupSeriesByStatus(items) {
  const groups = new Map()
  for (const item of items || []) {
    const status = item.status || 'planning'
    const group = groups.get(status) || []
    group.push(item)
    groups.set(status, group)
  }

  return [...groups.entries()]
    .sort(([left], [right]) => {
      const leftIndex = STATUS_ORDER.indexOf(left)
      const rightIndex = STATUS_ORDER.indexOf(right)
      return (leftIndex === -1 ? STATUS_ORDER.length : leftIndex)
        - (rightIndex === -1 ? STATUS_ORDER.length : rightIndex)
    })
    .map(([status, groupedItems]) => ({ status, items: groupedItems }))
}

export function sortSeriesLibrary(items, order = 'status') {
  const values = [...(items || [])]
  const compareTitle = (left, right) => String(left?.title || '').localeCompare(String(right?.title || ''), undefined, { sensitivity: 'base' })
  if (order === 'title-asc') return values.sort(compareTitle)
  if (order === 'title-desc') return values.sort((left, right) => compareTitle(right, left))
  if (order === 'rating-desc' || order === 'rating-asc') {
    const direction = order === 'rating-desc' ? -1 : 1
    return values.sort((left, right) => {
      const leftRating = left?.rating == null ? null : Number(left.rating)
      const rightRating = right?.rating == null ? null : Number(right.rating)
      if (!Number.isFinite(leftRating)) return Number.isFinite(rightRating) ? 1 : compareTitle(left, right)
      if (!Number.isFinite(rightRating)) return -1
      return direction * (leftRating - rightRating) || compareTitle(left, right)
    })
  }
  if (order === 'updated-desc') {
    return values.sort((left, right) => Date.parse(right?.updatedAt || 0) - Date.parse(left?.updatedAt || 0) || compareTitle(left, right))
  }
  return values
}

export function paginateSeriesLibrary(items, requestedPage = 1, pageSize = 24, preserveInputOrder = false) {
  const groups = groupSeriesByStatus(items)
  const orderedItems = preserveInputOrder ? [...(items || [])] : groups.flatMap(group => group.items)
  const safePageSize = Math.max(1, Number(pageSize) || 24)
  const totalItems = orderedItems.length
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize))
  const page = Math.min(totalPages, Math.max(1, Number(requestedPage) || 1))
  const offset = (page - 1) * safePageSize
  const pageItems = orderedItems.slice(offset, offset + safePageSize)
  const totalsByStatus = new Map(groups.map(group => [group.status, group.items.length]))
  const pagedGroups = preserveInputOrder
    ? [{ status: 'ordered', items: pageItems, totalCount: totalItems }]
    : groupSeriesByStatus(pageItems).map(group => ({
      ...group,
      totalCount: totalsByStatus.get(group.status) || group.items.length,
    }))

  return {
    groups: pagedGroups,
    page,
    pageSize: safePageSize,
    totalItems,
    totalPages,
    start: totalItems === 0 ? 0 : offset + 1,
    end: Math.min(offset + safePageSize, totalItems),
  }
}
