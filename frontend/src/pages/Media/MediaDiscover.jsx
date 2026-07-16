import React, { useState } from 'react'
import { apiFetch } from '../../api'
import Icon from '../../components/icons/Icon'
import { PageHeading, StatePanel } from '../../components/record'
import IconInput from '../../components/product/IconInput'

const TYPES = {
  anime: { label: 'Anime', icon: 'tv' },
  manga: { label: 'Manga', icon: 'book-open' },
  tv: { label: 'TV', icon: 'monitor' },
  movie: { label: 'Movies', icon: 'clapperboard' },
  book: { label: 'Books', icon: 'book' },
}

function identityFor(item) {
  const externalIds = item?.externalIds || {}
  const externalId = externalIds.malId || externalIds.tmdbId || externalIds.openLibraryKey || externalIds.isbn
  return externalId ? `${item.type}:${externalId}` : `${item.type}:${String(item.title || '').trim().toLowerCase()}`
}

function resultFacts(result) {
  const facts = []
  if (result.year) facts.push(result.year)
  if (result.metadata?.episodes) facts.push(`${result.metadata.episodes} episodes`)
  if (result.metadata?.chapters) facts.push(`${result.metadata.chapters} chapters`)
  if (result.metadata?.pages) facts.push(`${result.metadata.pages} pages`)
  return facts
}

export default function MediaDiscover({ libraryItems = [], onAdded }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState('')
  const [added, setAdded] = useState(() => new Set())
  const [error, setError] = useState('')

  const libraryIdentities = new Set(libraryItems.map(identityFor))

  const searchCatalog = async (event) => {
    event.preventDefault()
    const normalizedQuery = query.trim()
    if (normalizedQuery.length < 2 || searching) return
    setSearching(true)
    setSearched(true)
    setError('')
    try {
      const params = new URLSearchParams({ q: normalizedQuery })
      if (type) params.set('type', type)
      const data = await apiFetch(`/media/search?${params}`)
      setResults(Array.isArray(data) ? data : [])
    } catch (searchError) {
      setResults([])
      setError(searchError.message || 'The catalog could not be searched right now.')
    } finally {
      setSearching(false)
    }
  }

  const addResult = async (result) => {
    const identity = identityFor(result)
    setAdding(identity)
    setError('')
    try {
      const created = await apiFetch('/media', {
        method: 'POST',
        body: JSON.stringify({
          title: result.title,
          type: result.type,
          status: 'planning',
          coverUrl: result.coverUrl || null,
          externalIds: result.externalIds || {},
          metadata: result.metadata || {},
        }),
      })
      setAdded(current => new Set(current).add(identity))
      onAdded?.(created)
      if (created?.id) {
        apiFetch(`/media/${created.id}/catalog/sync`, { method: 'POST' }).catch(() => {})
      }
    } catch (addError) {
      setError(addError.message || 'The title could not be added to your list.')
    } finally {
      setAdding('')
    }
  }

  return (
    <main className="series-discover" data-testid="series-discover">
      <PageHeading
        eyebrow="Find your next record"
        title="Discover"
        description="Search anime, television, films, manga, and books across connected catalogs, then save a title directly to your list."
        meta="MyAnimeList · TMDB · Open Library"
      />

      <form className="series-discover-search" role="search" onSubmit={searchCatalog}>
        <IconInput
          className="series-discover-search__input"
          type="search"
          aria-label="Search the media catalog"
          placeholder="Search a title, author, or series..."
          value={query}
          onChange={event => setQuery(event.target.value)}
          autoFocus
        />
        <label className="series-discover-search__type">
          <span>Format</span>
          <select value={type} onChange={event => setType(event.target.value)} aria-label="Catalog format">
            <option value="">All formats</option>
            {Object.entries(TYPES).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
          </select>
        </label>
        <button className="record-button record-button--primary" type="submit" disabled={query.trim().length < 2 || searching}>
          <Icon name={searching ? 'loader' : 'search'} size={16} />
          {searching ? 'Searching…' : 'Search catalog'}
        </button>
      </form>

      {error && <StatePanel kind="offline" title="Catalog unavailable" detail={error} />}
      {!searched && !error && (
        <StatePanel kind="empty" title="Search beyond your list" detail="Try a title you have heard about, a book author, or a series you want to start. Results stay separate from your records until you add them." />
      )}
      {searched && !searching && !error && results.length === 0 && (
        <StatePanel kind="empty" title="No catalog matches" detail="Try a shorter title, check the spelling, or broaden the format filter." />
      )}

      {results.length > 0 && (
        <section className="series-discover-results" aria-label="Catalog results" aria-live="polite">
          <div className="series-discover-results__heading">
            <h2>Catalog results</h2>
            <span>{results.length} found</span>
          </div>
          <div className="series-discover-grid">
            {results.map((result, index) => {
              const identity = identityFor(result)
              const inLibrary = libraryIdentities.has(identity) || added.has(identity)
              const typeMeta = TYPES[result.type] || { label: result.type, icon: 'library' }
              const facts = resultFacts(result)
              const genres = Array.isArray(result.metadata?.genres) ? result.metadata.genres.slice(0, 3) : []
              return (
                <article className="series-discover-card" aria-label={result.title} key={`${identity}-${index}`}>
                  <div className="series-discover-card__cover">
                    {result.coverUrl
                      ? <img src={result.coverUrl} alt="" loading="lazy" />
                      : <Icon name={typeMeta.icon} size={28} />}
                    <span>{typeMeta.label}</span>
                  </div>
                  <div className="series-discover-card__body">
                    <div className="series-discover-card__title-row">
                      <h3>{result.title}</h3>
                      {facts.length > 0 && <span>{facts.join(' · ')}</span>}
                    </div>
                    {result.description && <p>{result.description}</p>}
                    {genres.length > 0 && <div className="series-discover-card__genres">{genres.map(genre => <span key={genre}>{genre}</span>)}</div>}
                    <button
                      type="button"
                      className="record-button record-button--compact"
                      disabled={inLibrary || adding === identity}
                      onClick={() => addResult(result)}
                      aria-label={inLibrary ? 'In my list' : 'Add to my list'}
                    >
                      <Icon name={inLibrary ? 'check' : adding === identity ? 'loader' : 'plus'} size={15} />
                      {inLibrary ? 'In my list' : adding === identity ? 'Adding…' : 'Add to Planning'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
