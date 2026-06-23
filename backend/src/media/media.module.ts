import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";

import { MediaItem } from "./entities/media-item.entity";

import { MediaService } from "./media/media.service";
import { MediaController } from "./media/media.controller";

import { MediaSearchService } from "./search/media-search.service";
import { MediaSearchController } from "./search/media-search.controller";

import { MalImportService } from "./import/mal-import.service";
import { TvTimeImportService } from "./import/tvtime-import.service";
import { GoodreadsImportService } from "./import/goodreads-import.service";
import { MediaImportController } from "./import/import.controller";
import { MediaEnrichmentService } from "./enrichment/enrichment.service";
import { SyncModule } from "../sync/sync.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaItem]),
    MulterModule.register({ storage: undefined }),
    SyncModule,
  ],
  providers: [
    MediaService,
    MediaSearchService,
    MalImportService,
    TvTimeImportService,
    GoodreadsImportService,
    MediaEnrichmentService,
  ],
  controllers: [MediaController, MediaSearchController, MediaImportController],
  exports: [MediaService],
})
export class MediaModule {}
