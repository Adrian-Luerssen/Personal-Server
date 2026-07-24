import { TvTimeImportService } from './tvtime-import.service';
import { MediaStatus, MediaType } from '../entities/media-item.entity';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TvTimeImportService', () => {
  let service: TvTimeImportService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new TvTimeImportService();
  });

  it('imports TVTime rows as source-authoritative TV items with stable TVDB identity and tags', async () => {
    const csv = [
      'No.,id,name,up_to_date,archived,status,aired_episodes,seen_episodes,runtime,all_images.poster',
      '248,78804,Doctor Who (2005),False,True,Ended,153,2,47,https://artworks.thetvdb.com/banners/posters/78804-52.jpg',
      '253,357888,"Love, Death & Robots",False,True,Continuing,45,18,13,https://artworks.thetvdb.com/banners/v4/series/357888/posters/607da9fc6a6a1.jpg',
    ].join('\n');

    const items = await service.parseCsv(Buffer.from(csv, 'utf-8'));

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual(
      expect.objectContaining({
        title: 'Doctor Who (2005)',
        type: MediaType.TV,
        status: MediaStatus.PAUSED,
        coverUrl: 'https://artworks.thetvdb.com/banners/posters/78804-52.jpg',
        externalIds: { tvdbId: 78804 },
      })
    );
    expect(items[0].metadata).toEqual(
      expect.objectContaining({
        importSource: 'tvtime',
        sourceType: 'tv',
        tags: ['tv'],
        episodes: 153,
        episodesWatched: 2,
        runtime: 47,
        archived: true,
        importCoverUrl:
          'https://artworks.thetvdb.com/banners/posters/78804-52.jpg',
      })
    );
    expect(items[1].title).toBe('Love, Death & Robots');
  });

  it('maps the current TV Time relationship statuses when episode counts are absent', async () => {
    const csv = [
      'NÂ°,id,name,up_to_date,archived,status,aired_episodes,seen_episodes,runtime,uuid,entity_type,created_at',
      '1,83277,Toradora!,,,not_started_yet,,,,one,series,2019-06-09T12:19:49Z',
      '2,305089,"Re: ZERO, Starting Life in Another World",,,continuing,,,,two,series,2019-06-30T10:18:40Z',
      '3,326613,The Commute (2016),,,up_to_date,,,,three,series,2018-06-30T10:18:40Z',
      '4,327417,Money Heist,,,stopped,,,,four,series,2018-06-30T10:18:40Z',
      '5,283947,Assassination Classroom,,,watch_later,,,,five,series,2018-06-30T10:18:40Z',
      '6,999999,Arrival,,,up_to_date,,,,six,movie,2018-06-30T10:18:40Z',
    ].join('\n');

    const items = await service.parseCsv(Buffer.from(csv, 'utf-8'));

    expect(items.map((item) => item.status)).toEqual([
      MediaStatus.PLANNING,
      MediaStatus.WATCHING,
      MediaStatus.WATCHING,
      MediaStatus.PAUSED,
      MediaStatus.PLANNING,
      MediaStatus.COMPLETED,
    ]);
    expect(items.map((item) => item.type)).toEqual([
      MediaType.TV,
      MediaType.TV,
      MediaType.TV,
      MediaType.TV,
      MediaType.TV,
      MediaType.MOVIE,
    ]);
    expect(items.map((item) => item.metadata.tvTimeProgressMode)).toEqual([
      'none',
      'unknown-partial',
      'all-aired',
      'unknown-partial',
      'none',
      'complete',
    ]);
  });

  it('resolves translated TV Time anime titles to existing MAL records in batches', async () => {
    const incoming = [
      {
        title: 'Attack on Titan',
        type: MediaType.TV,
        status: MediaStatus.COMPLETED,
        externalIds: { tvdbId: 267440 },
        metadata: { importSource: 'tvtime', tags: ['tv'] },
      },
    ] as any[];
    const existing = [
      {
        id: 'mal-aot',
        title: 'Shingeki no Kyojin',
        type: MediaType.ANIME,
        externalIds: { malId: 16498 },
        metadata: { tags: ['anime'] },
      },
    ] as any[];
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: {
          media0: {
            idMal: 16498,
            title: {
              romaji: 'Shingeki no Kyojin',
              english: 'Attack on Titan',
              native: '進撃の巨人',
            },
            synonyms: [],
          },
        },
      },
    } as any);

    await service.resolveExistingAnime(incoming, existing);

    expect(incoming[0]).toMatchObject({
      type: MediaType.ANIME,
      externalIds: { tvdbId: 267440, malId: 16498 },
      metadata: {
        importSource: 'tvtime',
        tags: ['anime', 'tv'],
        matchedExistingId: 'mal-aot',
      },
    });
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('starts independent title-resolution batches without waiting for the previous provider request', async () => {
    const incoming = [
      {
        title: 'Unmatched TV Time title',
        type: MediaType.TV,
        status: MediaStatus.PLANNING,
        externalIds: { tvdbId: 1 },
        metadata: { importSource: 'tvtime', tags: ['tv'] },
      },
    ] as any[];
    const existing = Array.from({ length: 41 }, (_, index) => ({
      id: `mal-existing-${index}`,
      title: `Existing anime ${index}`,
      type: MediaType.ANIME,
      externalIds: { malId: index + 1 },
      metadata: {},
    })) as any[];
    const pending: Array<(value: any) => void> = [];
    mockedAxios.post.mockImplementation(
      () => new Promise((resolve) => pending.push(resolve)) as any
    );

    const resolution = service.resolveExistingAnime(incoming, existing);
    await Promise.resolve();

    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    pending.forEach((resolve) =>
      resolve({
        data: {
          data: {
            media0: {
              idMal: 1,
              title: {
                romaji: 'Existing anime 0',
                english: 'Unmatched TV Time title',
              },
              synonyms: [],
            },
          },
        },
      })
    );
    await resolution;
  });

  it('uses existing title aliases without making a provider request', async () => {
    const incoming = [
      {
        title: 'My Hero Academia',
        type: MediaType.TV,
        status: MediaStatus.COMPLETED,
        externalIds: { tvdbId: 305074 },
        metadata: { importSource: 'tvtime', tags: ['tv'] },
      },
    ] as any[];
    const existing = [
      {
        id: 'mal-mha',
        title: 'Boku no Hero Academia',
        type: MediaType.ANIME,
        externalIds: { malId: 31964 },
        metadata: { alternativeTitles: ['My Hero Academia'] },
      },
    ] as any[];

    await service.resolveExistingAnime(incoming, existing);

    expect(incoming[0]).toMatchObject({
      type: MediaType.ANIME,
      externalIds: { tvdbId: 305074, malId: 31964 },
      metadata: { matchedExistingId: 'mal-mha' },
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('retries a throttled batch and matches Promised Neverland and Food Wars by MAL identity', async () => {
    const incoming = [
      {
        title: 'The Promised Neverland',
        type: MediaType.TV,
        status: MediaStatus.PAUSED,
        externalIds: { tvdbId: 348002 },
        metadata: { importSource: 'tvtime', tags: ['tv'] },
      },
      {
        title: 'Food Wars!',
        type: MediaType.TV,
        status: MediaStatus.COMPLETED,
        externalIds: { tvdbId: 289909 },
        metadata: { importSource: 'tvtime', tags: ['tv'] },
      },
    ] as any[];
    const existing = [
      {
        id: 'mal-promised-neverland',
        title: 'Yakusoku no Neverland',
        type: MediaType.ANIME,
        externalIds: { malId: 37779 },
        metadata: {},
      },
      {
        id: 'mal-food-wars',
        title: 'Shokugeki no Souma',
        type: MediaType.ANIME,
        externalIds: { malId: 28171 },
        metadata: {},
      },
    ] as any[];
    mockedAxios.post
      .mockRejectedValueOnce({
        response: { status: 429, headers: { 'retry-after': '0' } },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            media0: {
              idMal: 37779,
              title: {
                romaji: 'Yakusoku no Neverland',
                english: 'The Promised Neverland',
              },
              synonyms: [],
            },
            media1: {
              idMal: 28171,
              title: { romaji: 'Shokugeki no Souma', english: 'Food Wars!' },
              synonyms: ['Food Wars! The First Plate'],
            },
          },
        },
      } as any);

    const resolution = service.resolveExistingAnime(incoming, existing);
    await resolution;

    expect(incoming.map((item) => item.metadata.matchedExistingId)).toEqual([
      'mal-promised-neverland',
      'mal-food-wars',
    ]);
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it('keeps the preview available when AniList alias matching is unavailable', async () => {
    const incoming = [
      {
        title: 'Provider outage title',
        type: MediaType.TV,
        status: MediaStatus.WATCHING,
        externalIds: { tvdbId: 123456 },
        metadata: { importSource: 'tvtime', sourceType: 'tv', tags: ['tv'] },
      },
    ] as any[];
    const existing = [
      {
        id: 'existing-anime',
        title: 'Different local title',
        type: MediaType.ANIME,
        externalIds: { malId: 999 },
        metadata: {},
      },
    ] as any[];
    mockedAxios.post.mockRejectedValue({
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
    });

    await expect(
      service.resolveExistingAnime(incoming, existing)
    ).resolves.toBeUndefined();

    expect(incoming[0]).toMatchObject({
      type: MediaType.TV,
      metadata: {
        importSource: 'tvtime',
        animeClassificationState: 'unavailable',
      },
    });
    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
  });

  it('isolates an invalid MAL identity without discarding valid aliases from the same batch', async () => {
    const incoming = [
      {
        title: 'The Promised Neverland',
        type: MediaType.TV,
        status: MediaStatus.PAUSED,
        externalIds: { tvdbId: 348002 },
        metadata: { importSource: 'tvtime', tags: ['tv'] },
      },
    ] as any[];
    const existing = [
      {
        id: 'mal-promised-neverland',
        title: 'Yakusoku no Neverland',
        type: MediaType.ANIME,
        externalIds: { malId: 37779 },
        metadata: {},
      },
      {
        id: 'mal-invalid',
        title: 'Unavailable MAL record',
        type: MediaType.ANIME,
        externalIds: { malId: 999999999 },
        metadata: {},
      },
    ] as any[];
    mockedAxios.post
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({
        data: {
          data: {
            media0: {
              idMal: 37779,
              title: {
                romaji: 'Yakusoku no Neverland',
                english: 'The Promised Neverland',
              },
              synonyms: [],
            },
          },
        },
      } as any)
      .mockRejectedValueOnce({ response: { status: 404 } });

    await service.resolveExistingAnime(incoming, existing);

    expect(incoming[0].metadata.matchedExistingId).toBe(
      'mal-promised-neverland'
    );
    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
  });

  it('classifies new TV Time anime while leaving ordinary television as TV', async () => {
    const incoming = [
      {
        title: 'The Promised Neverland',
        type: MediaType.TV,
        status: MediaStatus.PAUSED,
        externalIds: { tvdbId: 348002 },
        metadata: { importSource: 'tvtime', tags: ['tv'] },
      },
      {
        title: 'Money Heist',
        type: MediaType.TV,
        status: MediaStatus.PAUSED,
        externalIds: { tvdbId: 327417 },
        metadata: { importSource: 'tvtime', sourceType: 'tv', tags: ['tv'] },
      },
    ] as any[];
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: {
          page0: {
            media: [
              {
                idMal: 37779,
                title: {
                  romaji: 'Yakusoku no Neverland',
                  english: 'The Promised Neverland',
                },
                synonyms: [],
              },
            ],
          },
          page1: { media: [] },
        },
      },
    } as any);

    await service.resolveExistingAnime(incoming, []);

    expect(incoming[0]).toMatchObject({
      type: MediaType.ANIME,
      externalIds: { tvdbId: 348002, malId: 37779 },
      metadata: { sourceType: 'anime', tags: ['anime', 'tv'] },
    });
    expect(incoming[1]).toMatchObject({
      type: MediaType.TV,
      externalIds: { tvdbId: 327417 },
      metadata: { sourceType: 'tv', tags: ['tv'] },
    });
  });

  it('does not classify a fuzzy anime search result unless a returned alias exactly matches', async () => {
    const incoming = [
      {
        title: 'Monster',
        type: MediaType.TV,
        status: MediaStatus.PLANNING,
        externalIds: { tvdbId: 123 },
        metadata: { importSource: 'tvtime', sourceType: 'tv', tags: ['tv'] },
      },
    ] as any[];
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: {
          page0: {
            media: [
              {
                idMal: 19,
                title: { romaji: 'Monster Extra', english: 'Monster Extra' },
                synonyms: [],
              },
            ],
          },
        },
      },
    } as any);

    await service.resolveExistingAnime(incoming, []);

    expect(incoming[0].type).toBe(MediaType.TV);
    expect(incoming[0].externalIds).toEqual({ tvdbId: 123 });
  });
});
