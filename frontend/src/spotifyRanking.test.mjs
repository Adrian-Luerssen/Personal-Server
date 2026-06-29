import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getSpotifyProfileImageUrl } from './spotifyRanking.mjs'

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
})
