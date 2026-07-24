import { MediaType } from "../entities/media-item.entity";
import {
  getMediaClassifications,
  hasMediaClassification,
  withMediaClassifications,
} from "./media-classification";

describe("media classification", () => {
  it("classifies an anime movie as both anime and movie", () => {
    expect(
      getMediaClassifications(MediaType.ANIME, { mediaFormat: "Movie" })
    ).toEqual([MediaType.ANIME, MediaType.MOVIE]);
  });

  it("preserves valid secondary classifications and removes duplicates", () => {
    expect(
      getMediaClassifications(MediaType.ANIME, {
        mediaFormat: "Movie",
        tags: ["movie", "anime", "tv", "movie", "invalid"],
      })
    ).toEqual([MediaType.ANIME, MediaType.MOVIE]);
  });

  it("writes canonical classifications without losing other metadata", () => {
    expect(
      withMediaClassifications(MediaType.ANIME, {
        mediaFormat: "Movie",
        synopsis: "A door opens.",
      })
    ).toEqual({
      mediaFormat: "Movie",
      synopsis: "A door opens.",
      tags: [MediaType.ANIME, MediaType.MOVIE],
    });
  });

  it("recognizes movie behavior from a secondary classification", () => {
    expect(
      hasMediaClassification(
        MediaType.ANIME,
        { mediaFormat: "Movie" },
        MediaType.MOVIE
      )
    ).toBe(true);
  });
});
