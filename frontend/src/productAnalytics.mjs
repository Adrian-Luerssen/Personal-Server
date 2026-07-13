function absoluteHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null
  } catch {
    return null
  }
}

export function redactAnalyticsEvent(event) {
  if (!event?.url) return event
  try {
    const url = new URL(event.url, 'https://analytics.invalid')
    const redacted = `${url.origin}${url.pathname}`
    return {
      ...event,
      url: redacted.replace('https://analytics.invalid', ''),
    }
  } catch {
    return null
  }
}

export function buildAnalyticsConfig(env = {}, nativeApp = false) {
  if (!nativeApp) {
    return {
      enabled: true,
      props: { beforeSend: redactAnalyticsEvent },
    }
  }

  const scriptSrc = absoluteHttpUrl(env.VITE_VERCEL_ANALYTICS_SCRIPT_SRC)
  const viewEndpoint = absoluteHttpUrl(env.VITE_VERCEL_ANALYTICS_VIEW_ENDPOINT)
  const eventEndpoint = absoluteHttpUrl(env.VITE_VERCEL_ANALYTICS_EVENT_ENDPOINT)
  if (!scriptSrc || !viewEndpoint || !eventEndpoint) {
    return { enabled: false, props: {} }
  }

  return {
    enabled: true,
    props: {
      mode: 'production',
      scriptSrc,
      viewEndpoint,
      eventEndpoint,
      beforeSend: redactAnalyticsEvent,
    },
  }
}
