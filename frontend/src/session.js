import { clearApiCache } from './api.js'
import { clearTokens } from './auth.js'

export function signOut() {
  clearTokens()
  clearApiCache()
}
