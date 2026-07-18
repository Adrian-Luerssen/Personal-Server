jest.mock("@nestjs/platform-express", () => ({
  FileInterceptor: jest.fn(() => class FileInterceptorMock {}),
}));

import { MediaImportController } from "./import.controller";

describe("MediaImportController preview", () => {
  it("returns every duplicate while reporting the complete duplicate count", async () => {
    const existing = Array.from({ length: 411 }, (_, index) => ({
      id: `existing-${index}`,
      title: `Title ${index}`,
      type: "anime",
      status: "completed",
      rating: 8,
      metadata: {},
    }));
    const mediaService = { findAll: jest.fn().mockResolvedValue(existing) };
    const controller = new MediaImportController(
      {} as any,
      { resolveExistingAnime: jest.fn().mockResolvedValue(undefined) } as any,
      {} as any,
      mediaService as any,
      {} as any,
    );
    const incoming = existing.map((item, index) => ({
      title: item.title,
      type: "anime",
      status: "completed",
      rating: index % 10,
    }));

    const preview = await (controller as any).storePreviewWithDedup({ id: "account-1" }, incoming);

    expect(preview.totalItems).toBe(411);
    expect(preview.duplicateCount).toBe(411);
    expect(preview.duplicates).toHaveLength(411);
    expect(preview.newCount).toBe(0);
  });

  it("recognizes normalized aliases as duplicates instead of creating a second title", async () => {
    const existing = [{
      id: "existing-1",
      title: "Boku no Hero Academia",
      type: "anime",
      status: "completed",
      externalIds: { malId: 31964 },
      metadata: { alternativeTitles: ["My Hero Academia"] },
    }];
    const mediaService = { findAll: jest.fn().mockResolvedValue(existing) };
    const controller = new MediaImportController(
      {} as any,
      { resolveExistingAnime: jest.fn().mockResolvedValue(undefined) } as any,
      {} as any,
      mediaService as any,
      {} as any,
    );
    const incoming = [{
      title: "My Hero Academia",
      type: "tv",
      status: "watching",
      externalIds: { tvdbId: 305074 },
      metadata: { importSource: "tvtime" },
    }];

    const preview = await (controller as any).storePreviewWithDedup({ id: "account-1" }, incoming);

    expect(preview.newCount).toBe(0);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.duplicates[0].existing.id).toBe("existing-1");
  });

  it("updates replaced duplicates once before continuing to catalog synchronization", async () => {
    const existing = {
      id: "existing-1",
      title: "Naruto",
      type: "anime",
      status: "watching",
      rating: null,
      metadata: {},
      externalIds: { malId: 20 },
    };
    const mediaService = {
      findAll: jest.fn().mockResolvedValue([existing]),
      update: jest.fn().mockResolvedValue(existing),
    };
    const mediaCatalogService = {
      syncImportedItems: jest.fn().mockResolvedValue({
        eligible: 1,
        synced: 1,
        failed: 0,
      }),
    };
    const controller = new MediaImportController(
      {} as any,
      {} as any,
      {} as any,
      mediaService as any,
      mediaCatalogService as any,
    );
    const account = { id: "account-1" } as any;
    const incoming = {
      title: "Naruto",
      type: "anime",
      status: "completed",
      rating: 9,
      metadata: { importSource: "mal", sourceType: "anime" },
      externalIds: { malId: 20 },
    };
    const preview = await (controller as any).storePreviewWithDedup(account, [incoming]);
    await controller.resolveDuplicates(account, {
      previewId: preview.previewId,
      actions: { Naruto: "replace" },
    });

    const writes: string[] = [];
    const response = {
      destroyed: false,
      writableEnded: false,
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      on: jest.fn(),
      write: jest.fn((chunk: string) => writes.push(chunk)),
      end: jest.fn(),
    } as any;

    await controller.executeImportSSE(account, preview.previewId, response);

    expect(mediaService.update).toHaveBeenCalledTimes(1);
    expect(mediaService.update).toHaveBeenCalledWith(
      account,
      existing.id,
      expect.objectContaining({
        type: "anime",
        status: "completed",
        externalIds: { malId: 20 },
      }),
    );
    expect(mediaCatalogService.syncImportedItems).toHaveBeenCalledTimes(1);
    expect(writes.some((chunk) => chunk.includes('"stage":"complete"'))).toBe(true);
    expect(response.end).toHaveBeenCalledTimes(1);
  });

  it("does not rewrite or resynchronize an unchanged ready duplicate", async () => {
    const existing = {
      id: "existing-1",
      title: "Naruto",
      type: "anime",
      status: "completed",
      rating: 9,
      metadata: {
        importSource: "mal",
        sourceType: "anime",
        tags: ["anime"],
        catalogSyncState: "ready",
      },
      externalIds: { malId: 20 },
    };
    const mediaService = {
      findAll: jest.fn().mockResolvedValue([existing]),
      update: jest.fn().mockResolvedValue(existing),
    };
    const mediaCatalogService = {
      syncImportedItems: jest.fn().mockResolvedValue({ eligible: 0, synced: 0, failed: 0 }),
    };
    const controller = new MediaImportController(
      {} as any,
      {} as any,
      {} as any,
      mediaService as any,
      mediaCatalogService as any,
    );
    const account = { id: "account-1" } as any;
    const preview = await (controller as any).storePreviewWithDedup(account, [{
      title: "Naruto",
      type: "anime",
      status: "completed",
      rating: 9,
      metadata: { importSource: "mal", sourceType: "anime", tags: ["anime"] },
      externalIds: { malId: 20 },
    }]);
    const writes: string[] = [];
    const response = {
      destroyed: false,
      writableEnded: false,
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      on: jest.fn(),
      write: jest.fn((chunk: string) => writes.push(chunk)),
      end: jest.fn(),
    } as any;

    await controller.executeImportSSE(account, preview.previewId, response);

    expect(mediaService.update).not.toHaveBeenCalled();
    expect(mediaCatalogService.syncImportedItems).toHaveBeenCalledWith(
      account,
      [],
      expect.any(Function),
    );
    expect(writes.some((chunk) => chunk.includes('"stage":"complete"'))).toBe(true);
  });
});
