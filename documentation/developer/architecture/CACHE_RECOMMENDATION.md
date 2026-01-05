# Git Cache Strategy - Executive Summary

## Decision

### SQLite Index + Flat File Storage

Use **better-sqlite3** to maintain an indexed SQLite database of cached files, with actual file content stored in a flat directory structure under `app.getPath('userData')/git-cache/`.

---

## Rationale

**1. Atomic Consistency**: SQLite transactions prevent corruption during concurrent access or crashes—essential for maintaining index-to-filesystem synchronization.

**2. Fast O(1) Lookups**: Indexed queries on `(repo_url, branch, file_path)` deliver sub-10ms lookups, meeting the <1 second cached file load requirement.

**3. Safe Concurrency**: SQLite's built-in file locking handles concurrent access without manual mutex code or deadlock risk.

**4. Efficient LRU Eviction**: Native SQL queries on `access_timestamp` index enable fast dual-tier eviction (per-repo: 100MB, global: 5GB) without expensive full scans.

---

## Alternatives Considered & Rejected

| Alternative | Why Rejected |
|---|---|
| **Flat Files Only** | O(n) traversal for LRU; no atomic operations; manual locking complexity; cache corruption risk |
| **JSON Index + Files** | Startup delay parsing 50k+ entries; no concurrent write safety; serialization corruption risk |
| **In-Memory Cache** | Lost on restart; violates offline requirement; 5GB impossible in memory |

---

## Directory Structure

```
~/AppData/MarkRead/git-cache/
├── cache.db                          # SQLite index
└── repos/
    ├── [repo-normalized-id]/
    │   ├── [branch]/
    │   │   ├── [file-path-hash].content
    │   │   └── assets/[asset-hash].bin
```

---

## Database Schema (Simplified)

```sql
CREATE TABLE cache_entries (
  id TEXT PRIMARY KEY,
  repo_url TEXT NOT NULL,           -- normalized GitHub/Azure URL
  branch TEXT NOT NULL,
  file_path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  fetch_timestamp INTEGER NOT NULL,
  access_timestamp INTEGER NOT NULL, -- updated on read (for LRU)
  UNIQUE(repo_url, branch, file_path)
);

CREATE INDEX idx_lookup ON cache_entries(repo_url, branch, file_path);
CREATE INDEX idx_access ON cache_entries(access_timestamp);  -- for LRU
```

---

## Eviction Strategy

### Tier 1: Per-Repository (Checked after file fetch)
- Trigger: When repo cache > 100MB
- Action: Delete oldest (by access_timestamp) entries until 90MB

### Tier 2: Global (Checked on startup + hourly)
- Trigger: When total cache > 5GB
- Action: Delete globally oldest entries until 4.5GB

---

## Lookup Implementation

Single indexed query: **< 10ms**

```sql
SELECT id, size_bytes FROM cache_entries
WHERE repo_url = ? AND branch = ? AND file_path = ?
```

Then read file from disk (adds <500ms for typical markdown files).

---

## Concurrent Access

**Strategy**: Promise-based file-level mutex + SQLite transactions

```typescript
// File-level lock prevents simultaneous writes
const locks = new Map<string, Promise<void>>();

// SQLite transaction ensures atomic DB update
// SQLite's built-in locking handles readers
```

No deadlock risk; no manual file locking library needed.

---

## Platform Support

| OS | AppData Path | Electron API |
|---|---|---|
| **Windows** | `C:\Users\[user]\AppData\Local\MarkRead\git-cache\` | `app.getPath('userData')` |
| **macOS** | `~/Library/Application Support/MarkRead/git-cache/` | `app.getPath('userData')` |
| **Linux** | `~/.config/MarkRead/git-cache/` | `app.getPath('userData')` |

---

## Performance Summary

| Operation | Target | Expected |
|---|---|---|
| Cached file load | <1s | 500ms (disk I/O) |
| Uncached file fetch | <5s | 2-4s (network) |
| File lookup | <1s | <10ms (indexed query) |
| App startup | <1s | 400ms (DB open) |
| Cache eviction | — | <500ms typical |

---

## Dependencies

```json
{
  "better-sqlite3": "^9.0.0"  // Synchronous SQLite for Electron
}
```

**Why**:
- Synchronous API required for Electron main process
- No callback/promise complexity
- Excellent performance at 5GB+ scale
- Active Electron community support

---

## Implementation Phases

1. **Database Setup** (5-10h): Schema, migrations, initialization
2. **Core Operations** (10-15h): Read/write with locking, metadata management
3. **Eviction System** (10-15h): Per-repo and global eviction logic
4. **Testing** (10-20h): Unit, integration, performance, stress tests
5. **Integration** (5-10h): Wire into Git API clients

**Total**: 40-70 hours

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| **DB Corruption** | Startup integrity check (PRAGMA integrity_check); WAL recovery |
| **Race Conditions** | File-level mutex + SQLite transactions |
| **Disk Full** | Eviction at 90% thresholds; monitor available space |
| **Stale Cache** | URL normalization + ETag support (future) |

---

## Detailed Documentation

For complete analysis, see:
- **`/docs/cache-strategy-research.md`**: Full investigation of all options, algorithms, and rationale
- **`/CACHING_DECISION.md`**: Comprehensive implementation guide with schema, testing strategy, and migration path

---

## Recommendation: APPROVED

This approach is recommended for immediate implementation as it:
- ✓ Meets all performance requirements (<1s lookups, <100MB per-repo)
- ✓ Scales to 5GB with efficient eviction
- ✓ Handles concurrent access safely
- ✓ Works across Windows/macOS/Linux
- ✓ Requires only one external dependency (better-sqlite3)
- ✓ Provides clear upgrade path for future features

---

**Decision Date**: 2025-12-29
**Feature**: 001-git-repo-integration
**Status**: Ready for implementation
