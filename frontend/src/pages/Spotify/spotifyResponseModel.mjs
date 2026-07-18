export function normalizeListeningCollection(value) {
  const collection = Array.isArray(value)
    ? value
    : Array.isArray(value?.items)
      ? value.items
      : Array.isArray(value?.data)
        ? value.data
        : []

  return collection.filter(item => (
    item !== null
    && typeof item === 'object'
    && !Array.isArray(item)
  ))
}
