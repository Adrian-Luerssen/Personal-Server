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
      {} as any,
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
});
