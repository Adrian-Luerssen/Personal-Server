import { Module } from "@nestjs/common";
import { ArtistsModule } from "./artists/artists.module";
import { AlbumsModule } from "./albums/albums.module";
import { TracksModule } from "./tracks/tracks.module";
import { StreamsModule } from "./streams/streams.module";
import { PlaylistsModule } from "./playlists/playlists.module";

@Module({
  imports: [
    ArtistsModule,
    AlbumsModule,
    TracksModule,
    StreamsModule,
    PlaylistsModule,
  ],
  exports: [
    ArtistsModule,
    AlbumsModule,
    TracksModule,
    StreamsModule,
    PlaylistsModule,
  ],
})
export class MusicModule {}
