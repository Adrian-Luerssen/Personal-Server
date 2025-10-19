import { Controller, Get, Param, Query } from "@nestjs/common";
import { CrudController } from "@nestjsx/crud";
import { ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { CrudEntity } from "../../system/common/CrudEntity.decorator";
import { Track } from "./track.entity";
import { TracksService } from "./tracks.service";

@CrudEntity({
  model: { type: Track },
})
@ApiBearerAuth("access-token")
@Controller("tracks")
export class TracksController implements CrudController<Track> {
  constructor(public service: TracksService) {}

  @Get(":id/stats")
  async getTrackStats(@Param("id") id: string) {
    return this.service.getTrackStatistics(id);
  }

  @Get("spotify/:spotifyId")
  async bySpotify(@Param("spotifyId") spotifyId: string) {
    return this.service.findBySpotifyId(spotifyId);
  }

  @Get("search")
  @ApiQuery({ name: "q", type: String })
  async search(@Query("q") q: string) {
    return this.service.searchTracks(q);
  }

  @Get("top")
  async top(@Query("limit") limit = 50) {
    return this.service.getTopTracksByStreams(Number(limit));
  }

  @Get("trending")
  async trending(@Query("limit") limit = 50) {
    return this.service.getTrendingTracks(Number(limit));
  }

  @Get("/:id")
  async getById(@Param("id") id: string) {
    return this.service.findById(id);
  }
}
