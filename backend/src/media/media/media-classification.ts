import { MediaType } from "../entities/media-item.entity";

const MEDIA_TYPES = new Set<string>(Object.values(MediaType));
const TV_FORMATS = new Set(["tv", "tv_short", "ova", "ona", "special"]);

export function getMediaClassifications(
  type: MediaType,
  metadata: Record<string, any> = {}
): MediaType[] {
  const classifications: MediaType[] = [];
  const add = (value: unknown) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();
    if (
      MEDIA_TYPES.has(normalized) &&
      !classifications.includes(normalized as MediaType)
    ) {
      classifications.push(normalized as MediaType);
    }
  };

  add(type);
  const format = String(metadata.mediaFormat || "")
    .trim()
    .toLowerCase();
  if (Array.isArray(metadata.tags)) {
    for (const tag of metadata.tags) {
      const normalizedTag = String(tag || "")
        .trim()
        .toLowerCase();
      if (
        type === MediaType.ANIME &&
        format &&
        (normalizedTag === MediaType.TV || normalizedTag === MediaType.MOVIE)
      ) {
        continue;
      }
      add(tag);
    }
  }

  if (format === "movie") add(MediaType.MOVIE);
  if (type === MediaType.ANIME && TV_FORMATS.has(format)) add(MediaType.TV);

  return classifications;
}

export function hasMediaClassification(
  type: MediaType,
  metadata: Record<string, any> | undefined,
  classification: MediaType
): boolean {
  return getMediaClassifications(type, metadata).includes(classification);
}

export function withMediaClassifications(
  type: MediaType,
  metadata: Record<string, any> = {}
): Record<string, any> {
  return {
    ...metadata,
    tags: getMediaClassifications(type, metadata),
  };
}
