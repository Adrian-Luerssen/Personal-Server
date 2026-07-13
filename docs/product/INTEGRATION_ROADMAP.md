# Integration roadmap

Prioritize integrations by manual work removed, provenance quality, permission risk, and recoverability. Every imported or detected record must identify its source and remain correctable.

## Priority order

| Priority | Integration | Customer value | Permission and failure design |
|---:|---|---|---|
| 1 | FitNotes import and repeat import | immediate Gym history and familiar workflow | preview counts; deterministic dedupe; downloadable error rows |
| 1 | Cashew import | immediate Cash history | preserve wallet/category/source IDs; preview before commit; rollback import batch |
| 1 | MyAnimeList import and sync | immediate Series library and progress | OAuth where available; conflict preview; never silently overwrite newer local progress |
| 1 | Spotify | listening history and stats.fm-style insight | explicit OAuth scopes; expired-token state; separate source time from ingestion time |
| 1 | Android payment notifications | removes transaction typing | on-device parsing; normalized fields only; review before posting when confidence is incomplete |
| 2 | Health Connect | steps and selected health summaries | granular permissions; local timestamp and source app; clear revoked state |
| 2 | HabitShare and generic CSV | migration from existing habit tools | column mapping preview; cadence validation; import report |
| 2 | Trakt or SIMKL | broader Series sync | per-field conflict resolution and rate-limit state |
| 3 | Bank aggregation provider | high Cash automation | regulated provider, explicit consent expiry, reconciliation and duplicate controls |
| 3 | Calendar | planning and workout context | read-only first; selected calendars; private-title redaction option |
| 3 | Apple Health / iOS capture | iOS parity | native permission model and App Store privacy disclosures |

## Integration contract

Each connector must expose:

1. Requested scopes and why each is needed.
2. Last successful sync, last attempted sync, and current failure.
3. Source identity and source timestamp on resulting records.
4. Idempotency or deterministic deduplication.
5. A preview for destructive, bulk, or conflict-producing operations.
6. Revocation behavior that does not delete existing records without confirmation.
7. Export behavior that does not depend on the connection remaining active.

## Product opportunities

- A migration concierge can convert high-friction setup into paid onboarding.
- Connector health can become a valuable managed-service feature without withholding self-host compatibility.
- A provenance API lets user-owned agents query where a fact came from.
- Household integrations become viable only after per-person permissions and shared-account boundaries exist.

## Explicitly deferred

Do not add broad social feeds, data brokerage, arbitrary notification scraping, or write access to calendars and banks until the read/import paths are reliable. More connectors are not a premium signal if customers cannot understand failures.
