const ROUTE_RETRY_KEY = 'record:route-import-retry'

export function isRecoverableRouteImportError(error) {
  const message = String(error?.message || error || '')
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|ChunkLoadError|error loading dynamically imported module/i.test(message)
}

export async function importRouteWithRecovery(importer, environment = {}) {
  const sessionStorage = environment.sessionStorage ?? globalThis.sessionStorage
  const reload = environment.reload ?? (() => globalThis.location?.reload())

  try {
    const routeModule = await importer()
    sessionStorage?.removeItem(ROUTE_RETRY_KEY)
    return routeModule
  } catch (error) {
    const alreadyRetried = sessionStorage?.getItem(ROUTE_RETRY_KEY) === '1'
    if (isRecoverableRouteImportError(error) && !alreadyRetried) {
      sessionStorage?.setItem(ROUTE_RETRY_KEY, '1')
      reload()
      return new Promise(() => {})
    }
    sessionStorage?.removeItem(ROUTE_RETRY_KEY)
    throw error
  }
}
