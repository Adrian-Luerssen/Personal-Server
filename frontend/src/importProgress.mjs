export function parseImportProgressChunk(buffer, chunk) {
  const lines = `${buffer || ''}${chunk || ''}`.split(/\r?\n/)
  const nextBuffer = lines.pop() ?? ''
  const events = []

  for (const line of lines) {
    if (!line.startsWith('data:')) continue
    const json = line.slice(5).trim()
    if (!json) continue
    try {
      events.push(JSON.parse(json))
    } catch {
      // Ignore malformed stream fragments. The next valid event should continue the import.
    }
  }

  return { events, buffer: nextBuffer }
}

export function formatImportDuration(ms = 0) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`
  }
  return `${seconds}s`
}

export function assertImportStreamComplete(lastEvent) {
  if (lastEvent?.stage === 'complete' || lastEvent?.stage === 'error') return
  throw new Error('Import connection closed before completion. Retry the import; existing records remain available.')
}

export async function streamImportProgress({
  url,
  accessToken,
  signal,
  onEvent,
}) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'text/event-stream',
    },
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Import failed (${res.status}): ${text || res.statusText}`)
  }

  if (!res.body?.getReader) {
    throw new Error('This browser cannot read import progress streams.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let lastEvent = null

  const dispatchEvent = (event) => {
    lastEvent = event
    onEvent(event)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const parsed = parseImportProgressChunk(
      buffer,
      decoder.decode(value, { stream: true })
    )
    buffer = parsed.buffer
    parsed.events.forEach(dispatchEvent)
  }

  const tail = decoder.decode()
  const finalParsed = parseImportProgressChunk(buffer, `${tail}\n`)
  finalParsed.events.forEach(dispatchEvent)
  assertImportStreamComplete(lastEvent)
}
