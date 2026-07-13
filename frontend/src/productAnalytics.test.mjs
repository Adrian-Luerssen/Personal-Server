import test from 'node:test'
import assert from 'node:assert/strict'

import { buildAnalyticsConfig, redactAnalyticsEvent } from './productAnalytics.mjs'

test('removes query strings and fragments from analytics page views', () => {
  assert.deepEqual(redactAnalyticsEvent({
    type: 'pageview',
    url: 'https://record.example/media?token=secret#episode-3',
  }), {
    type: 'pageview',
    url: 'https://record.example/media',
  })
})

test('uses Vercel dynamic configuration for the hosted web build', () => {
  const config = buildAnalyticsConfig({}, false)
  assert.equal(config.enabled, true)
  assert.equal(config.props.mode, undefined)
  assert.equal(typeof config.props.beforeSend, 'function')
})

test('uses explicit absolute intake routes for the Capacitor build', () => {
  const config = buildAnalyticsConfig({
    VITE_VERCEL_ANALYTICS_SCRIPT_SRC: 'https://record.example/_va/script.js',
    VITE_VERCEL_ANALYTICS_VIEW_ENDPOINT: 'https://record.example/_va/view',
    VITE_VERCEL_ANALYTICS_EVENT_ENDPOINT: 'https://record.example/_va/event',
  }, true)
  assert.deepEqual(config, {
    enabled: true,
    props: {
      mode: 'production',
      scriptSrc: 'https://record.example/_va/script.js',
      viewEndpoint: 'https://record.example/_va/view',
      eventEndpoint: 'https://record.example/_va/event',
      beforeSend: redactAnalyticsEvent,
    },
  })
})

test('does not send native analytics to the local WebView origin when intake is unconfigured', () => {
  assert.deepEqual(buildAnalyticsConfig({}, true), { enabled: false, props: {} })
})
