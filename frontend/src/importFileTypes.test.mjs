import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getImportAccept,
  getImportFileDescription,
  IMPORT_FILE_TYPES,
} from './importFileTypes.mjs'

describe('import file picker accept filters', () => {
  it('uses permissive native filters so Android document providers do not hide custom exports', () => {
    for (const type of Object.keys(IMPORT_FILE_TYPES)) {
      assert.equal(getImportAccept(type, { native: true }), '*/*')
    }
  })

  it('keeps precise desktop filters with MIME fallbacks for each import source', () => {
    assert.match(getImportAccept('fitnotes'), /\.fitnotes/)
    assert.match(getImportAccept('fitnotes'), /application\/x-sqlite3/)

    assert.match(getImportAccept('cashew'), /\.backup/)
    assert.match(getImportAccept('cashew'), /\.db/)
    assert.match(getImportAccept('cashew'), /application\/x-sqlite3/)

    assert.match(getImportAccept('habitshare'), /\.csv/)
    assert.match(getImportAccept('habitshare'), /text\/csv/)

    assert.match(getImportAccept('mal'), /\.xml\.gz/)
    assert.match(getImportAccept('mal'), /application\/gzip/)

    assert.match(getImportAccept('tvtime'), /\.csv/)
    assert.match(getImportAccept('goodreads'), /text\/csv/)
  })

  it('exposes user-readable descriptions separate from picker compatibility filters', () => {
    assert.equal(getImportFileDescription('mal'), '.xml or .xml.gz')
    assert.equal(getImportFileDescription('cashew'), '.backup, .sqlite, .sqlite3, or .db')
  })
})
