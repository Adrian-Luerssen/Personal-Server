# Media Search Routing Bugfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route external media searches to the search controller and preserve the HTTP status of Nest validation exceptions.

**Architecture:** Keep media search and media CRUD in separate controllers, but register the static search controller before the parameterized CRUD controller. Exercise the declared controller order directly and test the global exception filter at its response boundary.

**Tech Stack:** NestJS 9, TypeScript, Jest 29

---

### Task 1: Reproduce the media search route collision

**Files:**
- Create: `backend/src/media/media-routing.spec.ts`
- Modify: `backend/src/media/media.module.ts`

- [x] **Step 1: Write the failing routing regression test**

Read the controller declaration from `MediaModule` and assert that
`MediaSearchController` appears before `MediaController`. Also exercise the
search controller's query normalization and blank-query validation directly.

- [x] **Step 2: Run the route test to verify it fails**

Run:
`npm test -- --runInBand src/media/media-routing.spec.ts`

Expected: FAIL because `MediaController` captures `search` as `:id` and
`ParseUUIDPipe` returns 400.

- [x] **Step 3: Register the static controller first**

Change the `MediaModule` controller declaration to:

```ts
controllers: [MediaSearchController, MediaController, MediaImportController],
```

- [x] **Step 4: Run the route test to verify it passes**

Run:
`npm test -- --runInBand src/media/media-routing.spec.ts`

Expected: PASS with the static controller declared first.

### Task 2: Preserve Nest HTTP exception statuses

**Files:**
- Create: `backend/src/app-exception.filter.spec.ts`
- Modify: `backend/src/app-exception.filter.ts`

- [x] **Step 1: Write failing filter regression tests**

Call `AppExceptionFilter.catch` with a mocked HTTP `ArgumentsHost`. Assert a
`BadRequestException("Invalid request")` produces a JSON response with status
400, while a plain `Error("Unexpected failure")` produces status 500.

- [x] **Step 2: Run the filter test to verify the HTTP subclass case fails**

Run:
`npm test -- --runInBand src/app-exception.filter.spec.ts`

Expected: FAIL because the exact-constructor switch sends
`BadRequestException` to the default 500 branch.

- [x] **Step 3: Replace exact HTTP constructor matching**

Handle `exception instanceof HttpException` before the TypeORM constructor
switch. Preserve the current forbidden error code, validate the returned
status range, and leave TypeORM and unknown-error response behavior intact.

- [x] **Step 4: Run both focused test files**

Run:
`npm test -- --runInBand src/media/media-routing.spec.ts src/app-exception.filter.spec.ts`

Expected: both suites PASS.

### Task 3: Verify, commit, push, and merge

**Files:**
- Verify all files changed by Tasks 1 and 2.

- [x] **Step 1: Run backend verification**

Run:

```powershell
npx jest --runInBand --forceExit
npm run build
node node_modules/eslint/bin/eslint.js src/app-exception.filter.ts src/app-exception.filter.spec.ts src/media/media.module.ts src/media/media-routing.spec.ts
```

Result: 36 suites and 223 tests passed, and the backend build exited 0. The
non-mutating lint command could not complete because the Windows/OneDrive
workspace repeatedly returned `UNKNOWN: unknown error, read` while Node loaded
ESLint dependencies; it produced no source-code diagnostics.

- [x] **Step 2: Review the final diff**

Run `git diff --check`, inspect `git diff`, and confirm only the requested docs,
tests, module ordering, and exception filter are tracked.

- [ ] **Step 3: Commit and push the bugfix branch**

Commit the implementation as `fix: route media searches correctly`, then push
`codex/bugfixes` to `origin`.

- [ ] **Step 4: Merge into current main**

Fetch `origin`, update local `main` with `git pull --ff-only origin main`, merge
`codex/bugfixes`, rerun focused tests and the backend build, then push `main`.
