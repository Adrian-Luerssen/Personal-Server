import { clearApiCache } from './api.js'
import { clearTokens } from './auth.js'

export function signOut() {
  clearTokens()
  clearApiCache()
  const healthPlugin = window.Capacitor?.Plugins?.PersonalServerHealth
  healthPlugin?.clearStepSyncCredentials?.().catch?.(() => {})
}
