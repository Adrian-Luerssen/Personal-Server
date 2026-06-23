import { TvTimeImportService } from './tvtime-import.service';
import { MediaStatus, MediaType } from '../entities/media-item.entity';

describe('TvTimeImportService', () => {
  let service: TvTimeImportService;

  beforeEach(() => {
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
});
