import { MediaStatus } from "../entities/media-item.entity";

export function hasFullyWatchedEpisodes(
  metadata: Record<string, any> | null | undefined
): boolean {
  const watched = Number(metadata?.episodesWatched);
  const total = Number(metadata?.episodes);

  return (
    Number.isFinite(watched) &&
    Number.isFinite(total) &&
    total > 0 &&
    watched >= total
  );
}

export function normalizeImportedStatus(
  status: MediaStatus,
  metadata: Record<string, any> | null | undefined
): MediaStatus {
  return hasFullyWatchedEpisodes(metadata)
    ? MediaStatus.COMPLETED
    : status;
}
