import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { Artist } from "./artist.entity";
import { resolveTimeframe } from "src/utils/utils";
import { StreamPlatform } from "../streams/stream.entity";

@Injectable()
export class ArtistsService extends TypeOrmCrudService<Artist> {
  constructor(@InjectRepository(Artist) repo: Repository<Artist>) {
    super(repo);
  }

  async findByName(name: string): Promise<Artist | null> {
    return await this.repo.findOne({
      where: { name },
      relations: ["albums", "tracks"],
    });
  }

  async findByStageName(stageName: string): Promise<Artist | null> {
    return await this.repo.findOne({
      where: { stageName },
      relations: ["albums", "tracks"],
    });
  }

  async findBySpotifyId(spotifyId: string): Promise<Artist | null> {
    return await this.repo.findOne({
      where: { spotifyId },
      relations: ["albums", "tracks"],
    });
  }

  async findByGenre(genre: string): Promise<Artist[]> {
    const like = `%${genre}%`;
    return await this.repo
      .createQueryBuilder("artist")
      .where("LOWER(artist.genres) LIKE LOWER(:like)", { like })
      .leftJoinAndSelect("artist.albums", "albums")
      .leftJoinAndSelect("artist.tracks", "tracks")
      .getMany();
  }

  async findByCountry(country: string): Promise<Artist[]> {
    return await this.repo.find({
      where: { country },
      relations: ["albums", "tracks"],
    });
  }

  async getTopArtistsByListeners(limit: number = 10): Promise<Artist[]> {
    return await this.repo.find({
      order: { monthlyListeners: "DESC" },
      take: limit,
      relations: ["albums", "tracks"],
    });
  }

  async getVerifiedArtists(): Promise<Artist[]> {
    return await this.repo.find({
      where: { isVerified: true },
      relations: ["albums", "tracks"],
    });
  }

  async getActiveArtists(): Promise<Artist[]> {
    return await this.repo.find({
      where: { isActive: true },
      relations: ["albums", "tracks"],
    });
  }

  async updateMonthlyListeners(
    artistId: string,
    listeners: number
  ): Promise<Artist> {
    await this.repo.update(artistId, { monthlyListeners: listeners });
    return await this.repo.findOne({
      where: { id: artistId },
      relations: ["albums", "tracks"],
    });
  }

  async updateTotalFollowers(
    artistId: string,
    followers: number
  ): Promise<Artist> {
    await this.repo.update(artistId, { totalFollowers: followers });
    return await this.repo.findOne({
      where: { id: artistId },
      relations: ["albums", "tracks"],
    });
  }

  async getArtistStatistics(artistId: string): Promise<any> {
    const artist = await this.repo.findOne({
      where: { id: artistId },
      relations: ["albums", "tracks", "tracks.streams"],
    });

    if (!artist) {
      return null;
    }

    const totalTracks = artist.tracks.length;
    const totalAlbums = artist.albums.length;
    const totalStreams = artist.tracks.reduce(
      (sum, track) => sum + Number(track.totalStreams),
      0
    );

    return {
      artist,
      statistics: {
        totalTracks,
        totalAlbums,
        totalStreams,
        monthlyListeners: Number(artist.monthlyListeners),
        totalFollowers: Number(artist.totalFollowers),
        averageStreamsPerTrack:
          totalTracks > 0 ? Math.round(totalStreams / totalTracks) : 0,
      },
    };
  }

  async searchArtists(query: string): Promise<Artist[]> {
    return await this.repo
      .createQueryBuilder("artist")
      .where("LOWER(artist.name) LIKE LOWER(:query)", { query: `%${query}%` })
      .orWhere("LOWER(artist.stageName) LIKE LOWER(:query)", {
        query: `%${query}%`,
      })
      .leftJoinAndSelect("artist.albums", "albums")
      .leftJoinAndSelect("artist.tracks", "tracks")
      .getMany();
  }

  async getTopArtistsByPlatform(
    accountId: string,
    platform: StreamPlatform,
    limit = 50,
    opts?: { timeframe?: string; from?: string; to?: string }
  ): Promise<Array<{ artistId: string; name: string; count: number }>> {
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);
    const qb = this.repo
      .createQueryBuilder("artist")
      .innerJoin("artist.tracks", "track")
      .innerJoin("track.streams", "stream")
      .select("artist.id", "artistId")
      .addSelect("artist.name", "name")
      .addSelect("COUNT(*)", "count")
      .where("stream.platform = :platform", { platform })
      .andWhere("stream.accountId = :accountId", { accountId })
      .groupBy("artist.id, artist.name")
      .orderBy("count", "DESC")
      .limit(limit);
    if (start) {
      qb.andWhere("stream.streamedAt BETWEEN :start AND :end", { start, end });
    }
    const rows = await qb.getRawMany<{
      artistId: string;
      name: string;
      count: string;
    }>();
    return rows.map((r) => ({
      artistId: r.artistId,
      name: r.name,
      count: Number(r.count),
    }));
  }

  async getGlobalTopArtistsByPlatform(
    platform: StreamPlatform,
    limit = 50,
    opts?: { timeframe?: string; from?: string; to?: string }
  ): Promise<Array<{ artistId: string; name: string; count: number }>> {
    const { timeframe, from, to } = opts || {};
    const { start, end } = resolveTimeframe(timeframe, from, to);
    const qb = this.repo
      .createQueryBuilder("artist")
      .innerJoin("artist.tracks", "track")
      .innerJoin("track.streams", "stream")
      .select("artist.id", "artistId")
      .addSelect("artist.name", "name")
      .addSelect("COUNT(*)", "count")
      .where("stream.platform = :platform", { platform })
      .groupBy("artist.id, artist.name")
      .orderBy("count", "DESC")
      .limit(limit);
    if (start) {
      qb.andWhere("stream.streamedAt BETWEEN :start AND :end", { start, end });
    }
    const rows = await qb.getRawMany<{
      artistId: string;
      name: string;
      count: string;
    }>();
    return rows.map((r) => ({
      artistId: r.artistId,
      name: r.name,
      count: Number(r.count),
    }));
  }
}
