import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const apiSource = readFileSync(new URL('./api.js', import.meta.url), 'utf8')
const financeImportSource = readFileSync(new URL('./pages/Finance/FinanceImport.jsx', import.meta.url), 'utf8')
const financeLedgerSource = readFileSync(new URL('./pages/Finance/FinanceTransactions.jsx', import.meta.url), 'utf8')

test('activity mutations invalidate dashboard cache because Today depends on step counts', () => {
  assert.match(apiSource, /dashboardPrefixes[\s\S]*'\/activity'/)
})

test('finance SSE imports invalidate finance and dashboard caches on completion', () => {
  assert.match(apiSource, /export function invalidateApiCachePrefixes/)
  assert.match(financeImportSource, /invalidateApiCachePrefixes/)
  assert.match(financeImportSource, /'\/finance'[\s\S]*'\/dashboard'/)
})

test('finance ledger force-refreshes suspicious empty cached results', () => {
  assert.match(financeLedgerSource, /looksLikeEmptyFinanceCache/)
  assert.match(financeLedgerSource, /force:\s*true/)
})
