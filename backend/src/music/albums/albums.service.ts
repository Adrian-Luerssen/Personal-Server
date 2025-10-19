import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { Album, AlbumType } from "./album.entity";
import { StreamPlatform } from "../streams/stream.entity";
import { resolveTimeframe } from "src/utils/utils";

@Injectable()
export class AlbumsService extends TypeOrmCrudService<Album> {
  constructor(@InjectRepository(Album) repo: Repository<Album>) {
    super(repo);
  }

  async findByTitle(title: string): Promise<Album | null> {
    return await this.repo.findOne({
      where: { title },
      relations: ["artists", "tracks"],
    });
  }

  async findBySpotifyId(spotifyId: string): Promise<Album | null> {
    return await this.repo.findOne({
      where: { spotifyId },
      relations: ["artists", "tracks"],
    });
  }

  async findByArtist(artistId: string): Promise<Album[]> {
    return await this.repo
      .createQueryBuilder("album")
      .leftJoinAndSelect("album.artists", "artist")
      .leftJoinAndSelect("album.tracks", "tracks")
      .where("artist.id = :artistId", { artistId })
      .orderBy("album.releaseDate", "DESC")
      .getMany();
  }

  async findByType(type: AlbumType): Promise<Album[]> {
    return await this.repo.find({
      where: { type },
      relations: ["artists", "tracks"],
      order: { releaseDate: "DESC" },
    });
  }

  async findByGenre(genre: string): Promise<Album[]> {
    const like = `%${genre}%`;
    return await this.repo
      .createQueryBuilder("album")
      .where("LOWER(album.genres) LIKE LOWER(:like)", { like })
      .leftJoinAndSelect("album.artists", "artist")
      .leftJoinAndSelect("album.tracks", "tracks")
      .orderBy("album.releaseDate", "DESC")
      .getMany();
  }

  async findByReleaseYear(year: number): Promise<Album[]> {
    return await this.repo
      .createQueryBuilder("album")
      .where("EXTRACT(year FROM album.releaseDate) = :year", { year })
      .leftJoinAndSelect("album.artists", "artist")
      .leftJoinAndSelect("album.tracks", "tracks")
      .orderBy("album.releaseDate", "DESC")
      .getMany();
  }

  async getTopAlbumsByStreams(limit: number = 10): Promise<Album[]> {
    return await this.repo.find({
      order: { totalStreams: "DESC" },
      take: limit,
      relations: ["artists", "tracks"],
    });
  }

  async getRecentAlbums(limit: number = 10): Promise<Album[]> {
    return await this.repo.find({
      order: { releaseDate: "DESC" },
      take: limit,
      relations: ["artists", "tracks"],
    });
  }

  async updateStreamCount(
    albumId: string,
    streamCount: number
  ): Promise<Album> {
    await this.repo.update(albumId, { totalStreams: streamCount });
    return await this.repo.findOne({
      where: { id: albumId },
      relations: ["artists", "tracks"],
    });
  }

  async updateTrackCount(albumId: string): Promise<Album> {
    const album = await this.repo.findOne({
      where: { id: albumId },
      relations: ["tracks"],
    });

    if (album) {
      album.trackCount = album.tracks.length;
      album.totalDuration = album.tracks.reduce(
        (sum, track) => sum + track.duration,
        0
      );
      await this.repo.save(album);
    }

    return await this.repo.findOne({
      where: { id: albumId },
      relations: ["artists", "tracks"],
    });
  }

  async getAlbumStatistics(albumId: string): Promise<any> {
    const album = await this.repo.findOne({
      where: { id: albumId },
      relations: ["artists", "tracks", "tracks.streams"],
    });

    if (!album) {
      return null;
    }

    const totalStreams = album.tracks.reduce(
      (sum, track) => sum + Number(track.totalStreams),
      0
    );

    const totalDuration = album.tracks.reduce(
      (sum, track) => sum + track.duration,
      0
    );

    const averageTrackDuration =
      album.tracks.length > 0
        ? Math.round(totalDuration / album.tracks.length)
        : 0;

    return {
      album,
      statistics: {
        totalTracks: album.tracks.length,
        totalStreams,
        totalDuration,
        averageTrackDuration,
        averageStreamsPerTrack:
          album.tracks.length > 0
            ? Math.round(totalStreams / album.tracks.length)
            : 0,
        peakChartPosition: album.peakChartPosition,
        monthlyStreams: Number(album.monthlyStreams),
      },
    };
  }

  async searchAlbums(query: string): Promise<Album[]> {
    return await this.repo
      .createQueryBuilder("album")
      .where("LOWER(album.title) LIKE LOWER(:query)", { query: `%${query}%` })
      .leftJoinAndSelect("album.artists", "artist")
      .leftJoinAndSelect("album.tracks", "tracks")
      .orderBy("album.releaseDate", "DESC")
      .getMany();
  }

  async getAlbumsByRecordLabel(recordLabel: string): Promise<Album[]> {
    return await this.repo.find({
      where: { recordLabel },
      relations: ["artists", "tracks"],
      order: { releaseDate: "DESC" },
    });
  }

  async getExplicitAlbums(): Promise<Album[]> {
    return await this.repo.find({
      where: { isExplicit: true },
      relations: ["artists", "tracks"],
      order: { releaseDate: "DESC" },
    });
  }

  async getTopAlbumsByPlatform(
    accountId: string,
    platform: StreamPlatform,
    limit = 50,
    opts?: { timeframe?: string; from?: string; to?: string }
  ): Promise<Array<{ albumId: string; title: string; count: number }>> {
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);
    const qb = this.repo
      .createQueryBuilder("album")
      .innerJoin("album.tracks", "track")
      .innerJoin("track.streams", "stream")
      .select("album.id", "albumId")
      .addSelect("album.title", "title")
      .addSelect("COUNT(*)", "count")
      .where("stream.platform = :platform", { platform })
      .andWhere("stream.accountId = :accountId", { accountId })
      .groupBy("album.id, album.title")
      .orderBy("count", "DESC")
      .limit(limit);
    if (start) {
      qb.andWhere("stream.streamedAt BETWEEN :start AND :end", { start, end });
    }
    const rows = await qb.getRawMany<{
      albumId: string;
      title: string;
      count: string;
    }>();
    return rows.map((r) => ({
      albumId: r.albumId,
      title: r.title,
      count: Number(r.count),
    }));
  }

  async getGlobalTopAlbumsByPlatform(
    platform: StreamPlatform,
    limit = 50,
    opts?: { timeframe?: string; from?: string; to?: string }
  ): Promise<Array<{ albumId: string; title: string; count: number }>> {
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);
    const qb = this.repo
      .createQueryBuilder("album")
      .innerJoin("album.tracks", "track")
      .innerJoin("track.streams", "stream")
      .select("album.id", "albumId")
      .addSelect("album.title", "title")
      .addSelect("COUNT(*)", "count")
      .where("stream.platform = :platform", { platform })
      .groupBy("album.id, album.title")
      .orderBy("count", "DESC")
      .limit(limit);
    if (start) {
      qb.andWhere("stream.streamedAt BETWEEN :start AND :end", { start, end });
    }
    const rows = await qb.getRawMany<{
      albumId: string;
      title: string;
      count: string;
    }>();
    return rows.map((r) => ({
      albumId: r.albumId,
      title: r.title,
      count: Number(r.count),
    }));
  }
}
