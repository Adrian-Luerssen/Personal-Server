import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatCompactMoney, formatMoney, normalizeCurrency } from './moneyFormat.mjs'

describe('money formatting', () => {
  it('normalizes missing or lowercase currency codes to EUR-style ISO codes', () => {
    assert.equal(normalizeCurrency('eur'), 'EUR')
    assert.equal(normalizeCurrency(''), 'EUR')
    assert.equal(normalizeCurrency(null), 'EUR')
  })

  it('formats dashboard money with the actual currency instead of hard-coded dollars', () => {
    assert.equal(formatMoney(0, 'EUR'), '€0')
    assert.equal(formatMoney(1205, 'EUR'), '€1,205')
  })

  it('formats compact native metric values without losing the currency', () => {
    assert.equal(formatCompactMoney(1205, 'EUR'), '€1.2K')
  })
})
