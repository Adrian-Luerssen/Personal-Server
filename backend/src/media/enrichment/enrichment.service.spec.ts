import axios from 'axios';
import { MediaEnrichmentService } from './enrichment.service';
import { MediaItem, MediaType } from '../entities/media-item.entity';

jest.mock('axios');

describe('MediaEnrichmentService', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let repo: { save: jest.Mock };
  let originalTmdbKey: string | undefined;

  beforeEach(() => {
    originalTmdbKey = process.env.TMDB_API_KEY;
    delete process.env.TMDB_API_KEY;
    mockedAxios.get.mockReset();
    repo = {
      save: jest.fn(async (item) => item),
    };
  });

  afterEach(() => {
    if (originalTmdbKey == null) {
      delete process.env.TMDB_API_KEY;
    } else {
      process.env.TMDB_API_KEY = originalTmdbKey;
    }
  });

  it('does not reclassify TVTime imports to anime from title-only Jikan guesses and preserves imported covers', async () => {
    const service = new MediaEnrichmentService(repo as any);
    const item = {
      id: 'media-1',
      title: 'Shooter',
      type: MediaType.TV,
      coverUrl: 'https://artworks.thetvdb.com/banners/posters/311900-4.jpg',
      externalIds: { tvdbId: 311900 },
      metadata: {
        importSource: 'tvtime',
        sourceType: 'tv',
        tags: ['tv'],
        episodes: 31,
        episodesWatched: 19,
        importCoverUrl: 'https://artworks.thetvdb.com/banners/posters/311900-4.jpg',
      },
    } as unknown as MediaItem;

    await (service as any).enrichItem(item);

    expect(mockedAxios.get).not.toHaveBeenCalledWith(
      expect.stringContaining('api.jikan.moe'),
      expect.anything(),
    );
    expect(item.type).toBe(MediaType.TV);
    expect(item.coverUrl).toBe(
      'https://artworks.thetvdb.com/banners/posters/311900-4.jpg',
    );
    expect(item.externalIds).toEqual({ tvdbId: 311900 });
    expect(item.metadata).toEqual(
      expect.objectContaining({
        importSource: 'tvtime',
        sourceType: 'tv',
        tags: ['tv'],
        reclassified: true,
      }),
    );
  });
});
