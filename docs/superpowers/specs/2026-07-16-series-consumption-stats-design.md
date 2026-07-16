# Series consumption statistics

## Goal

Turn the Series overview into a useful personal media record by showing how much
has been watched or read, while distinguishing measured runtime from estimates.

## Contract

`GET /media/stats` retains its existing fields and adds:

- `consumption.watchMinutes`: exact and estimated minutes combined.
- `consumption.exactWatchMinutes`: runtime from watched catalog episodes.
- `consumption.estimatedWatchMinutes`: runtime inferred from aggregate progress.
- `consumption.episodesWatched`, `chaptersRead`, and `pagesRead`.
- `consumption.completionRate`: completed titles divided by tracked titles.
- `topGenres`: the five most frequent normalized genre labels.

Structured watched TV episodes take precedence over aggregate
`episodesWatched`, preventing double counting. Missing per-episode runtime uses
provider metadata, then conservative defaults of 24 minutes for anime, 45 for
TV, and 110 for completed films. Any inferred duration is reported separately
so the interface can label it as estimated.

## Interface

The Series list keeps its existing summary strip and adds one responsive
Consumption band before filters. Watch time is the visual anchor. Episodes,
chapters, pages, completion rate, and leading genres form the supporting
record. On narrow screens the three sections stack without changing reading
order or causing document overflow.

## Failure and compatibility

Older API responses without `consumption` continue to render the existing
Series page. Empty libraries return zero progress and no genres. Provider or
catalog failures do not erase existing aggregate metadata.

## Verification

- Service tests cover exact episode runtime, metadata estimates, reading totals,
  completion percentage, genre ordering, and prevention of double counting.
- Playwright verifies the visible values and the 320px Android layout.
- Backend and frontend production builds must complete before release.
