import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import { buildAnalyticsConfig } from '../productAnalytics.mjs'

export default function ProductAnalytics({ nativeApp }) {
  const config = buildAnalyticsConfig(import.meta.env, nativeApp)
  if (!config.enabled) return null
  return <Analytics {...config.props} />
}
