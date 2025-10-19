import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Playlist } from "./playlist.entity";
import { TypeOrmCrudService } from "@nestjsx/crud-typeorm/lib/typeorm-crud.service";

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
}
