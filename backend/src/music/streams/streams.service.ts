// ...existing code...
import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { Stream, StreamPlatform, StreamType } from "./stream.entity";
import { resolveTimeframe } from "../../utils/utils";
import { SyncOperation } from "../../sync/sync-event.entity";
import { SyncService } from "../../sync/sync.service";

@Injectable()
export class StreamsService extends TypeOrmCrudService<Stream> {
  // ...existing code...

  /**
   * Returns the number of streams for every day in the timeframe, filling missing days with 0.
   */
  async getStreamsPerDay(
    accountId: string,
    opts: { timeframe?: string; from?: string; to?: string }
  ): Promise<Array<{ date: string; count: number }>> {
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);
    // Query for counts per day
    const qb = this.repo
      .createQueryBuilder("stream")
      .select("DATE(stream.streamedAt)", "date")
      .addSelect("COUNT(*)", "count")
      .where("stream.accountId = :accountId", { accountId });
    if (start) {
      qb.andWhere("stream.streamedAt BETWEEN :start AND :end", { start, end });
    }
    qb.groupBy("date").orderBy("date", "ASC");
    const rows = await qb.getRawMany<{ date: string; count: string }>();

    // Fill missing days with 0
    const result: Array<{ date: string; count: number }> = [];
    const dateMap = new Map<string, number>();
    for (const r of rows) {
      // Normalize date to YYYY-MM-DD format
      const normalizedDate = new Date(r.date).toISOString().slice(0, 10);
      dateMap.set(normalizedDate, Number(r.count));
    }
    // Determine range
    const first = start
      ? new Date(start)
      : rows.length
      ? new Date(rows[0].date)
      : new Date();
    const last = end
      ? new Date(end)
      : rows.length
      ? new Date(rows[rows.length - 1].date)
      : new Date();
    let d = new Date(first);
    d.setHours(0, 0, 0, 0);
    const lastDay = new Date(last);
    lastDay.setHours(0, 0, 0, 0);
    while (d <= lastDay) {
      const iso = d.toISOString().slice(0, 10);
      result.push({ date: iso, count: dateMap.get(iso) ?? 0 });
      d.setDate(d.getDate() + 1);
    }
    return result;
  }

  /**
   * Returns the number of streams for each hour (0-23) in the timeframe, filling missing hours with 0.
   */
  async getStreamsPerHour(
    accountId: string,
    opts: { timeframe?: string; from?: string; to?: string }
  ): Promise<Array<{ hour: number; count: number }>> {
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);
    // Query for counts per hour
    const qb = this.repo
      .createQueryBuilder("stream")
      .select("EXTRACT(HOUR FROM stream.streamedAt)", "hour")
      .addSelect("COUNT(*)", "count")
      .where("stream.accountId = :accountId", { accountId });
    if (start) {
      qb.andWhere("stream.streamedAt BETWEEN :start AND :end", { start, end });
    }
    qb.groupBy("hour").orderBy("hour", "ASC");
    const rows = await qb.getRawMany<{ hour: string; count: string }>();

    // Fill missing hours with 0
    const result: Array<{ hour: number; count: number }> = [];
    const hourMap = new Map<number, number>();
    for (const r of rows) {
      hourMap.set(Number(r.hour), Number(r.count));
    }
    for (let h = 0; h < 24; h++) {
      result.push({ hour: h, count: hourMap.get(h) ?? 0 });
    }
    return result;
  }
  constructor(
    @InjectRepository(Stream) repo: Repository<Stream>,
    @Optional()
    private readonly syncService?: SyncService
  ) {
    super(repo);
  }

  async getTrackStreams(accountId: string, trackId: string) {
    return this.repo.find({ where: { accountId, trackId } });
  }

  async getTrackStreamsByPlatform(accountId: string, trackId: string) {
    const rows = await this.repo
      .createQueryBuilder("stream")
      .select("stream.platform", "platform")
      .addSelect("COUNT(*)", "count")
      .where("stream.trackId = :trackId", { trackId })
      .andWhere("stream.accountId = :accountId", { accountId })
      .groupBy("stream.platform")
      .getRawMany();

    return rows.reduce((acc, r) => {
      acc[r.platform] = Number(r.count);
      return acc;
    }, {} as Record<string, number>);
  }

  async getTrackStreamsOverTime(
    accountId: string,
    trackId: string,
    granularity: "day" | "week" | "month" = "day"
  ) {
    const dateTrunc = granularity;
    return await this.repo
      .createQueryBuilder("stream")
      .select(`date_trunc('${dateTrunc}', stream.streamedAt)`, "bucket")
      .addSelect("COUNT(*)", "count")
      .where("stream.trackId = :trackId", { trackId })
      .andWhere("stream.accountId = :accountId", { accountId })
      .groupBy("bucket")
      .orderBy("bucket", "ASC")
      .getRawMany();
  }

  async getTopTracksByPlatform(
    accountId: string,
    platform: StreamPlatform,
    limit = 50,
    opts?: { timeframe?: string; from?: string; to?: string }
  ) {
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);
    const qb = this.repo
      .createQueryBuilder("stream")
      .select("stream.trackId", "trackId")
      .addSelect("COUNT(distinct stream.id)", "count")
      .leftJoin("stream.track", "track")
      .leftJoin("track.artists", "artist")
      .addSelect(
        "COALESCE(NULLIF(string_agg(DISTINCT artist.name, ', '), ''), NULL)",
        "artists"
      )
      .where("stream.platform = :platform", { platform })
      .andWhere("stream.accountId = :accountId", { accountId })
      .groupBy("stream.trackId")
      .orderBy("count", "DESC")
      .limit(limit);
    if (start) {
      qb.andWhere("stream.streamedAt BETWEEN :start AND :end", { start, end });
    }
    const result = await qb.getRawMany();
    return result;
  }

  async getStreamsHistory(
    accountId: string,
    page: number = 1,
    pageSize: number = 10
  ) {
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.max(1, Number(pageSize) || 10);

    const total = await this.repo.count({ where: { accountId } });

    const items = await this.repo
      .createQueryBuilder("stream")
      .leftJoin("stream.track", "track")
      .leftJoin("track.artists", "artist")
      .select("stream.id", "id")
      .addSelect("stream.streamedAt", "streamedAt")
      .addSelect("stream.platform", "platform")
      .addSelect("stream.streamType", "streamType")
      .addSelect("stream.trackId", "trackId")
      .addSelect("track.title", "trackTitle")
      .addSelect(
        "COALESCE(NULLIF(string_agg(DISTINCT artist.name, ', '), ''), NULL)",
        "artistName"
      )
      .where("stream.accountId = :accountId", { accountId })
      .groupBy("stream.id, track.id")
      .orderBy("stream.streamedAt", "DESC")
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize)
      .getRawMany();

    return {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.ceil(total / safePageSize),
      items,
    };
  }

  async getSpotifyUserRanking(opts: {
    timeframe?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<{
    start?: string;
    end: string;
    timeframe: string;
    items: Array<{
      rank: number;
      accountId: string;
      displayName: string;
      spotifyUserId?: string;
      streamCount: number;
      uniqueTracks: number;
      msListened: number;
      lastStream?: string;
    }>;
  }> {
    const { timeframe, from, to } = opts || {};
    const { start, end, label } = resolveTimeframe(timeframe, from, to);
    const safeLimit = Math.min(Math.max(Number(opts?.limit) || 50, 1), 100);

    const qb = this.repo
      .createQueryBuilder("stream")
      .innerJoin("stream.track", "track")
      .leftJoin(
        "app_spotify_credentials",
        "spotify",
        'spotify."accountId" = stream."accountId"'
      )
      .leftJoin(
        "app_account",
        "acct",
        'acct.id = stream."accountId"'
      )
      .select('stream."accountId"', "accountId")
      .addSelect(
        `COALESCE(
          MAX(NULLIF(spotify."displayName", '')),
          MAX(NULLIF(acct.name, '')),
          MAX(NULLIF(spotify."spotifyUserId", '')),
          stream."accountId"::text
        )`,
        "displayName"
      )
      .addSelect('MAX(spotify."spotifyUserId")', "spotifyUserId")
      .addSelect("COUNT(*)", "streamCount")
      .addSelect('COUNT(DISTINCT stream."trackId")', "uniqueTracks")
      .addSelect("COALESCE(SUM(track.duration), 0)", "msListened")
      .addSelect('MAX(stream."streamedAt")', "lastStream")
      .where("stream.platform = :platform", { platform: StreamPlatform.SPOTIFY })
      .andWhere("stream.streamType = :streamType", { streamType: StreamType.PLAY })
      .andWhere("stream.isValidPlay = true")
      .groupBy('stream."accountId"')
      .orderBy("COUNT(*)", "DESC")
      .addOrderBy('MAX(stream."streamedAt")', "DESC")
      .limit(safeLimit);

    if (start) {
      qb.andWhere("stream.streamedAt BETWEEN :start AND :end", { start, end });
    }

    const rows = await qb.getRawMany<{
      accountId: string;
      displayName?: string;
      spotifyUserId?: string;
      streamCount: string;
      uniqueTracks: string;
      msListened: string;
      lastStream?: string;
    }>();

    return {
      start: start?.toISOString(),
      end: end.toISOString(),
      timeframe: label,
      items: rows.map((row, index) => ({
        rank: index + 1,
        accountId: row.accountId,
        displayName: row.displayName || "Spotify User",
        spotifyUserId: row.spotifyUserId || undefined,
        streamCount: Number(row.streamCount || 0),
        uniqueTracks: Number(row.uniqueTracks || 0),
        msListened: Number(row.msListened || 0),
        lastStream: row.lastStream
          ? new Date(row.lastStream).toISOString()
          : undefined,
      })),
    };
  }

  async ingestStream(accountId: string, data: Partial<Stream>) {
    const stream = this.repo.create({
      platform: data.platform!,
      streamType: data.streamType ?? StreamType.PLAY,
      streamedAt: data.streamedAt ?? new Date(),
      trackId: data.trackId!,
      accountId,
      isValidPlay: data.isValidPlay ?? true,
      source: data.source,
      context: data.context,
    });

    const saved = await this.repo.save(stream);
    await this.recordSync(accountId, saved, SyncOperation.UPSERT);
    return saved;
  }

  async getStats(
    accountId: string,
    opts: { timeframe?: string; from?: string; to?: string }
  ): Promise<{
    start?: string;
    end: string;
    totalStreams: number;
    msListened: number;
    uniqueTracks: number;
    uniqueArtists: number;
    firstStream?: string;
    lastStream?: string;
    streamsByPlatform: Record<string, number>;
    topTrack?: { trackId: string; count: number; artists?: string } | null;
  }> {
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);

    const baseQB = this.repo
      .createQueryBuilder("stream")
      .innerJoin("stream.track", "track")
      .where("stream.accountId = :accountId", { accountId });

    if (start) {
      baseQB.andWhere("stream.streamedAt BETWEEN :start AND :end", {
        start,
        end,
      });
    }

    // Aggregates: total streams, ms listened, unique tracks, unique artists, first/last stream
    const agg = await baseQB
      .clone()
      .select("COUNT(*)", "totalStreams")
      .addSelect("COALESCE(SUM(track.duration), 0)", "msListened")
      .addSelect("COUNT(DISTINCT stream.trackId)", "uniqueTracks")
      .addSelect("MIN(stream.streamedAt)", "firstStream")
      .addSelect("MAX(stream.streamedAt)", "lastStream")
      .getRawOne<{
        totalStreams: string;
        msListened: string;
        uniqueTracks: string;
        firstStream?: string;
        lastStream?: string;
      }>();
    const agg2 = await baseQB
      .clone()
      .leftJoin("track.artists", "artist")
      .select("COUNT(DISTINCT artist.id)", "uniqueArtists")
      .getRawOne<{
        uniqueArtists: string;
      }>();

    const totalStreams = Number(agg?.totalStreams || 0);
    const msListened = Number(agg?.msListened || 0);
    const uniqueTracks = Number(agg?.uniqueTracks || 0);
    const uniqueArtists = Number(agg2?.uniqueArtists || 0);
    const firstStream = agg?.firstStream
      ? new Date(agg.firstStream).toISOString()
      : undefined;
    const lastStream = agg?.lastStream
      ? new Date(agg.lastStream).toISOString()
      : undefined;

    // Streams by platform
    const platformRows = await baseQB
      .clone()
      .select("stream.platform", "platform")
      .addSelect("COUNT(*)", "count")
      .groupBy("stream.platform")
      .getRawMany<{ platform: string; count: string }>();
    const streamsByPlatform = platformRows.reduce((acc, r) => {
      acc[r.platform] = Number(r.count);
      return acc;
    }, {} as Record<string, number>);

    // Top track in range
    const topRow = await baseQB
      .clone()
      .select("stream.trackId", "trackId")
      .addSelect("COUNT(*)", "count")
      .leftJoin("track.artists", "artist")
      .addSelect(
        "COALESCE(NULLIF(string_agg(DISTINCT artist.name, ', '), ''), NULL)",
        "artists"
      )
      .groupBy("stream.trackId")
      .orderBy("count", "DESC")
      .limit(1)
      .getRawOne<{ trackId: string; count: string; artists?: string }>();

    return {
      start: start?.toISOString(),
      end: end.toISOString(),
      totalStreams,
      msListened,
      uniqueTracks,
      uniqueArtists,
      firstStream,
      lastStream,
      streamsByPlatform,
      topTrack: topRow
        ? {
            trackId: topRow.trackId,
            count: Number(topRow.count),
            artists: topRow.artists || undefined,
          }
        : null,
    };
  }

  /**
   * Returns average audio features (mood/energy) for user's streams in a timeframe.
   */
  async getMoodAnalysis(
    accountId: string,
    opts: { timeframe?: string; from?: string; to?: string }
  ) {
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);

    const qb = this.repo
      .createQueryBuilder("stream")
      .innerJoin("stream.track", "track")
      .where("stream.accountId = :accountId", { accountId })
      .andWhere("track.audioFeatures IS NOT NULL");

    if (start) {
      qb.andWhere("stream.streamedAt BETWEEN :start AND :end", { start, end });
    }

    const rows = await qb
      .select("track.audioFeatures", "audioFeatures")
      .addSelect("track.bpm", "bpm")
      .getRawMany();

    if (rows.length === 0) {
      return { totalTracks: 0, averages: null, distribution: null };
    }

    // Aggregate averages
    const sums = { danceability: 0, energy: 0, valence: 0, acousticness: 0, instrumentalness: 0, speechiness: 0, liveness: 0 };
    const bpmSum = { total: 0, count: 0 };
    let count = 0;

    for (const row of rows) {
      const af = typeof row.audioFeatures === 'string' ? JSON.parse(row.audioFeatures) : row.audioFeatures;
      if (!af) continue;
      count++;
      for (const key of Object.keys(sums)) {
        if (af[key] != null) sums[key] += af[key];
      }
      if (row.bpm) { bpmSum.total += Number(row.bpm); bpmSum.count++; }
    }

    const averages = {} as Record<string, number>;
    for (const [key, sum] of Object.entries(sums)) {
      averages[key] = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
    }
    averages.bpm = bpmSum.count > 0 ? Math.round(bpmSum.total / bpmSum.count) : 0;

    // Energy distribution buckets
    const energyBuckets = { low: 0, medium: 0, high: 0 };
    const valenceBuckets = { sad: 0, neutral: 0, happy: 0 };

    for (const row of rows) {
      const af = typeof row.audioFeatures === 'string' ? JSON.parse(row.audioFeatures) : row.audioFeatures;
      if (!af) continue;
      if (af.energy != null) {
        if (af.energy < 0.33) energyBuckets.low++;
        else if (af.energy < 0.66) energyBuckets.medium++;
        else energyBuckets.high++;
      }
      if (af.valence != null) {
        if (af.valence < 0.33) valenceBuckets.sad++;
        else if (af.valence < 0.66) valenceBuckets.neutral++;
        else valenceBuckets.happy++;
      }
    }

    return {
      totalTracks: count,
      averages,
      distribution: { energy: energyBuckets, mood: valenceBuckets },
    };
  }

  // ===== GLOBAL METHODS (all users) =====

  async getGlobalStats(opts: {
    timeframe?: string;
    from?: string;
    to?: string;
  }): Promise<{
    start?: string;
    end: string;
    totalStreams: number;
    msListened: number;
    uniqueTracks: number;
    uniqueArtists: number;
    uniqueUsers: number;
    firstStream?: string;
    lastStream?: string;
    streamsByPlatform: Record<string, number>;
    topTrack?: { trackId: string; count: number; artists?: string } | null;
  }> {
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);

    const baseQB = this.repo
      .createQueryBuilder("stream")
      .innerJoin("stream.track", "track");

    if (start) {
      baseQB.andWhere("stream.streamedAt BETWEEN :start AND :end", {
        start,
        end,
      });
    }

    const agg = await baseQB
      .clone()
      .select("COUNT(*)", "totalStreams")
      .addSelect("COALESCE(SUM(track.duration), 0)", "msListened")
      .addSelect("COUNT(DISTINCT stream.trackId)", "uniqueTracks")
      .addSelect("COUNT(DISTINCT stream.accountId)", "uniqueUsers")
      .addSelect("MIN(stream.streamedAt)", "firstStream")
      .addSelect("MAX(stream.streamedAt)", "lastStream")
      .getRawOne<{
        totalStreams: string;
        msListened: string;
        uniqueTracks: string;
        uniqueUsers: string;
        firstStream?: string;
        lastStream?: string;
      }>();

    const agg2 = await baseQB
      .clone()
      .leftJoin("track.artists", "artist")
      .select("COUNT(DISTINCT artist.id)", "uniqueArtists")
      .getRawOne<{
        uniqueArtists: string;
      }>();

    const totalStreams = Number(agg?.totalStreams || 0);
    const msListened = Number(agg?.msListened || 0);
    const uniqueTracks = Number(agg?.uniqueTracks || 0);
    const uniqueArtists = Number(agg2?.uniqueArtists || 0);
    const uniqueUsers = Number(agg?.uniqueUsers || 0);
    const firstStream = agg?.firstStream
      ? new Date(agg.firstStream).toISOString()
      : undefined;
    const lastStream = agg?.lastStream
      ? new Date(agg.lastStream).toISOString()
      : undefined;

    const platformRows = await baseQB
      .clone()
      .select("stream.platform", "platform")
      .addSelect("COUNT(*)", "count")
      .groupBy("stream.platform")
      .getRawMany<{ platform: string; count: string }>();
    const streamsByPlatform = platformRows.reduce((acc, r) => {
      acc[r.platform] = Number(r.count);
      return acc;
    }, {} as Record<string, number>);

    const topRow = await baseQB
      .clone()
      .select("stream.trackId", "trackId")
      .addSelect("COUNT(*)", "count")
      .leftJoin("track.artists", "artist")
      .addSelect(
        "COALESCE(NULLIF(string_agg(DISTINCT artist.name, ', '), ''), NULL)",
        "artists"
      )
      .groupBy("stream.trackId")
      .orderBy("count", "DESC")
      .limit(1)
      .getRawOne<{ trackId: string; count: string; artists?: string }>();

    return {
      start: start?.toISOString(),
      end: end.toISOString(),
      totalStreams,
      msListened,
      uniqueTracks,
      uniqueArtists,
      uniqueUsers,
      firstStream,
      lastStream,
      streamsByPlatform,
      topTrack: topRow
        ? {
            trackId: topRow.trackId,
            count: Number(topRow.count),
            artists: topRow.artists || undefined,
          }
        : null,
    };
  }

  async getGlobalTopTracksByPlatform(
    platform: StreamPlatform,
    limit = 50,
    opts?: { timeframe?: string; from?: string; to?: string }
  ) {
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);
    const qb = this.repo
      .createQueryBuilder("stream")
      .select("stream.trackId", "trackId")
      .addSelect("COUNT(*)", "count")
      .leftJoin("stream.track", "track")
      .leftJoin("track.artists", "artist")
      .addSelect(
        "COALESCE(NULLIF(string_agg(DISTINCT artist.name, ', '), ''), NULL)",
        "artists"
      )
      .where("stream.platform = :platform", { platform })
      .groupBy("stream.trackId")
      .orderBy("count", "DESC")
      .limit(limit);
    if (start) {
      qb.andWhere("stream.streamedAt BETWEEN :start AND :end", { start, end });
    }
    return await qb.getRawMany();
  }

  async getGlobalStreamsHistory(page: number = 1, pageSize: number = 10) {
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.max(1, Number(pageSize) || 10);

    const total = await this.repo.count();

    const items = await this.repo
      .createQueryBuilder("stream")
      .leftJoin("stream.track", "track")
      .leftJoin("track.artists", "artist")
      .select("stream.id", "id")
      .addSelect("stream.accountId", "accountId")
      .addSelect("stream.streamedAt", "streamedAt")
      .addSelect("stream.platform", "platform")
      .addSelect("stream.streamType", "streamType")
      .addSelect("stream.trackId", "trackId")
      .addSelect("track.title", "trackTitle")
      .addSelect(
        "COALESCE(NULLIF(string_agg(DISTINCT artist.name, ', '), ''), NULL)",
        "artistName"
      )
      .groupBy("stream.id, track.id")
      .orderBy("stream.streamedAt", "DESC")
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize)
      .getRawMany();

    return {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.ceil(total / safePageSize),
      items,
    };
  }

  async getGlobalStreamsPerDay(opts: {
    timeframe?: string;
    from?: string;
    to?: string;
  }): Promise<Array<{ date: string; count: number }>> {
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);
    const qb = this.repo
      .createQueryBuilder("stream")
      .select("DATE(stream.streamedAt)", "date")
      .addSelect("COUNT(*)", "count");
    if (start) {
      qb.andWhere("stream.streamedAt BETWEEN :start AND :end", { start, end });
    }
    qb.groupBy("date").orderBy("date", "ASC");
    const rows = await qb.getRawMany<{ date: string; count: string }>();

    const result: Array<{ date: string; count: number }> = [];
    const dateMap = new Map<string, number>();
    for (const r of rows) {
      const normalizedDate = new Date(r.date).toISOString().slice(0, 10);
      dateMap.set(normalizedDate, Number(r.count));
    }
    const first = start
      ? new Date(start)
      : rows.length
      ? new Date(rows[0].date)
      : new Date();
    const last = end
      ? new Date(end)
      : rows.length
      ? new Date(rows[rows.length - 1].date)
      : new Date();
    let d = new Date(first);
    d.setHours(0, 0, 0, 0);
    const lastDay = new Date(last);
    lastDay.setHours(0, 0, 0, 0);
    while (d <= lastDay) {
      const iso = d.toISOString().slice(0, 10);
      result.push({ date: iso, count: dateMap.get(iso) ?? 0 });
      d.setDate(d.getDate() + 1);
    }
    return result;
  }

  async getGlobalStreamsPerHour(opts: {
    timeframe?: string;
    from?: string;
    to?: string;
  }): Promise<Array<{ hour: number; count: number }>> {
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);
    const qb = this.repo
      .createQueryBuilder("stream")
      .select("EXTRACT(HOUR FROM stream.streamedAt)", "hour")
      .addSelect("COUNT(*)", "count");
    if (start) {
      qb.andWhere("stream.streamedAt BETWEEN :start AND :end", { start, end });
    }
    qb.groupBy("hour").orderBy("hour", "ASC");
    const rows = await qb.getRawMany<{ hour: string; count: string }>();

    const result: Array<{ hour: number; count: number }> = [];
    const hourMap = new Map<number, number>();
    for (const r of rows) {
      hourMap.set(Number(r.hour), Number(r.count));
    }
    for (let h = 0; h < 24; h++) {
      result.push({ hour: h, count: hourMap.get(h) ?? 0 });
    }
    return result;
  }

  private async recordSync(
    accountId: string,
    stream: Stream,
    operation: SyncOperation
  ) {
    if (!this.syncService) return;
    await this.syncService.recordEvent(accountId, {
      entityType: "stream",
      entityId: stream.id,
      operation,
      payload: operation === SyncOperation.DELETE ? null : stream,
    });
  }
}
