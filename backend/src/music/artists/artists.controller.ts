import { Controller, Get, Param, Query } from "@nestjs/common";
import { CrudController } from "@nestjsx/crud";
import { ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { CrudEntity } from "../../system/common/CrudEntity.decorator";
import { Artist } from "./artist.entity";
import { ArtistsService } from "./artists.service";
import { StreamPlatform } from "../streams/stream.entity";
import { ReqUser, NoAuth } from "src/system/auth/auth.decorator";

@CrudEntity({
  model: { type: Artist },
})
@ApiBearerAuth("access-token")
@Controller("artists")
export class ArtistsController implements CrudController<Artist> {
  constructor(public service: ArtistsService) {}

  @Get(":id/stats")
  async getArtistStats(@Param("id") id: string) {
    return this.service.getArtistStatistics(id);
  }

  @Get("spotify/:spotifyId")
  async bySpotify(@Param("spotifyId") spotifyId: string) {
    return this.service.findBySpotifyId(spotifyId);
  }

  @Get("search")
  @ApiQuery({ name: "q", type: String })
  async search(@Query("q") q: string) {
    return this.service.searchArtists(q);
  }

  @Get("top")
  async top(@Query("limit") limit = 10) {
    return this.service.getTopArtistsByListeners(Number(limit));
  }

  @Get("top-artists")
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
  async topArtists(
    @ReqUser() user: any,
    @Query("platform") platform: StreamPlatform,
    @Query("limit") limit = 50,
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return await this.service.getTopArtistsByPlatform(
      user.id,
      platform,
      Number(limit),
      { timeframe, from, to }
    );
  }

  @NoAuth()
  @Get("global-top-artists")
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
  async globalTopArtists(
    @Query("platform") platform: StreamPlatform,
    @Query("limit") limit = 50,
    @Query("timeframe") timeframe?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return await this.service.getGlobalTopArtistsByPlatform(
      platform,
      Number(limit),
      { timeframe, from, to }
    );
  }
}
