import { Controller, Get, Param, Query } from "@nestjs/common";
import { PlaylistsService } from "./playlists.service";
import { CrudController } from "@nestjsx/crud";
import { Playlist } from "./playlist.entity";
import { CrudEntity } from "src/system/common/CrudEntity.decorator";
import { ApiBearerAuth } from "@nestjs/swagger/dist/decorators/api-bearer.decorator";
import { StreamPlatform } from "../streams/stream.entity";
import { ApiQuery } from "@nestjs/swagger";
import { NoAuth, ReqUser } from "src/system/auth/auth.decorator";
@CrudEntity({
  model: { type: Playlist },
})
@ApiBearerAuth("access-token")
@Controller("playlists")
export class PlaylistsController implements CrudController<Playlist> {
  constructor(public service: PlaylistsService) {}

  @Get("top-playlists")
  @ApiQuery({ name: "platform", enum: StreamPlatform })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({
    name: "timeframe",
    required: false,
    description: "7d | 30d | 90d | 1y | all",
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "ISO date override start",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "ISO date override end",
  })
  async topPlaylists(
    @ReqUser() user: any,
    @Query("platform") platform: StreamPlatform,
    @Query("limit") limit = 50,
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return await this.service.getTopPlaylistsByPlatform(
      user.id,
      platform,
      Number(limit),
      { timeframe, from, to }
    );
  }

  @NoAuth()
  @Get("global-top-playlists")
  @ApiQuery({ name: "platform", enum: StreamPlatform })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({
    name: "timeframe",
    required: false,
    description: "7d | 30d | 90d | 1y | all",
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "ISO date override start",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "ISO date override end",
  })
  async globalTopPlaylists(
    @Query("platform") platform: StreamPlatform,
    @Query("limit") limit = 50,
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return await this.service.getGlobalTopPlaylistsByPlatform(
      platform,
      Number(limit),
      { timeframe, from, to }
    );
  }

  @Get("getBySpotifyId/:spotifyId")
  async getBySpotifyId(@Param("spotifyId") spotifyId: string) {
    return this.service.findBySpotifyId(spotifyId);
  }
}
