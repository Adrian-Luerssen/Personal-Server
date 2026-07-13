import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getListeningArtworkUrl,
  getRankMovement,
  getSpotifyProfileImageUrl,
  normalizeSpotifyTimeframe,
} from './spotifyRanking.mjs'

describe('spotify ranking helpers', () => {
  it('normalizes profile image fields from current and legacy API shapes', () => {
    assert.equal(
      getSpotifyProfileImageUrl({ profileImageUrl: 'https://example.com/current.jpg' }),
      'https://example.com/current.jpg'
    )
    assert.equal(
      getSpotifyProfileImageUrl({ profile_image_url: 'https://example.com/snake.jpg' }),
      'https://example.com/snake.jpg'
    )
    assert.equal(
      getSpotifyProfileImageUrl({ profileimageurl: 'https://example.com/lower.jpg' }),
      'https://example.com/lower.jpg'
    )
    assert.equal(
      getSpotifyProfileImageUrl({ images: [{ url: 'https://example.com/images.jpg' }] }),
      'https://example.com/images.jpg'
    )
  })

  it('returns an empty string when Spotify has no profile image', () => {
    assert.equal(getSpotifyProfileImageUrl({ displayName: 'No Photo' }), '')
    assert.equal(getSpotifyProfileImageUrl({ images: [] }), '')
  })

  it('keeps every Spotify surface on a supported shared timeframe', () => {
    assert.equal(normalizeSpotifyTimeframe('month'), 'month')
    assert.equal(normalizeSpotifyTimeframe('nonsense'), 'week')
    assert.equal(normalizeSpotifyTimeframe(null), 'week')
  })

  it('expresses rank movement from the listener point of view', () => {
    assert.deepEqual(getRankMovement({ rank: 2, previousRank: 5 }), { direction: 'up', delta: 3, label: 'Up 3' })
    assert.deepEqual(getRankMovement({ rank: 5, previousRank: 2 }), { direction: 'down', delta: 3, label: 'Down 3' })
    assert.deepEqual(getRankMovement({ rank: 2, previousRank: 2 }), { direction: 'flat', delta: 0, label: 'No change' })
    assert.deepEqual(getRankMovement({ rank: 1 }), { direction: 'new', delta: null, label: 'New' })
  })

  it('finds artwork across track, album, artist, and playlist detail shapes', () => {
    assert.equal(getListeningArtworkUrl({ album: { images: [{ url: 'track.jpg' }] } }), 'track.jpg')
    assert.equal(getListeningArtworkUrl({ images: [{ url: 'artist.jpg' }] }), 'artist.jpg')
    assert.equal(getListeningArtworkUrl({ imageUrl: 'legacy.jpg' }), 'legacy.jpg')
  })
})
