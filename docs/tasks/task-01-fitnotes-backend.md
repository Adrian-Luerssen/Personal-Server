# Task: FitNotes Import Backend Improvements

**Agent**: Development Agent 1
**Priority**: P0
**Estimated Effort**: 5h

## Objective
Improve the FitNotes import backend with preview capability, progress streaming, and transaction safety.

## Repository
- **Path**: `/home/clawdia/.openclaw/workspace/Personal-Server`
- **Backend**: `backend/src/`

## Tasks

### 1. Preview Endpoint (2h)
Create `POST /workout/import/fitnotes/preview` that:
- Accepts a FitNotes SQLite file
- Analyzes without modifying database
- Returns counts of what will be created vs skipped
- Stores preview data in cache (Redis or memory) with TTL

**File**: `backend/src/workout/import/fitnotes-import.service.ts`

```typescript
interface FitNotesPreview {
  previewId: string;
  file: { name: string; size: number; valid: boolean };
  counts: {
    categories: { total: number; new: number; existing: number };
    exercises: { total: number; new: number; existing: number };
    sessions: { total: number; new: number; existing: number };
    sets: { total: number; new: number; existing: number };
    bodyweight: { total: number; new: number; existing: number };
  };
  dateRange: { earliest: string; latest: string };
  topExercises: Array<{ name: string; count: number }>;
  warnings: string[];
}

async previewImport(account: Account, file: Express.Multer.File): Promise<FitNotesPreview>
```

### 2. SSE Progress Streaming (2h)
Create `GET /workout/import/fitnotes/execute/:previewId` using Server-Sent Events:
- Stream progress updates during import
- Report stage (categories → exercises → sessions → bodyweight)
- Report current/total count per stage
- Handle client disconnection gracefully

```typescript
interface FitNotesProgress {
  stage: 'categories' | 'exercises' | 'sessions' | 'bodyweight' | 'complete';
  progress: number; // 0-100
  current: number;
  total: number;
  message: string;
}
```

### 3. Transaction Safety (1h)
Wrap the entire import in a database transaction:
- Create QueryRunner at start
- Use `queryRunner.manager` instead of repositories
- Rollback on any error
- Commit only if all stages succeed

## Testing
- Test with FitNotes file: `/home/clawdia/.openclaw/media/references/FitNotes_Backup.fitnotes`
- Verify preview counts match actual data
- Test progress streaming with curl/EventSource
- Test rollback by forcing an error mid-import

## Deliverables
1. Updated `fitnotes-import.service.ts` with preview + execute methods
2. Updated `import.controller.ts` with new endpoints
3. DTO classes for request/response
4. Brief testing notes
