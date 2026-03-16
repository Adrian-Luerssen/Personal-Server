import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { MediaSearchService } from "./media-search.service";
import { MediaType } from "../entities/media-item.entity";

@ApiTags("Media Search")
@ApiBearerAuth("access-token")
@Controller("media/search")
export class MediaSearchController {
  constructor(private readonly searchService: MediaSearchService) {}

  @Get()
  @ApiOperation({
    summary: "Search external APIs for media items",
    description:
      "Searches Jikan (anime/manga), TMDB (tv/movies), and OpenLibrary (books). Filter by type to search specific providers.",
  })
  @ApiQuery({ name: "q", required: true, description: "Search query" })
  @ApiQuery({
    name: "type",
    required: false,
    enum: MediaType,
    description: "Filter to specific media type",
  })
  async search(
    @Query("q") q: string,
    @Query("type") type?: MediaType
  ) {
    if (!q || q.trim().length === 0) {
      throw new BadRequestException("Search query is required");
    }
    return this.searchService.search(q.trim(), type);
  }
}
