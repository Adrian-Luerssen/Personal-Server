import { readFileSync } from "fs";
import { join } from "path";
import { MediaType } from "./entities/media-item.entity";
import { MediaSearchController } from "./search/media-search.controller";

const readSource = (path: string) =>
  readFileSync(join(__dirname, path), "utf8");

describe("Media search routing", () => {
  it("registers the static media search route before the media ID route", () => {
    const moduleSource = readSource("media.module.ts");
    const mediaControllerSource = readSource("media/media.controller.ts");
    const searchControllerSource = readSource(
      "search/media-search.controller.ts",
    );
    const controllerDeclaration = moduleSource.match(
      /controllers:\s*\[([^\]]+)\]/,
    )?.[1];
    const searchIndex = controllerDeclaration.indexOf("MediaSearchController");
    const mediaIndex = controllerDeclaration.indexOf("MediaController");

    expect(controllerDeclaration).toBeDefined();
    expect(searchIndex).toBeGreaterThanOrEqual(0);
    expect(mediaIndex).toBeGreaterThanOrEqual(0);
    expect(searchControllerSource).toContain('@Controller("media/search")');
    expect(mediaControllerSource).toContain('@Get(":id")');
    expect(searchIndex).toBeLessThan(mediaIndex);
  });

  it("passes normalized search requests to the external search service", async () => {
    const search = jest.fn().mockResolvedValue([{ title: "Obsession" }]);
    const controller = new MediaSearchController({ search } as any);

    await expect(controller.search("  obsession  ", MediaType.MOVIE)).resolves.toEqual([
      { title: "Obsession" },
    ]);
    expect(search).toHaveBeenCalledWith("obsession", MediaType.MOVIE);
  });

  it("rejects blank media searches", async () => {
    const controller = new MediaSearchController({
      search: jest.fn(),
    } as any);

    await expect(controller.search("   ", MediaType.MOVIE)).rejects.toThrow(
      "Search query is required",
    );
  });
});
