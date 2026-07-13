# Media Search Routing Bugfix Design

## Problem

`GET /api/media/search?q=obsession&type=movie` is registered after the
parameterized `GET /api/media/:id` route. Nest therefore treats `search` as a
media ID and passes it to `ParseUUIDPipe` instead of invoking the external
media-search handler. The application exception filter also identifies HTTP
exceptions by exact constructor, so subclasses such as `BadRequestException`
fall through to the generic 500 response.

## Intended behavior

- `GET /api/media/search` reaches `MediaSearchController` and returns the
  external provider results from `MediaSearchService`.
- A missing or blank search query remains a 400 response.
- A malformed UUID supplied to a genuine media item route remains a 400
  response rather than being rewritten as a 500.
- Valid UUID-based media routes retain their existing behavior.

## Design

Register `MediaSearchController` before `MediaController` in `MediaModule` so
the static search path is bound before the parameterized item path. Keep the
controllers separate and avoid broader media API restructuring.

Update `AppExceptionFilter` to recognize Nest HTTP exception subclasses with
`instanceof HttpException` and preserve their status. Retain the existing
special handling for TypeORM errors and the current structured error response.

## Testing

Add a focused regression test for the controller order declared by
`MediaModule`. Assert that `MediaSearchController` is registered before
`MediaController`, which prevents `/media/search` from entering the later
`/media/:id` UUID route.

Add focused exception-filter tests proving that `BadRequestException` produces
400 and an unknown error still produces 500. Run the focused tests, the backend
test suite, lint/type checks as supported by the repository, and a production
backend build.

## Ongoing bugfix branch workflow

Use `codex/bugfixes` as the ongoing branch. Before starting each subsequently
reported bug, update local `main`, switch back to `codex/bugfixes`, and merge
the current `main` before reproducing or editing the next fix.
