import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm";
import { Track } from "./track.entity";

@Injectable()
export class TracksService extends TypeOrmCrudService<Track> {
  constructor(@InjectRepository(Track) repo: Repository<Track>) {
    super(repo);
  }

  async findByTitle(title: string): Promise<Track[]> {
    return await this.repo.find({
      where: { title },
      relations: ["artists", "album", "streams"],
    });
  }

  async findByArtist(artistId: string): Promise<Track[]> {
    return await this.repo
      .createQueryBuilder("track")
      .leftJoinAndSelect("track.artists", "artist")
      .leftJoinAndSelect("track.album", "album")
      .leftJoinAndSelect("track.streams", "streams")
      .where("artist.id = :artistId", { artistId })
      .orderBy("track.releaseDate", "DESC")
      .getMany();
  }

  async findByAlbum(albumId: string): Promise<Track[]> {
    return await this.repo.find({
      where: { albumId },
      relations: ["artists", "album", "streams"],
      order: { trackNumber: "ASC" },
    });
  }

  async findByGenre(genre: string): Promise<Track[]> {
    return await this.repo
      .createQueryBuilder("track")
      .where("track.genres @> ARRAY[:genre]", { genre })
      .leftJoinAndSelect("track.artists", "artist")
      .leftJoinAndSelect("track.album", "album")
      .leftJoinAndSelect("track.streams", "streams")
      .orderBy("track.totalStreams", "DESC")
      .getMany();
  }

  async findByISRC(isrc: string): Promise<Track | null> {
    return await this.repo.findOne({
      where: { isrc },
      relations: ["artists", "album", "streams"],
    });
  }

  async findBySpotifyId(spotifyId: string): Promise<Track | null> {
    return await this.repo.findOne({
      where: { spotifyId },
      relations: ["artists", "album", "streams"],
    });
  }

  async getTopTracksByStreams(limit: number = 50): Promise<Track[]> {
    return await this.repo.find({
      order: { totalStreams: "DESC" },
      take: limit,
      relations: ["artists", "album"],
    });
  }

  async getTrendingTracks(limit: number = 50): Promise<Track[]> {
    return await this.repo.find({
      order: { dailyStreams: "DESC" },
      take: limit,
      relations: ["artists", "album"],
    });
  }

  async getRecentTracks(limit: number = 50): Promise<Track[]> {
    return await this.repo.find({
      order: { releaseDate: "DESC" },
      take: limit,
      relations: ["artists", "album"],
    });
  }

  async updateStreamCounts(
    trackId: string,
    dailyStreams: number,
    weeklyStreams: number,
    monthlyStreams: number,
    totalStreams: number
  ): Promise<Track> {
    await this.repo.update(trackId, {
      dailyStreams,
      weeklyStreams,
      monthlyStreams,
      totalStreams,
    });

    return await this.repo.findOne({
      where: { id: trackId },
      relations: ["artists", "album"],
    });
  }

  async updatePopularity(trackId: string, popularity: number): Promise<Track> {
    await this.repo.update(trackId, { popularity });
    return await this.repo.findOne({
      where: { id: trackId },
      relations: ["artists", "album"],
    });
  }

  async getTrackStatistics(trackId: string): Promise<any> {
    const track = await this.repo.findOne({
      where: { id: trackId },
      relations: ["artists", "album", "streams"],
    });

    if (!track) {
      return null;
    }

    const totalStreams = track.streams.length;

    return {
      track,
      statistics: {
        totalStreams,
        dailyStreams: Number(track.dailyStreams),
        weeklyStreams: Number(track.weeklyStreams),
        monthlyStreams: Number(track.monthlyStreams),
        popularity: track.popularity,
        peakChartPosition: track.peakChartPosition,
      },
    };
  }

  async searchTracks(query: string): Promise<Track[]> {
    return await this.repo
      .createQueryBuilder("track")
      .where("LOWER(track.title) LIKE LOWER(:query)", { query: `%${query}%` })
      .orWhere("LOWER(track.lyrics) LIKE LOWER(:query)", {
        query: `%${query}%`,
      })
      .leftJoinAndSelect("track.artists", "artist")
      .leftJoinAndSelect("track.album", "album")
      .orderBy("track.popularity", "DESC")
      .getMany();
  }

  async getTracksByDuration(
    minDuration: number,
    maxDuration: number
  ): Promise<Track[]> {
    return await this.repo
      .createQueryBuilder("track")
      .where("track.duration BETWEEN :minDuration AND :maxDuration", {
        minDuration,
        maxDuration,
      })
      .leftJoinAndSelect("track.artists", "artist")
      .leftJoinAndSelect("track.album", "album")
      .orderBy("track.totalStreams", "DESC")
      .getMany();
  }

  async getExplicitTracks(): Promise<Track[]> {
    return await this.repo.find({
      where: { isExplicit: true },
      relations: ["artists", "album"],
      order: { totalStreams: "DESC" },
    });
  }

  async getTracksByBPMRange(minBPM: number, maxBPM: number): Promise<Track[]> {
    return await this.repo
      .createQueryBuilder("track")
      .where("track.bpm BETWEEN :minBPM AND :maxBPM", { minBPM, maxBPM })
      .leftJoinAndSelect("track.artists", "artist")
      .leftJoinAndSelect("track.album", "album")
      .orderBy("track.popularity", "DESC")
      .getMany();
  }

  async getTracksByMusicalKey(musicalKey: string): Promise<Track[]> {
    return await this.repo.find({
      where: { musicalKey },
      relations: ["artists", "album"],
      order: { totalStreams: "DESC" },
    });
  }

  async getFeaturedTracks(): Promise<Track[]> {
    return await this.repo
      .createQueryBuilder("track")
      .where("track.featuredArtists IS NOT NULL")
      .andWhere("track.featuredArtists <> ''")
      .leftJoinAndSelect("track.artists", "artist")
      .leftJoinAndSelect("track.album", "album")
      .orderBy("track.totalStreams", "DESC")
      .getMany();
  }

  async findById(id: string): Promise<any | null> {
    // get artists with track
    return await this.repo
      .createQueryBuilder("track")
      .leftJoin("track.artists", "artist")
      .select("track.*")
      .addSelect(
        "COALESCE(NULLIF(string_agg(DISTINCT artist.name, ', '), ''), NULL)",
        "artists"
      )
      .where("track.id = :id", { id })
      .groupBy("track.id")
      .getRawOne();
  }
}
