import React from 'react'
import { importRouteWithRecovery } from './lazyRouteRecovery.mjs'

export default function lazyRoute(importer) {
  return React.lazy(() => importRouteWithRecovery(importer))
}
