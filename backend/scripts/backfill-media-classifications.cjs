const { Client } = require("pg");

const APPLY = process.argv.includes("--apply");
const VALID_TYPES = new Set(["anime", "manga", "tv", "movie", "book"]);
const TV_FORMATS = new Set(["tv", "tv_short", "ova", "ona", "special"]);

function classificationsFor(type, metadata = {}) {
  const classifications = [];
  const add = (value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();
    if (VALID_TYPES.has(normalized) && !classifications.includes(normalized)) {
      classifications.push(normalized);
    }
  };

  add(type);
  const format = String(metadata.mediaFormat || "")
    .trim()
    .toLowerCase();
  if (Array.isArray(metadata.tags)) {
    metadata.tags.forEach((tag) => {
      const normalizedTag = String(tag || "")
        .trim()
        .toLowerCase();
      if (
        type === "anime" &&
        format &&
        (normalizedTag === "tv" || normalizedTag === "movie")
      ) {
        return;
      }
      add(tag);
    });
  }

  if (format === "movie") add("movie");
  if (type === "anime" && TV_FORMATS.has(format)) add("tv");

  return classifications;
}

function normalizedStatus(status, rating, classifications) {
  if (!classifications.includes("movie")) return status;
  if (rating !== null && rating !== undefined && Number.isFinite(Number(rating))) {
    return "completed";
  }
  return status === "watching" || status === "reading" ? "planning" : status;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchAnimeFormatFromAniList(malId) {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Record media classification backfill",
    },
    body: JSON.stringify({
      query: `
        query AnimeFormatByMalId($malId: Int) {
          Media(idMal: $malId, type: ANIME) {
            idMal
            format
          }
        }
      `,
      variables: { malId: Number(malId) },
    }),
  });
  if (!response.ok) {
    throw new Error(`AniList returned ${response.status}`);
  }
  const body = await response.json();
  if (body?.errors?.length) {
    throw new Error(body.errors[0]?.message || "AniList returned an error");
  }
  const media = body?.data?.Media;
  if (!media?.idMal || !media?.format) {
    throw new Error("AniList anime format was not found");
  }
  return media.format;
}

async function fetchAnimeFormatFromAniListTitle(title) {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Record media classification backfill",
    },
    body: JSON.stringify({
      query: `
        query AnimeFormatByTitle($search: String) {
          Media(search: $search, type: ANIME) {
            format
          }
        }
      `,
      variables: { search: title },
    }),
  });
  if (!response.ok) {
    throw new Error(`AniList title search returned ${response.status}`);
  }
  const body = await response.json();
  const format = body?.data?.Media?.format;
  if (!format) throw new Error("AniList title format was not found");
  return format;
}

async function fetchAnimeFormat(malId, title) {
  let lastError;
  try {
    return await fetchAnimeFormatFromAniList(malId);
  } catch (error) {
    lastError = error;
  }

  if (title) {
    try {
      return await fetchAnimeFormatFromAniListTitle(title);
    } catch (error) {
      lastError = error;
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`https://api.jikan.moe/v4/anime/${malId}/full`, {
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": "Record media classification backfill" },
      });
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`Jikan returned ${response.status}`);
      }
      if (!response.ok) return null;
      const body = await response.json();
      return body?.data?.type || null;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await sleep(1000 * (attempt + 1));
    }
  }

  throw lastError;
}

async function loadVerification(client) {
  const verificationResult = await client.query(`
    select
      count(*) filter (
        where type = 'anime'
          and lower(coalesce(metadata->>'mediaFormat', '')) = 'movie'
      )::int as "animeMovies",
      count(*) filter (
        where type = 'anime'
          and lower(coalesce(metadata->>'mediaFormat', '')) = 'movie'
          and not coalesce(metadata->'tags', '[]'::jsonb) ? 'movie'
      )::int as "animeMoviesMissingMovieTag",
      count(*) filter (
        where type = 'anime'
          and lower(coalesce(metadata->>'mediaFormat', '')) in (
            'tv', 'tv_short', 'ova', 'ona', 'special'
          )
          and not coalesce(metadata->'tags', '[]'::jsonb) ? 'tv'
      )::int as "animeSeriesMissingTvTag",
      count(*) filter (
        where not coalesce(metadata->'tags', '[]'::jsonb) ? type::text
      )::int as "rowsMissingPrimaryTag",
      count(*) filter (
        where coalesce(metadata->'tags', '[]'::jsonb) ? 'movie'
          and status in ('watching', 'reading')
      )::int as "moviesWithInvalidActiveStatus",
      count(*) filter (
        where type = 'anime'
          and nullif(trim(coalesce(metadata->>'mediaFormat', '')), '') is null
      )::int as "animeMissingFormat"
    from app_media_item
  `);
  const suzumeResult = await client.query(`
    select
      title,
      type,
      status,
      rating,
      metadata->>'mediaFormat' as format,
      metadata->'tags' as tags
    from app_media_item
    where lower(title) = lower('Suzume no Tojimari')
  `);
  return {
    metrics: verificationResult.rows[0],
    suzume: suzumeResult.rows,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    query_timeout: 30000,
    statement_timeout: 30000,
    application_name: "record-media-classification-backfill",
  });
  await client.connect();

  try {
    const result = await client.query(`
      select
        id,
        title,
        type,
        status,
        rating,
        metadata,
        to_jsonb(item)->'externalIds' as external_ids
      from app_media_item item
      order by id
    `);

    const changes = [];
    const providerFailures = [];
    for (const row of result.rows) {
      const metadata = { ...(row.metadata || {}) };
      if (
        row.type === "anime" &&
        !String(metadata.mediaFormat || "").trim() &&
        row.external_ids?.malId
      ) {
        try {
          const format = await fetchAnimeFormat(
            row.external_ids.malId,
            row.title
          );
          if (format) metadata.mediaFormat = format;
        } catch (error) {
          providerFailures.push({
            title: row.title,
            malId: row.external_ids.malId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        await sleep(450);
      }

      const classifications = classificationsFor(row.type, metadata);
      metadata.tags = classifications;
      const status = normalizedStatus(row.status, row.rating, classifications);
      const metadataChanged = JSON.stringify(metadata) !== JSON.stringify(row.metadata || {});
      if (metadataChanged || status !== row.status) {
        changes.push({
          id: row.id,
          title: row.title,
          type: row.type,
          previousTags: row.metadata?.tags || [],
          classifications,
          previousStatus: row.status,
          status,
          metadata,
        });
      }
    }

    const summary = {
      mode: APPLY ? "apply" : "dry-run",
      scanned: result.rowCount,
      changed: changes.length,
      animeMovies: changes.filter(
        (change) =>
          change.classifications.includes("anime") &&
          change.classifications.includes("movie")
      ).length,
      statusChanges: changes.filter(
        (change) => change.previousStatus !== change.status
      ).length,
      providerFailures,
    };

    if (!APPLY) {
      summary.verification = await loadVerification(client);
      console.log(JSON.stringify(summary, null, 2));
      console.log(
        JSON.stringify(
          changes.slice(0, 30).map(({ metadata, ...change }) => change),
          null,
          2
        )
      );
      return;
    }

    await client.query("begin");
    try {
      for (const change of changes) {
        await client.query(
          "update app_media_item set metadata = $1::jsonb, status = $2 where id = $3",
          [JSON.stringify(change.metadata), change.status, change.id]
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }

    summary.verification = await loadVerification(client);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
