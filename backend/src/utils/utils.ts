import { SelectQueryBuilder, ObjectLiteral } from "typeorm";

const calculateScore = (value: number) => {
  if (value < 33) return "LOW";
  else if (value >= 33 && value < 66) return "MEDIUM";
  else return "HIGH";
};

const toPercent = (value = 0) => formatNumberNoDecimals(value * 100);

function formatNumberNoDecimals(x: number): string {
  const numberFormated = new Intl.NumberFormat("en", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(x);
  return numberFormated;
}

function addQueryFilters<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  filter: Record<string, any> | string,
  alias: string
): void {
  // Handle string filter as array
  const filters = Array.isArray(filter) ? filter : [filter];

  filters.forEach((filterItem) => {
    if (typeof filterItem !== "string") return;

    const decodedFilter = decodeURIComponent(filterItem);
    let [field, operator, value] = decodedFilter.split("||");

    if (!field || !operator || value === undefined) {
      console.warn(`Invalid filter: ${filterItem}`);
      return;
    }

    if (field.includes(".")) {
      const parts = field.split(".");
      field = parts[1];
      alias = parts[0];
    }

    switch (operator) {
      case "$in":
        qb.andWhere(`${alias}.${field} IN (:...values)`, {
          values: value.split(","),
        });
        break;

      case "$eq":
        qb.andWhere(`${alias}.${field} = :value`, { value });
        break;

      case "$like":
        if (alias === "packcat") {
          qb.andWhere(`${alias}.${field}::text ILIKE :value`, {
            value: `%${value}%`,
          });
        } else {
          qb.andWhere(`${alias}.${field} ILIKE :value`, {
            value: `%${value}%`,
          });
        }
        break;

      case "$ne":
        qb.andWhere(`${alias}.${field} != :value`, { value });
        break;

      case "$gt":
        qb.andWhere(`${alias}.${field} > :value`, { value });
        break;

      case "$lt":
        qb.andWhere(`${alias}.${field} < :value`, { value });
        break;

      default:
        console.warn(`Unsupported operator: ${operator}`);
    }
  });
}

function addQuerySort<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  sort: string,
  alias: string
) {
  const sortString = Array.isArray(sort) ? sort[0] : sort;
  let [sortField, sortOrder] = sortString.split(",");
  if (!sortField.includes(".")) {
    sortField = `${alias}.${sortField}`;
  }
  query.orderBy(`${sortField}`, sortOrder as "ASC" | "DESC");
}
/**
 * Validates if a given string is a valid UUID (version 1-5).
 * @param uuid - The string to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function resolveTimeframe(
  timeframe?: string,
  from?: string,
  to?: string
): { start?: Date; end: Date; label: string } {
  const end = new Date();
  if (from || to) {
    const start = from ? new Date(from) : undefined;
    const endOverride = to ? new Date(to) : end;
    return { start, end: endOverride, label: "custom" };
  }
  switch ((timeframe || "").toLowerCase()) {
    case "today":
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return { start, end, label: "today" };
    case "7d":
    case "week":
    case "last7days":
      return { start: new Date(Date.now() - 7 * 86400000), end, label: "7d" };
    case "30d":
    case "month":
    case "last30days":
      return {
        start: new Date(Date.now() - 30 * 86400000),
        end,
        label: "30d",
      };
    case "90d":
      return {
        start: new Date(Date.now() - 90 * 86400000),
        end,
        label: "90d",
      };
    case "6m":
    case "6months":
    case "sixmonths":
      return {
        start: new Date(new Date().setMonth(end.getMonth() - 6)),
        end,
        label: "6m",
      };
    case "1y":
    case "year":
    case "lastyear":
      return {
        start: new Date(new Date().setFullYear(end.getFullYear() - 1)),
        end,
        label: "1y",
      };
    case "all":
    default:
      return { start: undefined, end, label: "all" };
  }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function parseRetryAfterMs(err: any): number | null {
  // If your getRecentlyPlayed throws with response-like object
  const retry = err?.response?.headers?.["retry-after"];
  if (!retry) return null;
  const n = Number(retry);
  return Number.isFinite(n) ? n * 1000 : null;
}

/**
 * Formats a date into YYYY-MM-DD for a specific IANA timezone, without external libs.
 * Uses Intl.DateTimeFormat with timeZone to avoid DST math complexity.
 */
function formatDateYYYYMMDDInZone(date: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date);
}

export {
  calculateScore,
  toPercent,
  formatNumberNoDecimals,
  addQueryFilters,
  addQuerySort,
  isValidUUID,
  resolveTimeframe,
  sleep,
  parseRetryAfterMs,
  formatDateYYYYMMDDInZone,
};
