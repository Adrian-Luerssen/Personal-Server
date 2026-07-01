import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isKnownIconName,
  resolveIconName,
} from './components/icons/iconRegistry.mjs';

const SOURCE_ROOT = path.dirname(fileURLToPath(import.meta.url));

function walkSourceFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'build'].includes(entry.name)) continue;
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(entryPath, files);
    } else if (/\.(jsx?|mjs|tsx?)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

function collectRenderedIconNames() {
  const regexes = [
    /<Icon\b[^>]*\bname=["']([^"']+)["']/g,
    /\biconName:\s*["']([^"']+)["']/g,
    /destination\([^,]+,\s*[^,]+,\s*["']([^"']+)["']/g,
  ];
  const names = new Map();
  for (const file of walkSourceFiles(SOURCE_ROOT)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const regex of regexes) {
      let match;
      while ((match = regex.exec(text))) {
        const name = match[1];
        if (!names.has(name)) names.set(name, new Set());
        names.get(name).add(path.relative(SOURCE_ROOT, file));
      }
    }
  }
  return names;
}

describe('icon registry compatibility', () => {
  it('keeps older Lucide names rendering after package icon renames', () => {
    assert.equal(resolveIconName('home'), 'house');
    assert.equal(resolveIconName('alert-triangle'), 'triangle-alert');
    assert.equal(resolveIconName('bar-chart-3'), 'chart-column');
    assert.equal(resolveIconName('help-circle'), 'circle-question-mark');
    assert.equal(resolveIconName('minus-circle'), 'circle-minus');
    assert.equal(resolveIconName('x-circle'), 'circle-x');
    assert.equal(resolveIconName('pie-chart'), 'chart-pie');
  });

  it('maps imported Cashew category image filenames to product icon names', () => {
    assert.equal(resolveIconName('plane.png'), 'plane');
    assert.equal(resolveIconName('home2.png'), 'house');
    assert.equal(resolveIconName('paper-bill.png'), 'receipt-text');
    assert.equal(resolveIconName('healthcare-and-medical.png'), 'heart-pulse');
    assert.equal(resolveIconName('clothes-hanger.png'), 'shirt');
    assert.equal(resolveIconName('celebration.png'), 'party-popper');
  });

  it('maps Material icon ids used by older UI/data into Lucide names', () => {
    assert.equal(resolveIconName('account_balance_wallet'), 'wallet');
    assert.equal(resolveIconName('receipt_long'), 'receipt');
    assert.equal(resolveIconName('music_note'), 'music');
  });

  it('can validate normalized icons against the installed Lucide registry', () => {
    assert.equal(isKnownIconName('plane.png'), true);
    assert.equal(isKnownIconName('home'), true);
    assert.equal(isKnownIconName('definitely-not-an-icon'), false);
  });

  it('resolves every current static rendered icon name', () => {
    const unresolved = [...collectRenderedIconNames()]
      .filter(([name]) => !isKnownIconName(name))
      .map(([name, files]) => `${name} (${[...files].join(', ')})`);

    assert.deepEqual(unresolved, []);
  });

  it('resolves all Cashew category icons seen in the import fixture', () => {
    const cashewIcons = [
      'plant.png',
      'gamepad.png',
      'tickets.png',
      'briefcase.png',
      'loan.png',
      'image.png',
      'bicycle.png',
      'coffee.png',
      'popcorn.png',
      'cat.png',
      'paper-bill.png',
      'home2.png',
      'plane.png',
      'bills.png',
      'charts.png',
      'tram.png',
      'coin.png',
      'flower.png',
      'glass.png',
      'celebration.png',
      'bottles.png',
      'groceries.png',
      'gift.png',
      'clothes-hanger.png',
      'shopping.png',
      'pizza.png',
      'cutlery.png',
      'code.png',
      'face-mask.png',
      'healthcare-and-medical.png',
    ];
    assert.deepEqual(cashewIcons.filter((name) => !isKnownIconName(name)), []);
  });
});
