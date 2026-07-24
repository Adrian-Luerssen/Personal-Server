import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ReqUser } from "../../system/auth/auth.decorator";
import { Account } from "../../system/accounts/account.entity";
import { MalImportService } from "./mal-import.service";
import { TvTimeImportService } from "./tvtime-import.service";
import { GoodreadsImportService } from "./goodreads-import.service";
import { MediaService } from "../media/media.service";
import { Response } from "express";
import { MediaStatus, MediaType } from "../entities/media-item.entity";
import { createImportProgressSender } from "../../utils/sse";
import { MediaCatalogService } from "../catalog/media-catalog.service";
import { normalizeImportedStatus } from "./import-progress";

// In-memory preview store
const previewStore = new Map<
  string,
  {
    accountId: string;
    newItems: any[];
    duplicates: any[]; // { incoming, existing }
    expiresAt: number;
    selectedDuplicateActions: Record<string, "skip" | "replace" | "keep">;
    selectedTypes: MediaType[];
    source?: string;
  }
>();

@ApiTags("Media Import")
@ApiBearerAuth("access-token")
@Controller("media/import")
export class MediaImportController {
  constructor(
    private readonly malImport: MalImportService,
    private readonly tvTimeImport: TvTimeImportService,
    private readonly goodreadsImport: GoodreadsImportService,
    private readonly mediaService: MediaService,
    private readonly mediaCatalogService: MediaCatalogService
  ) {}

  // ========== MAL ANIME PREVIEW ==========

  @Post("mal/anime/preview")
  @ApiOperation({ summary: "Preview MAL anime XML export" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async previewMalAnime(
    @ReqUser() account: Account,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    const items = await this.malImport.parseExport(file.buffer, "anime");
    return this.storePreviewWithDedup(account, items, "mal-anime");
  }

  // ========== MAL MANGA PREVIEW ==========

  @Post("mal/manga/preview")
  @ApiOperation({ summary: "Preview MAL manga XML export" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async previewMalManga(
    @ReqUser() account: Account,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    const items = await this.malImport.parseExport(file.buffer, "manga");
    return this.storePreviewWithDedup(account, items, "mal-manga");
  }

  // ========== TVTIME PREVIEW ==========

  @Post("tvtime/preview")
  @ApiOperation({ summary: "Preview TVTime CSV export" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async previewTvTime(
    @ReqUser() account: Account,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    const items = await this.tvTimeImport.parseCsv(file.buffer);
    return this.storePreviewWithDedup(account, items, "tvtime");
  }

  // ========== GOODREADS PREVIEW ==========

  @Post("goodreads/preview")
  @ApiOperation({ summary: "Preview Goodreads CSV export" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async previewGoodreads(
    @ReqUser() account: Account,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    const items = await this.goodreadsImport.parseCsv(file.buffer);
    return this.storePreviewWithDedup(account, items, "goodreads");
  }

  // ========== SET DUPLICATE ACTIONS ==========

  @Post("resolve")
  @ApiOperation({
    summary: "Set duplicate resolution actions before executing import",
    description:
      "Pass a map of title -> action ('skip' | 'replace') for each duplicate.",
  })
  async resolveDuplicates(
    @ReqUser() account: Account,
    @Body()
    body: {
      previewId: string;
      actions: Record<string, "skip" | "replace">;
      includedTypes?: MediaType[];
    }
  ) {
    if (!body.previewId) throw new BadRequestException("previewId is required");
    const preview = previewStore.get(body.previewId);
    if (!preview || preview.accountId !== account.id) {
      throw new BadRequestException("Preview not found");
    }
    preview.selectedDuplicateActions = body.actions || {};
    if (body.includedTypes) {
      const allowedTypes = new Set(Object.values(MediaType));
      const selectedTypes = [...new Set(body.includedTypes)];
      if (
        selectedTypes.length === 0 ||
        selectedTypes.some((type) => !allowedTypes.has(type))
      ) {
        throw new BadRequestException(
          "Select at least one valid media category"
        );
      }
      preview.selectedTypes = selectedTypes;
    }
    return { ok: true };
  }

  // ========== EXECUTE with SSE ==========

  @Get("execute/:previewId")
  @ApiOperation({ summary: "Execute media import with progress streaming" })
  @ApiParam({ name: "previewId" })
  async executeImportSSE(
    @ReqUser() account: Account,
    @Param("previewId") previewId: string,
    @Res() res: Response
  ): Promise<void> {
    const send = createImportProgressSender(res);

    const preview = previewStore.get(previewId);
    if (!preview) {
      send({
        stage: "error",
        message: "Preview not found or expired",
        error: "PREVIEW_NOT_FOUND",
      });
      res.end();
      return;
    }
    if (preview.accountId !== account.id) {
      send({ stage: "error", message: "Unauthorized", error: "UNAUTHORIZED" });
      res.end();
      return;
    }
    if (preview.expiresAt < Date.now()) {
      previewStore.delete(previewId);
      send({ stage: "error", message: "Preview expired", error: "EXPIRED" });
      res.end();
      return;
    }

    try {
      send({
        stage: "starting",
        progress: 0,
        message: "Starting media import...",
      });

      const actions = preview.selectedDuplicateActions || {};
      let created = 0;
      let skipped = 0;
      let replaced = 0;

      const selectedTypes = new Set(preview.selectedTypes);
      const selectedNewItems = preview.newItems.filter((item) =>
        selectedTypes.has(item.type)
      );
      const selectedDuplicates = preview.duplicates.filter((item) =>
        selectedTypes.has(item.incoming.type)
      );

      // Combine selected new items + selected duplicates that should be replaced
      const toCreate = [...selectedNewItems];
      const toReplace: Array<{ incoming: any; existingId: string }> = [];

      for (const dup of selectedDuplicates) {
        const action = actions[dup.incoming.title] || "skip";
        if (action === "replace") {
          toReplace.push({
            incoming: dup.incoming,
            existingId: dup.existing.id,
          });
        } else {
          skipped++;
        }
      }

      const total = toCreate.length + toReplace.length;

      // Create new items
      if (toCreate.length > 0) {
        send({
          stage: "creating",
          progress: 5,
          current: 0,
          total,
          message: `Creating new media items (0/${toCreate.length})`,
        });
        const bulkResult = await this.mediaService.bulkCreate(
          account,
          toCreate.map((dto) => ({
            title: dto.title,
            type: dto.type,
            status: dto.status ?? MediaStatus.PLANNING,
            rating: dto.rating ?? undefined,
            startDate: dto.startDate ?? undefined,
            endDate: dto.endDate ?? undefined,
            coverUrl: dto.coverUrl ?? undefined,
            metadata: dto.metadata ?? {},
            externalIds: dto.externalIds ?? {},
          }))
        );
        created += bulkResult.created;
        skipped += bulkResult.skipped;
        send({
          stage: "creating",
          progress: total > 0 ? 5 + (toCreate.length / total) * 50 : 55,
          current: toCreate.length,
          total,
          message: `Creating new items (${toCreate.length}/${toCreate.length})`,
        });
      }

      // Replace duplicates
      for (let i = 0; i < toReplace.length; i++) {
        const { incoming, existingId } = toReplace[i];
        try {
          await this.mediaService.update(account, existingId, {
            type: incoming.type,
            status: incoming.status,
            rating: incoming.rating ?? undefined,
            startDate: incoming.startDate ?? undefined,
            endDate: incoming.endDate ?? undefined,
            coverUrl: incoming.coverUrl ?? undefined,
            metadata: incoming.metadata ?? {},
            externalIds: incoming.externalIds ?? {},
          });
          replaced++;
        } catch {
          skipped++;
        }

        const idx = toCreate.length + i + 1;
        if ((i + 1) % 5 === 0 || i + 1 === toReplace.length) {
          send({
            stage: "replacing",
            progress: 5 + (idx / total) * 50,
            current: idx,
            total,
            message: `Updating duplicates (${i + 1}/${toReplace.length})`,
          });
        }
      }

      // Preserve the imported provider identity even when the user skips a
      // duplicate. TV Time progress is merged because it is additive source
      // history, while ratings, notes, and other personal fields stay intact.
      for (const duplicate of selectedDuplicates) {
        const action = actions[duplicate.incoming.title] || "skip";
        if (action === "replace") continue;
        const incoming = duplicate.incoming;
        const isTvTime = incoming.metadata?.importSource === "tvtime";
        if (
          !isTvTime &&
          (!this.catalogIdentity(incoming) ||
            !this.needsIdentityUpdate(duplicate.existing, incoming))
        ) {
          continue;
        }
        const progressMetadata = isTvTime
          ? {
              tvTimeRelationship: incoming.metadata?.tvTimeRelationship,
              tvTimeProgressMode: incoming.metadata?.tvTimeProgressMode,
              ...(incoming.metadata?.tvTimeProgressMode === "exact"
                ? { episodesWatched: incoming.metadata?.episodesWatched }
                : {}),
            }
          : {};
        await this.mediaService.update(account, duplicate.existing.id, {
          type: incoming.type,
          ...(incoming.status === MediaStatus.COMPLETED
            ? { status: MediaStatus.COMPLETED }
            : {}),
          externalIds: incoming.externalIds || {},
          metadata: {
            importSource: incoming.metadata?.importSource,
            sourceType: incoming.metadata?.sourceType,
            tags: incoming.metadata?.tags,
            ...progressMetadata,
            catalogSyncState: "pending",
          },
        });
      }

      const importedItems = [
        ...toCreate,
        ...selectedDuplicates.map((entry) => entry.incoming),
      ];
      const catalogIdentities = new Set(
        importedItems.map((item) => this.catalogIdentity(item)).filter(Boolean)
      );
      const catalogTitles = new Set(
        importedItems.map(
          (item) => `${item.type}:${this.normalizeTitle(item.title)}`
        )
      );
      const duplicateIds = new Set(
        selectedDuplicates.map((entry) => entry.existing.id)
      );
      const library = await this.mediaService.findAll(account);
      const catalogCandidates = library.filter(
        (item) =>
          (duplicateIds.has(item.id) ||
            catalogIdentities.has(this.catalogIdentity(item)) ||
            catalogTitles.has(
              `${item.type}:${this.normalizeTitle(item.title)}`
            )) &&
          item.metadata?.catalogSyncState !== "ready"
      );
      send({
        stage: "catalog",
        progress: 60,
        current: 0,
        total: catalogCandidates.length,
        message: catalogCandidates.length
          ? `Preparing catalog synchronization (0/${catalogCandidates.length})`
          : "No catalog records need synchronization",
      });
      const catalog = await this.mediaCatalogService.syncImportedItems(
        account,
        catalogCandidates,
        ({ current, total: catalogTotal, synced, failed, item }) => {
          send({
            stage: "catalog",
            progress: 60 + (current / Math.max(catalogTotal, 1)) * 38,
            current,
            total: catalogTotal,
            message: `Synchronizing catalog (${current}/${catalogTotal}): ${item.title}`,
            catalog: { synced, failed },
          });
        }
      );

      previewStore.delete(previewId);

      send({
        stage: "complete",
        progress: 100,
        message: catalog.failed
          ? `Import complete. ${catalog.failed} catalog ${
              catalog.failed === 1 ? "record needs" : "records need"
            } another sync attempt.`
          : "Import and catalog synchronization completed successfully!",
        summary: {
          created,
          replaced,
          skipped,
          catalogEligible: catalog.eligible,
          catalogSynced: catalog.synced,
          catalogFailed: catalog.failed,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      send({
        stage: "error",
        progress: 0,
        message: `Import failed: ${msg}`,
        error: msg,
      });
    } finally {
      res.end();
    }
  }

  // ========== HELPERS ==========

  private async storePreviewWithDedup(
    account: Account,
    items: any[],
    source?: string
  ) {
    for (const item of items) {
      item.status = normalizeImportedStatus(item.status, item.metadata);
    }

    // Load all existing media for this account
    const existing = await this.mediaService.findAll(account);
    if (items.some((item) => item.metadata?.importSource === "tvtime")) {
      await this.tvTimeImport.resolveExistingAnime(items, existing);
    }

    const existingMap = new Map<string, any>();
    const existingById = new Map(existing.map((item) => [item.id, item]));
    const existingByProviderId = new Map<string, any>();
    for (const e of existing) {
      for (const title of this.mediaTitles(e)) {
        const normalized = this.normalizeTitle(title);
        if (normalized && !existingMap.has(normalized))
          existingMap.set(normalized, e);
      }
      for (const identity of this.providerIdentities(e)) {
        existingByProviderId.set(identity, e);
      }
    }

    const newItems: any[] = [];
    const duplicates: Array<{ incoming: any; existing: any }> = [];

    for (const item of items) {
      const matchedExistingId = item.metadata?.matchedExistingId;
      const match =
        (matchedExistingId ? existingById.get(matchedExistingId) : undefined) ||
        this.providerIdentities(item)
          .map((identity) => existingByProviderId.get(identity))
          .find(Boolean) ||
        this.mediaTitles(item)
          .map((title) => existingMap.get(this.normalizeTitle(title)))
          .find(Boolean);
      if (match) {
        duplicates.push({
          incoming: item,
          existing: {
            id: match.id,
            title: match.title,
            type: match.type,
            status: match.status,
            rating: match.rating != null ? Number(match.rating) : null,
            coverUrl: match.coverUrl,
            metadata: match.metadata,
            externalIds: match.externalIds,
          },
        });
      } else {
        newItems.push(item);
      }
    }

    const previewId = `${account.id}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const selectedTypes = [
      ...new Set(items.map((item) => item.type)),
    ] as MediaType[];
    previewStore.set(previewId, {
      accountId: account.id,
      newItems,
      duplicates,
      expiresAt: Date.now() + 15 * 60 * 1000,
      selectedDuplicateActions: {},
      selectedTypes,
      source,
    });

    const countTypes = (entries: any[]) =>
      entries.reduce<Record<string, number>>((counts, item) => {
        counts[item.type] = (counts[item.type] || 0) + 1;
        return counts;
      }, {});
    const progressSummary = items.reduce(
      (summary, item) => {
        const mode = item.metadata?.tvTimeProgressMode;
        if (mode === "exact") summary.exact++;
        else if (mode === "all-aired") summary.reconstructable++;
        else if (mode === "unknown-partial") summary.needsReview++;
        return summary;
      },
      { exact: 0, reconstructable: 0, needsReview: 0 }
    );

    return {
      previewId,
      source,
      newCount: newItems.length,
      duplicateCount: duplicates.length,
      totalItems: items.length,
      items: newItems.slice(0, 30),
      duplicates,
      typeCounts: countTypes(items),
      newTypeCounts: countTypes(newItems),
      duplicateTypeCounts: countTypes(
        duplicates.map((entry) => entry.incoming)
      ),
      progressSummary,
    };
  }

  private normalizeTitle(title: string): string {
    return title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/\(\d{4}\)\s*$/, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  private mediaTitles(item: any): string[] {
    const metadata = item?.metadata || {};
    const values = [
      item?.title,
      metadata.titleEnglish,
      metadata.englishTitle,
      metadata.titleJapanese,
      metadata.titleRomaji,
      ...(Array.isArray(metadata.alternativeTitles)
        ? metadata.alternativeTitles
        : []),
      ...(Array.isArray(metadata.titleSynonyms) ? metadata.titleSynonyms : []),
      ...(Array.isArray(metadata.synonyms) ? metadata.synonyms : []),
    ];
    return [
      ...new Set(
        values.filter(
          (value): value is string =>
            typeof value === "string" && !!value.trim()
        )
      ),
    ];
  }

  private providerIdentities(item: any): string[] {
    return ["malId", "tmdbId", "tvdbId"]
      .map((key) => {
        const value = Number(item?.externalIds?.[key]);
        return Number.isInteger(value) && value > 0 ? `${key}:${value}` : null;
      })
      .filter((value): value is string => !!value);
  }

  private needsIdentityUpdate(existing: any, incoming: any): boolean {
    if (existing.type !== incoming.type) return true;
    const existingIdentities = new Set(this.providerIdentities(existing));
    if (
      this.providerIdentities(incoming).some(
        (identity) => !existingIdentities.has(identity)
      )
    ) {
      return true;
    }
    const existingTags = new Set(
      Array.isArray(existing.metadata?.tags) ? existing.metadata.tags : []
    );
    const incomingTags = Array.isArray(incoming.metadata?.tags)
      ? incoming.metadata.tags
      : [];
    return incomingTags.some((tag: string) => !existingTags.has(tag));
  }

  private catalogIdentity(item: any): string | null {
    const malId = Number(item?.externalIds?.malId);
    if (item?.type === "anime" && Number.isInteger(malId) && malId > 0) {
      return `mal:${malId}`;
    }
    const tmdbId = Number(item?.externalIds?.tmdbId);
    if (
      ["tv", "movie"].includes(item?.type) &&
      Number.isInteger(tmdbId) &&
      tmdbId > 0
    ) {
      return `tmdb:${tmdbId}`;
    }
    return null;
  }
}
