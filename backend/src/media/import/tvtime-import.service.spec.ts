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
      }),
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
        importCoverUrl: 'https://artworks.thetvdb.com/banners/posters/78804-52.jpg',
      }),
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
    ].join('\n');

    const items = await service.parseCsv(Buffer.from(csv, 'utf-8'));

    expect(items.map((item) => item.status)).toEqual([
      MediaStatus.PLANNING,
      MediaStatus.WATCHING,
      MediaStatus.COMPLETED,
      MediaStatus.PAUSED,
      MediaStatus.PLANNING,
    ]);
  });

  it('resolves translated TV Time anime titles to existing MAL records in batches', async () => {
    const incoming = [{
      title: 'Attack on Titan',
      type: MediaType.TV,
      status: MediaStatus.COMPLETED,
      externalIds: { tvdbId: 267440 },
      metadata: { importSource: 'tvtime', tags: ['tv'] },
    }] as any[];
    const existing = [{
      id: 'mal-aot',
      title: 'Shingeki no Kyojin',
      type: MediaType.ANIME,
      externalIds: { malId: 16498 },
      metadata: { tags: ['anime'] },
    }] as any[];
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: {
          media0: {
            idMal: 16498,
            title: { romaji: 'Shingeki no Kyojin', english: 'Attack on Titan', native: '進撃の巨人' },
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
});
