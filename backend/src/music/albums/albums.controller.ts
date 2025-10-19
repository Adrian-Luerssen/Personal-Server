import { Controller, Get, Param, Query } from "@nestjs/common";
import { CrudController } from "@nestjsx/crud";
import { ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { CrudEntity } from "../../system/common/CrudEntity.decorator";
import { Album } from "./album.entity";
import { AlbumsService } from "./albums.service";
import { StreamPlatform } from "../streams/stream.entity";
import { ReqUser, NoAuth } from "src/system/auth/auth.decorator";

@CrudEntity({
  model: { type: Album },
})
@ApiBearerAuth("access-token")
@Controller("albums")
export class AlbumsController implements CrudController<Album> {
  constructor(public service: AlbumsService) {}

  @Get(":id/stats")
  async getAlbumStats(@Param("id") id: string) {
    return this.service.getAlbumStatistics(id);
  }

  @Get("spotify/:spotifyId")
  async bySpotify(@Param("spotifyId") spotifyId: string) {
    return this.service.findBySpotifyId(spotifyId);
  }

  @Get("search")
  @ApiQuery({ name: "q", type: String })
  async search(@Query("q") q: string) {
    return this.service.searchAlbums(q);
  }

  @Get("top")
  async top(@Query("limit") limit = 10) {
    return this.service.getTopAlbumsByStreams(Number(limit));
  }

  @Get("top-albums")
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
  async topAlbums(
    @ReqUser() user: any,
    @Query("platform") platform: StreamPlatform,
    @Query("limit") limit = 50,
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return await this.service.getTopAlbumsByPlatform(
      user.id,
      platform,
      Number(limit),
      { timeframe, from, to }
    );
  }

  @NoAuth()
  @Get("global-top-albums")
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
  async globalTopAlbums(
    @Query("platform") platform: StreamPlatform,
    @Query("limit") limit = 50,
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return await this.service.getGlobalTopAlbumsByPlatform(
      platform,
      Number(limit),
      { timeframe, from, to }
    );
  }
}
