import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { MediaType } from "../entities/media-item.entity";

export interface SearchResult {
  title: string;
  type: MediaType;
  coverUrl: string | null;
  year: number | null;
  description: string | null;
  externalIds: Record<string, any>;
  metadata: Record<string, any>;
}

@Injectable()
export class MediaSearchService {
  private readonly logger = new Logger(MediaSearchService.name);

  async search(query: string, type?: MediaType): Promise<SearchResult[]> {
    const searches: Promise<SearchResult[]>[] = [];

    if (!type || type === MediaType.ANIME || type === MediaType.MANGA) {
      if (!type) {
        searches.push(this.searchJikan(query, "anime"));
        searches.push(this.searchJikan(query, "manga"));
      } else {
        searches.push(
          this.searchJikan(query, type === MediaType.ANIME ? "anime" : "manga")
        );
      }
    }

    if (!type || type === MediaType.TV || type === MediaType.MOVIE) {
      searches.push(this.searchTmdb(query, type));
    }

    if (!type || type === MediaType.BOOK) {
      searches.push(this.searchOpenLibrary(query));
    }

    const settled = await Promise.all(
      searches.map((p) =>
        p.then(
          (v) => ({ ok: true as const, value: v }),
          (e) => ({ ok: false as const, reason: e })
        )
      )
    );
    const items: SearchResult[] = [];

    for (const result of settled) {
      if (result.ok) {
        items.push(...result.value);
      } else {
        this.logger.warn(
          `Search provider failed: ${(result as any).reason}`
        );
      }
    }

    return items;
  }

  // ========== JIKAN (MyAnimeList) ==========

  private async searchJikan(
    query: string,
    type: "anime" | "manga"
  ): Promise<SearchResult[]> {
    const resp = await axios.get(`https://api.jikan.moe/v4/${type}`, {
      params: { q: query, limit: 10 },
      timeout: 10000,
    });

    return (resp.data.data || []).map((item: any) => ({
      title: item.title || item.title_english || "",
      type: type === "anime" ? MediaType.ANIME : MediaType.MANGA,
      coverUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || null,
      year: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : null),
      description: item.synopsis ? item.synopsis.slice(0, 500) : null,
      externalIds: { malId: item.mal_id },
      metadata:
        type === "anime"
          ? {
              episodes: item.episodes,
              episodesWatched: 0,
              airingStatus: item.status,
              genres: (item.genres || []).map((g: any) => g.name),
            }
          : {
              chapters: item.chapters,
              volumes: item.volumes,
              chaptersRead: 0,
              volumesRead: 0,
              genres: (item.genres || []).map((g: any) => g.name),
            },
    }));
  }

  // ========== TMDB ==========

  private async searchTmdb(
    query: string,
    type?: MediaType
  ): Promise<SearchResult[]> {
    const tmdbKey = process.env.TMDB_API_KEY;
    if (!tmdbKey) {
      this.logger.warn("TMDB_API_KEY not configured, skipping TMDB search");
      return [];
    }

    const searchType =
      type === MediaType.MOVIE
        ? "movie"
        : type === MediaType.TV
        ? "tv"
        : "multi";

    const resp = await axios.get(
      `https://api.themoviedb.org/3/search/${searchType}`,
      {
        params: { api_key: tmdbKey, query, page: 1 },
        timeout: 10000,
      }
    );

    return (resp.data.results || [])
      .filter(
        (item: any) =>
          item.media_type === "movie" ||
          item.media_type === "tv" ||
          searchType !== "multi"
      )
      .slice(0, 10)
      .map((item: any) => {
        const isMovie =
          searchType === "movie" ||
          (searchType === "multi" && item.media_type === "movie");
        return {
          title: item.title || item.name || "",
          type: isMovie ? MediaType.MOVIE : MediaType.TV,
          coverUrl: item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : null,
          year: item.release_date
            ? new Date(item.release_date).getFullYear()
            : item.first_air_date
            ? new Date(item.first_air_date).getFullYear()
            : null,
          description: item.overview ? item.overview.slice(0, 500) : null,
          externalIds: { tmdbId: item.id },
          metadata: isMovie
            ? { runtime: null }
            : { seasons: null, episodesWatched: 0 },
        };
      });
  }

  // ========== OPEN LIBRARY ==========

  private async searchOpenLibrary(query: string): Promise<SearchResult[]> {
    const resp = await axios.get("https://openlibrary.org/search.json", {
      params: { q: query, limit: 10 },
      timeout: 10000,
    });

    return (resp.data.docs || []).slice(0, 10).map((item: any) => ({
      title: item.title || "",
      type: MediaType.BOOK,
      coverUrl: item.cover_i
        ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg`
        : null,
      year: item.first_publish_year || null,
      description: null,
      externalIds: {
        openLibraryKey: item.key,
        isbn: item.isbn ? item.isbn[0] : null,
      },
      metadata: {
        authors: item.author_name || [],
        pages: item.number_of_pages_median || null,
        pagesRead: 0,
        subjects: (item.subject || []).slice(0, 5),
      },
    }));
  }
}
