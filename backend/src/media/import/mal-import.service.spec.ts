import { MalImportService } from './mal-import.service';
import { MediaStatus, MediaType } from '../entities/media-item.entity';

describe('MalImportService', () => {
  let service: MalImportService;

  beforeEach(() => {
    service = new MalImportService();
  });

  it('imports MAL anime exports as authoritative anime items with MAL identity and tags', async () => {
    const xml = `
      <myanimelist>
        <anime>
          <series_animedb_id>12345</series_animedb_id>
          <series_title>Black Rock Shooter</series_title>
          <series_episodes>8</series_episodes>
          <my_watched_episodes>3</my_watched_episodes>
          <my_score>6</my_score>
          <my_status>On-Hold</my_status>
          <my_start_date>2025-01-03</my_start_date>
          <my_finish_date>0000-00-00</my_finish_date>
        </anime>
      </myanimelist>
    `;

    const items = await service.parseExport(Buffer.from(xml, 'utf-8'), 'anime');

    expect(items).toEqual([
      expect.objectContaining({
        title: 'Black Rock Shooter',
        type: MediaType.ANIME,
        status: MediaStatus.PAUSED,
        rating: 6,
        startDate: '2025-01-03',
        endDate: undefined,
        externalIds: { malId: 12345 },
        metadata: expect.objectContaining({
          importSource: 'mal',
          sourceType: 'anime',
          tags: ['anime'],
          episodes: 8,
          episodesWatched: 3,
        }),
      }),
    ]);
  });

  it('imports MAL manga exports as authoritative manga items with manga progress tags', async () => {
    const xml = `
      <myanimelist>
        <manga>
          <manga_mangadb_id>987</manga_mangadb_id>
          <manga_title>Blue Period</manga_title>
          <manga_chapters>70</manga_chapters>
          <manga_volumes>16</manga_volumes>
          <my_read_chapters>12</my_read_chapters>
          <my_read_volumes>3</my_read_volumes>
          <my_score>8</my_score>
          <my_status>Reading</my_status>
        </manga>
      </myanimelist>
    `;

    const items = await service.parseExport(Buffer.from(xml, 'utf-8'), 'manga');

    expect(items).toEqual([
      expect.objectContaining({
        title: 'Blue Period',
        type: MediaType.MANGA,
        status: MediaStatus.READING,
        rating: 8,
        externalIds: { malId: 987 },
        metadata: expect.objectContaining({
          importSource: 'mal',
          sourceType: 'manga',
          tags: ['manga'],
          chapters: 70,
          volumes: 16,
          chaptersRead: 12,
          volumesRead: 3,
        }),
      }),
    ]);
  });
});
