import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')
const ledger = read('src/pages/Finance/FinanceTransactions.jsx')
const capture = read('src/components/finance/PaymentCaptureSheet.jsx')

test('Cash is a period ledger with one filter and transaction register', () => {
  assert.match(ledger, /<PageHeading/)
  assert.match(ledger, /<SummaryStrip/)
  assert.match(ledger, /className="record-cash-filters"/)
  assert.match(ledger, /<Register[^>]+title="Transactions"/)
  assert.match(ledger, /<RegisterDivider/)
  assert.match(ledger, /data-testid="cash-ledger"/)
  assert.doesNotMatch(ledger, /NativeFinanceTransactionsView|native-finance-card|native-finance-hero/)
})

test('contactless capture explains source, confidence, duplicates, and commit boundary', () => {
  assert.match(capture, /Nothing is added to your ledger until you confirm it\./)
  assert.match(capture, /sourceAppLabel|sourcePackage/)
  assert.match(capture, /confidence/)
  assert.match(capture, /potentialDuplicate|duplicateCandidate/)
  assert.match(capture, /Possible duplicate/)
  assert.match(capture, /Confirm payment/)
  assert.match(capture, /Ignore/)
})
