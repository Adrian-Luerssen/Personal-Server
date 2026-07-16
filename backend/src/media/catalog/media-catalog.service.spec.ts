import axios from "axios";
import { MediaCatalogService } from "./media-catalog.service";
import { MediaStatus, MediaType } from "../entities/media-item.entity";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

function repository(seed: any[] = []) {
  const rows = [...seed];
  return {
    rows,
    create: jest.fn((value) => ({ id: value.id || `${rows.length + 1}`, ...value })),
    save: jest.fn(async (value) => {
      const index = rows.findIndex((row) => row.id === value.id);
      if (index >= 0) rows[index] = value;
      else rows.push(value);
      return value;
    }),
    find: jest.fn(async ({ where }: any = {}) => rows.filter((row) =>
      !where || Object.entries(where).every(([key, value]) => row[key] === value)
    )),
    findOne: jest.fn(async ({ where }: any) => rows.find((row) =>
      Object.entries(where).every(([key, value]) => row[key] === value)
    ) || null),
  };
}

describe("MediaCatalogService", () => {
  const account = { id: "account-1" } as any;
  let mediaRepo: ReturnType<typeof repository>;
  let seasonRepo: ReturnType<typeof repository>;
  let episodeRepo: ReturnType<typeof repository>;
  let relationRepo: ReturnType<typeof repository>;
  let service: MediaCatalogService;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.TMDB_API_KEY = "tmdb-test";
    mediaRepo = repository();
    seasonRepo = repository();
    episodeRepo = repository();
    relationRepo = repository();
    service = new MediaCatalogService(
      mediaRepo as any,
      seasonRepo as any,
      episodeRepo as any,
      relationRepo as any,
    );
  });

  afterAll(() => {
    delete process.env.TMDB_API_KEY;
  });

  it("syncs TV seasons and episodes while backfilling legacy progress only across regular seasons", async () => {
    const item = {
      id: "tv-1",
      accountId: account.id,
      title: "Example Show",
      type: MediaType.TV,
      externalIds: { tmdbId: 42 },
      metadata: { episodesWatched: 2 },
    } as any;
    mediaRepo.rows.push(item);

    mockedAxios.get
      .mockResolvedValueOnce({ data: {
        id: 42,
        name: "Example Show",
        overview: "A useful synopsis",
        status: "Returning Series",
        seasons: [
          { id: 400, season_number: 0, name: "Specials", episode_count: 1 },
          { id: 401, season_number: 1, name: "Season 1", episode_count: 3 },
        ],
      } } as any)
      .mockResolvedValueOnce({ data: { episodes: [
        { id: 1, season_number: 0, episode_number: 1, name: "Special" },
      ] } } as any)
      .mockResolvedValueOnce({ data: { episodes: [
        { id: 11, season_number: 1, episode_number: 1, name: "Pilot", air_date: "2025-01-01" },
        { id: 12, season_number: 1, episode_number: 2, name: "Second", air_date: "2025-01-08" },
        { id: 13, season_number: 1, episode_number: 3, name: "Third", air_date: "2025-01-15" },
      ] } } as any);

    const view = await service.syncItem(account, item);

    expect(view.seasons).toHaveLength(2);
    expect(view.progress).toMatchObject({ watched: 2, total: 3, seasonNumber: 1, episodeNumber: 2 });
    expect(view.nextEpisode).toMatchObject({ seasonNumber: 1, number: 3, title: "Third" });
    expect(episodeRepo.rows.find((episode) => episode.seasonNumber === 0)?.watched).toBe(false);
    expect(episodeRepo.rows.filter((episode) => episode.seasonNumber === 1 && episode.watched)).toHaveLength(2);
    expect(item.metadata).toMatchObject({ episodes: 3, episodesWatched: 2, seasons: 1, catalogSyncState: "ready" });
  });

  it("keeps anime releases separate while connecting provider-supplied continuity", async () => {
    const item = {
      id: "anime-1",
      accountId: account.id,
      title: "First Season",
      type: MediaType.ANIME,
      externalIds: { malId: 100 },
      metadata: {},
    } as any;
    const sequel = {
      id: "anime-2",
      accountId: account.id,
      title: "Second Season",
      type: MediaType.ANIME,
      externalIds: { malId: 200 },
      metadata: {},
    } as any;
    mediaRepo.rows.push(item, sequel);
    mockedAxios.get.mockResolvedValueOnce({ data: { data: {
      mal_id: 100,
      title: "First Season",
      synopsis: "A complete provider synopsis.",
      episodes: 12,
      images: { jpg: { large_image_url: "https://img.example/first-season.jpg" } },
      aired: { from: "2024-04-05T00:00:00+00:00", to: "2024-06-21T00:00:00+00:00" },
      relations: [{ relation: "Sequel", entry: [{ mal_id: 200, type: "anime", name: "Second Season" }] }],
    } } } as any);

    const view = await service.syncItem(account, item);

    expect(view.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ relationType: "sequel", targetMalId: 200, targetMediaItemId: "anime-2" }),
    ]));
    expect(item.metadata).toMatchObject({ catalogSyncState: "ready" });
    expect(item.metadata).toMatchObject({
      synopsis: "A complete provider synopsis.",
      episodes: 12,
      releaseStartDate: "2024-04-05",
      releaseEndDate: "2024-06-21",
    });
    expect(item.coverUrl).toBe("https://img.example/first-season.jpg");
  });

  it("falls back to AniList when Jikan rejects the deployed server", async () => {
    const item = {
      id: "anime-fallback",
      accountId: account.id,
      title: "Attack on Titan Final Chapters",
      type: MediaType.ANIME,
      externalIds: { malId: 51535 },
      metadata: {},
    } as any;
    mediaRepo.rows.push(item);
    mockedAxios.get.mockRejectedValueOnce({ response: { status: 403 } });
    mockedAxios.post.mockResolvedValueOnce({ data: { data: { Media: {
      idMal: 51535,
      title: { romaji: "Shingeki no Kyojin: The Final Season - Kanketsu-hen" },
      description: "The conclusion.",
      episodes: 2,
      format: "SPECIAL",
      status: "FINISHED",
      averageScore: 88,
      startDate: { year: 2023, month: 3, day: 4 },
      endDate: { year: 2023, month: 11, day: 5 },
      coverImage: { extraLarge: "https://img.example/aot.jpg" },
      genres: ["Action", "Drama"],
      studios: { nodes: [{ name: "MAPPA" }] },
      relations: { edges: [{
        relationType: "PREQUEL",
        node: { idMal: 48583, type: "ANIME", title: { romaji: "Attack on Titan Final Season Part 2" }, coverImage: { large: "https://img.example/prequel.jpg" }, startDate: { year: 2022 } },
      }] },
    } } } } as any);

    const view = await service.syncItem(account, item);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://graphql.anilist.co",
      expect.objectContaining({ variables: { malId: 51535 } }),
      expect.objectContaining({ timeout: 15000 }),
    );
    expect(item.coverUrl).toBe("https://img.example/aot.jpg");
    expect(item.metadata).toMatchObject({
      catalogSyncState: "ready",
      episodes: 2,
      studios: ["MAPPA"],
      genres: ["Action", "Drama"],
      releaseStartDate: "2023-03-04",
      releaseEndDate: "2023-11-05",
    });
    expect(view.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ relationType: "prequel", targetMalId: 48583 }),
    ]));
  });

  it("synchronizes eligible imported titles and reports progress without failing the import", async () => {
    const anime = {
      id: "anime-1", accountId: account.id, type: MediaType.ANIME,
      externalIds: { malId: 100 }, metadata: {},
    } as any;
    const manga = {
      id: "manga-1", accountId: account.id, type: MediaType.MANGA,
      externalIds: { malId: 200 }, metadata: {},
    } as any;
    const progress = jest.fn();
    jest.spyOn(service, "syncItem").mockResolvedValue({} as any);

    const result = await service.syncImportedItems(account, [anime, manga], progress);

    expect(result).toEqual({ eligible: 1, synced: 1, failed: 0 });
    expect(service.syncItem).toHaveBeenCalledWith(account, anime);
    expect(progress).toHaveBeenCalledWith({ current: 1, total: 1, synced: 1, failed: 0, item: anime });
  });

  it("preserves concrete watch state during an idempotent refresh", async () => {
    const item = {
      id: "tv-1",
      accountId: account.id,
      title: "Example Show",
      type: MediaType.TV,
      externalIds: { tmdbId: 42 },
      metadata: { episodesWatched: 1, catalogSyncedAt: "2026-01-01T00:00:00.000Z" },
    } as any;
    mediaRepo.rows.push(item);
    const season = { id: "season-1", accountId: account.id, mediaItemId: item.id, number: 1, name: "Season 1" };
    seasonRepo.rows.push(season);
    episodeRepo.rows.push({
      id: "episode-1", accountId: account.id, mediaItemId: item.id, seasonId: season.id,
      seasonNumber: 1, number: 1, title: "Pilot", watched: true, watchedAt: new Date("2026-01-02T00:00:00Z"),
    });
    mockedAxios.get
      .mockResolvedValueOnce({ data: { seasons: [{ id: 401, season_number: 1, name: "Season 1", episode_count: 1 }] } } as any)
      .mockResolvedValueOnce({ data: { episodes: [{ id: 11, season_number: 1, episode_number: 1, name: "Pilot updated" }] } } as any);

    await service.syncItem(account, item);

    expect(episodeRepo.rows).toHaveLength(1);
    expect(episodeRepo.rows[0]).toMatchObject({ title: "Pilot updated", watched: true });
    expect(episodeRepo.rows[0].watchedAt).toEqual(new Date("2026-01-02T00:00:00Z"));
  });

  it("records a concrete episode transition and maintains aggregate compatibility", async () => {
    const item = {
      id: "tv-1",
      accountId: account.id,
      title: "Example Show",
      type: MediaType.TV,
      externalIds: { tmdbId: 42 },
      status: MediaStatus.PLANNING,
      startDate: null,
      endDate: null,
      metadata: { episodesWatched: 0 },
    } as any;
    const season = { id: "season-1", accountId: account.id, mediaItemId: item.id, number: 1, name: "Season 1" };
    const episode = {
      id: "episode-1", accountId: account.id, mediaItemId: item.id, seasonId: season.id,
      seasonNumber: 1, number: 1, title: "Pilot", watched: false, watchedAt: null,
    };
    mediaRepo.rows.push(item);
    seasonRepo.rows.push(season);
    episodeRepo.rows.push(episode);

    const watchedView = await service.setEpisodeWatched(account, item, episode.id, true);

    expect(episode).toMatchObject({ watched: true });
    expect(episode.watchedAt).toBeInstanceOf(Date);
    expect(item.metadata.episodesWatched).toBe(1);
    expect(item.status).toBe(MediaStatus.COMPLETED);
    expect(item.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(item.endDate).toBe(item.startDate);
    expect(item.metadata).toMatchObject({
      trackingStatusSource: "episode-progress",
      startDateSource: "episode-progress",
      endDateSource: "episode-progress",
    });
    expect(watchedView.progress.watched).toBe(1);

    await service.setEpisodeWatched(account, item, episode.id, false);
    expect(episode).toMatchObject({ watched: false, watchedAt: null });
    expect(item.metadata.episodesWatched).toBe(0);
    expect(item.status).toBe(MediaStatus.WATCHING);
    expect(item.endDate).toBeNull();
    expect(item.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns a navigable MAL preview for an untracked related release", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: {
      mal_id: 300,
      title: "Third Season",
      synopsis: "The story continues.",
      images: { jpg: { large_image_url: "https://img.example/300.jpg" } },
      aired: { from: "2026-01-09T00:00:00+00:00", to: null },
      year: 2026,
      type: "TV",
      status: "Currently Airing",
      score: 8.2,
      episodes: 12,
      studios: [{ name: "Bones" }],
      genres: [{ name: "Action" }],
      relations: [{ relation: "Prequel", entry: [{ mal_id: 200, type: "anime", name: "Second Season" }] }],
    } } } as any);

    const preview = await service.getAnimePreview(300);

    expect(preview.item).toMatchObject({
      title: "Third Season",
      type: MediaType.ANIME,
      coverUrl: "https://img.example/300.jpg",
      externalIds: { malId: 300 },
      metadata: expect.objectContaining({
        synopsis: "The story continues.",
        releaseStartDate: "2026-01-09",
        releaseEndDate: null,
        year: 2026,
        mediaFormat: "TV",
        airingStatus: "Currently Airing",
        malScore: 8.2,
        episodes: 12,
        studios: ["Bones"],
        genres: ["Action"],
      }),
    });
    expect(preview.relations).toEqual([
      expect.objectContaining({ relationType: "prequel", targetMalId: 200, targetTitle: "Second Season" }),
    ]);
  });

  it("does not overwrite an explicit paused status or personal dates", async () => {
    const item = {
      id: "tv-manual",
      accountId: account.id,
      type: MediaType.TV,
      status: MediaStatus.PAUSED,
      startDate: "2025-01-10",
      endDate: null,
      metadata: { episodesWatched: 0 },
    } as any;
    const season = { id: "season-manual", accountId: account.id, mediaItemId: item.id, number: 1 };
    const episode = {
      id: "episode-manual", accountId: account.id, mediaItemId: item.id, seasonId: season.id,
      seasonNumber: 1, number: 1, watched: false, watchedAt: null,
    };
    mediaRepo.rows.push(item);
    seasonRepo.rows.push(season);
    episodeRepo.rows.push(episode);

    await service.setEpisodeWatched(account, item, episode.id, true);

    expect(item.status).toBe(MediaStatus.PAUSED);
    expect(item.startDate).toBe("2025-01-10");
    expect(item.endDate).toBeNull();
  });

  it("rejects episode progress from another title or account", async () => {
    const item = { id: "tv-1", accountId: account.id, type: MediaType.TV, metadata: {} } as any;
    mediaRepo.rows.push(item);
    episodeRepo.rows.push({
      id: "foreign", accountId: "account-2", mediaItemId: "tv-2", seasonId: "season-2",
      seasonNumber: 1, number: 1, title: "Foreign", watched: false,
    });

    await expect(service.setEpisodeWatched(account, item, "foreign", true))
      .rejects.toMatchObject({ status: 404 });
  });

  it("builds all library summaries with three account-scoped catalog reads", async () => {
    const first = { id: "tv-1", accountId: account.id, type: MediaType.TV, metadata: {} } as any;
    const second = { id: "tv-2", accountId: account.id, type: MediaType.TV, metadata: {} } as any;
    const firstSeason = { id: "season-1", accountId: account.id, mediaItemId: first.id, number: 1, name: "Season 1" };
    const secondSeason = { id: "season-2", accountId: account.id, mediaItemId: second.id, number: 1, name: "Season 1" };
    seasonRepo.rows.push(firstSeason, secondSeason);
    episodeRepo.rows.push(
      { id: "ep-1", accountId: account.id, mediaItemId: first.id, seasonId: firstSeason.id, seasonNumber: 1, number: 1, title: "One", watched: true },
      { id: "ep-2", accountId: account.id, mediaItemId: second.id, seasonId: secondSeason.id, seasonNumber: 1, number: 1, title: "One", watched: false },
    );

    const summaries = await service.getCatalogSummaries(account, [first, second]);

    expect(summaries[first.id].progress.watched).toBe(1);
    expect(summaries[second.id].nextEpisode).toMatchObject({ id: "ep-2" });
    expect(summaries[first.id].seasons).toEqual([]);
    expect(summaries[first.id].relations).toEqual([]);
    expect(seasonRepo.find).toHaveBeenCalledTimes(1);
    expect(episodeRepo.find).toHaveBeenCalledTimes(1);
    expect(relationRepo.find).toHaveBeenCalledTimes(1);
  });
});
