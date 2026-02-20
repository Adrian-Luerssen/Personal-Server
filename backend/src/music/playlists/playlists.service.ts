import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Playlist } from "./playlist.entity";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm/lib/typeorm-crud.service";
import { resolveTimeframe } from "src/utils/utils";
import { Stream } from "../streams/stream.entity";

@Injectable()
export class PlaylistsService extends TypeOrmCrudService<Playlist> {
  constructor(@InjectRepository(Playlist) public repo: Repository<Playlist>) {
    super(repo);
  }

  async findBySpotifyId(spotifyId: string): Promise<Playlist | null> {
    return await this.repo.findOne({ where: { spotifyId } });
  }

  async createOrUpdateFromSpotify(data: any): Promise<Playlist> {
    let playlist = await this.findBySpotifyId(data.id);
    if (!playlist) playlist = this.repo.create();
    playlist.title = data.name;
    playlist.spotifyId = data.id;
    playlist.spotifyUri = data.uri;
    playlist.spotifyHref = data.href;
    playlist.description = data.description;
    playlist.ownerId = data.owner?.id;
    playlist.totalTracks = data.tracks?.total || data.total_tracks || 0;
    playlist.images = data.images || [];
    await this.repo.save(playlist);
    return playlist;
  }

  async getTopPlaylistsByPlatform(
    accountId: string,
    platform: string,
    limit: number,
    opts: { timeframe?: string; from?: string; to?: string }
  ): Promise<{ playlistId: string; title: string; count: number }[]> {
    // Implement your logic to get top playlists by platform
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);
    const qb = this.repo
      .createQueryBuilder("playlist")
      // Join streams where source is playlist and JSON context.playlistId matches this playlist id
      .innerJoin(
        Stream,
        "stream",
        "stream.source = 'playlist' AND (stream.context ->> 'playlistId') = playlist.id::text AND stream.platform = :platform",
        { platform }
      )
      .select("playlist.id", "playlistId")
      .addSelect("playlist.title", "title")
      .addSelect("COUNT(*)", "count")
      .where("stream.accountId = :accountId", { accountId })
      .groupBy("playlist.id, playlist.title")
      .orderBy("count", "DESC")
      .limit(limit);
    if (start) {
      qb.andWhere("stream.streamedAt BETWEEN :start AND :end", { start, end });
    }
    const rows = await qb.getRawMany<{
      playlistId: string;
      title: string;
      count: string;
    }>();
    return rows.map((r) => ({
      playlistId: r.playlistId,
      title: r.title,
      count: Number(r.count),
    }));
  }

  async getGlobalTopPlaylistsByPlatform(
    platform: string,
    limit: number,
    opts: { timeframe?: string; from?: string; to?: string }
  ): Promise<{ playlistId: string; title: string; count: number }[]> {
    // Implement your logic to get top playlists by platform
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);
    const qb = this.repo
      .createQueryBuilder("playlist")
      .innerJoin(
        Stream,
        "stream",
        "stream.source = 'playlist' AND (stream.context ->> 'playlistId') = playlist.id AND stream.platform = :platform",
        { platform }
      )
      .select("playlist.id", "playlistId")
      .addSelect("playlist.title", "title")
      .addSelect("COUNT(*)", "count")
      .groupBy("playlist.id, playlist.title")
      .orderBy("count", "DESC")
      .limit(limit);
    if (start) {
      qb.andWhere("stream.streamedAt BETWEEN :start AND :end", { start, end });
    }
    const rows = await qb.getRawMany<{
      playlistId: string;
      title: string;
      count: string;
    }>();
    return rows.map((r) => ({
      playlistId: r.playlistId,
      title: r.title,
      count: Number(r.count),
    }));
  }
}
