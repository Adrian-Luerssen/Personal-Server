import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeFinanceColor } from './components/finance/financeVisuals.mjs';

describe('finance visual normalization', () => {
  it('converts Cashew Android ARGB colors into CSS hex colors', () => {
    assert.equal(normalizeFinanceColor('0xffff7043'), '#ff7043');
    assert.equal(normalizeFinanceColor('0xff26c6da'), '#26c6da');
    assert.equal(normalizeFinanceColor('0xffffffff'), '#ffffff');
  });

  it('preserves existing CSS color values and falls back for invalid data', () => {
    assert.equal(normalizeFinanceColor('#fbbf24'), '#fbbf24');
    assert.equal(normalizeFinanceColor('rgb(255, 0, 0)'), 'rgb(255, 0, 0)');
    assert.equal(normalizeFinanceColor('', '#6b7280'), '#6b7280');
    assert.equal(normalizeFinanceColor(null, '#6b7280'), '#6b7280');
  });
});
