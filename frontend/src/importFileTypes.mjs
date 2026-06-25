const SQLITE_MIME_TYPES = [
  'application/vnd.sqlite3',
  'application/x-sqlite3',
  'application/octet-stream',
]

const CSV_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
]

const XML_GZIP_MIME_TYPES = [
  'application/xml',
  'text/xml',
  'application/gzip',
  'application/x-gzip',
  'application/octet-stream',
]

export const IMPORT_FILE_TYPES = {
  fitnotes: {
    extensions: ['.fitnotes', '.db', '.sqlite', '.sqlite3'],
    mimeTypes: SQLITE_MIME_TYPES,
    description: '.fitnotes, .db, .sqlite, or .sqlite3',
  },
  cashew: {
    extensions: ['.backup', '.sqlite', '.sqlite3', '.db'],
    mimeTypes: SQLITE_MIME_TYPES,
    description: '.backup, .sqlite, .sqlite3, or .db',
  },
  habitshare: {
    extensions: ['.csv'],
    mimeTypes: CSV_MIME_TYPES,
    description: '.csv',
  },
  mal: {
    extensions: ['.xml.gz', '.xml', '.gz'],
    mimeTypes: XML_GZIP_MIME_TYPES,
    description: '.xml or .xml.gz',
  },
  tvtime: {
    extensions: ['.csv'],
    mimeTypes: CSV_MIME_TYPES,
    description: '.csv',
  },
  goodreads: {
    extensions: ['.csv'],
    mimeTypes: CSV_MIME_TYPES,
    description: '.csv',
  },
}

export function getImportAccept(type, options = {}) {
  const config = IMPORT_FILE_TYPES[type]
  if (!config) throw new Error(`Unknown import file type: ${type}`)

  if (options.native) {
    return '*/*'
  }

  return [...config.extensions, ...config.mimeTypes].join(',')
}

export function getImportFileDescription(type) {
  const config = IMPORT_FILE_TYPES[type]
  if (!config) throw new Error(`Unknown import file type: ${type}`)
  return config.description
}
