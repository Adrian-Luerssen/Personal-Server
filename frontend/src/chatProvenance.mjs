function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatProvenance(pageContext) {
  if (!pageContext?.pageType) return null
  const filters = pageContext.filters || {}
  const labelParts = [String(pageContext.pageType).replace(/-/g, ' ')]
  const date = formatDate(filters.date)
  if (date) labelParts.push(date)
  else if (filters.timeframe) labelParts.push(filters.timeframe)
  else if (filters.from && filters.to) labelParts.push(`${filters.from} to ${filters.to}`)
  else if (filters.from) labelParts.push(`from ${filters.from}`)

  return {
    label: labelParts.join(' · '),
    sources: Array.isArray(filters.sources) ? filters.sources.filter(Boolean) : [],
  }
}
