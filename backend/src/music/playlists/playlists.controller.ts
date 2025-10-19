import { Controller, Get, Param } from "@nestjs/common";
import { PlaylistsService } from "./playlists.service";
import { CrudController } from "@nestjsx/crud";
import { Playlist } from "./playlist.entity";
import {
  CrudAccountAuth,
  CrudAccountOwnedEntity,
} from "src/system/common/CrudEntity.decorator";
import { ApiBearerAuth } from "@nestjs/swagger/dist/decorators/api-bearer.decorator";
@CrudAccountOwnedEntity({
  model: { type: Playlist },
})
@CrudAccountAuth()
@ApiBearerAuth("access-token")
@Controller("playlists")
export class PlaylistsController implements CrudController<Playlist> {
  constructor(public service: PlaylistsService) {}

  @Get(":spotifyId")
  async getBySpotifyId(@Param("spotifyId") spotifyId: string) {
    return this.service.findBySpotifyId(spotifyId);
  }
}
