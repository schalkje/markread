# File System Caching Strategy Decision

**Decision Date**: 2025-12-29
**Feature**: Git Repository Integration (001-git-repo-integration)
**Context**: Electron application caching Git repository files

---

## Decision

### Chosen Approach: SQLite Index + Flat File Storage

**Primary Technology**: better-sqlite3 (synchronous SQLite for Node.js/Electron)
**Storage Location**: `app.getPath('userData')/git-cache/`
**Eviction Strategy**: Dual-tier LRU (per-repository + global)

---

## Rationale

1. **Atomic Consistency**: SQLite provides ACID transactions preventing cache corruption during concurrent access or unexpected crashes. Critical for maintaining index-to-filesystem consistency.

2. **O(1) Fast Lookups**: Indexed queries on (repo_url, branch, file_path) enable sub-10ms file lookups, meeting the <1 second cached file load requirement.

3. **Built-in Concurrency Safety**: SQLite's file-level locking handles multiple concurrent reads and exclusive write access without manual mutex implementation, eliminating potential deadlock issues.

4. **Scalable Eviction**: Native SQL queries on access_timestamp index enable efficient LRU eviction for both per-repository (100MB) and global (5GB) limits without full cache scans.

---

## Alternatives Considered

### 1. Flat File Structure (Direct fs Module)
**Why Rejected:**
- Directory traversal required for LRU calculation: O(n) on every eviction
- Manual file-level locking with race conditions risk
- No atomic operations: index-to-filesystem desynchronization possible
- Global cache size requires full scan (expensive on large caches)
- Per-file metadata tracking scattered across .json files

### 2. JSON Index + Flat Files
**Why Rejected:**
- Startup time: Parsing 50k+ file entries defeats <1 second app startup goal
- No concurrent write safety: requires process-wide lock blocking all operations
- Serialization failure could corrupt entire index
- Complex eviction queries require multiple scans of JSON structure
- No built-in mechanisms for data consistency

### 3. In-Memory LRU Only (No Persistence)
**Why Rejected:**
- Cache lost on application restart violates offline access requirement
- 5GB limit impossible with process memory constraints
- No per-file fine-grained control

---

## Implementation Approach

### Directory Structure
```
~/AppData/MarkRead/git-cache/
├── cache.db                          # SQLite index
└── repos/
    ├── [repo-normalized-id]/
    │   ├── [branch]/
    │   │   ├── [file-path-hash].content
    │   │   ├── assets/
    │   │   │   └── [asset-hash].bin
    │   └── ...
    └── ...
```

### Database Schema
**Primary Table**: `cache_entries`
- Indexed on: `(repo_url, branch, file_path)` → O(1) lookup
- Indexed on: `access_timestamp` → Efficient LRU sorting
- Indexed on: `repo_url` → Per-repository operations

**Supporting Table**: `repo_cache_stats`
- Tracks per-repository size and file count
- Avoids expensive full scans

### Eviction Triggers

**Tier 1: Per-Repository** (checked after each file fetch)
```
if (repo_size > 100MB) {
  evict_lru(repo_url, excess_bytes)
}
```

**Tier 2: Global** (checked on app startup + periodic background)
```
if (total_cache > 5GB) {
  evict_lru_globally(excess_bytes)
}
```

### Concurrent Access Handling

**Strategy**: Promise-based sequential locking per file path
```typescript
// File-level mutex prevents concurrent writes to same entry
const fileLocks = new Map<string, Promise<void>>();

// SQLite transaction ensures atomic database updates
// Built-in SQLite locking handles concurrent readers
```

### Lookup Performance

Single indexed query returns entry metadata in <10ms:
```sql
SELECT id, size_bytes, fetch_timestamp
FROM cache_entries
WHERE repo_url = ? AND branch = ? AND file_path = ?
```

Followed by synchronous file read from cached location (local disk).

---

## Platform-Specific Details

### Windows
- **AppData Path**: `C:\Users\[Username]\AppData\Local\MarkRead\git-cache\`
- **Electron API**: `app.getPath('userData')`
- **Roaming Consideration**: Cache should NOT sync to cloud; can exclude via .noaccess attribute

### macOS
- **AppData Path**: `~/Library/Application Support/MarkRead/git-cache/`
- **Electron API**: `app.getPath('userData')`
- **Time Machine**: Cache directory should be marked as non-backed-up via extended attribute

### Linux
- **AppData Path**: `~/.config/MarkRead/git-cache/`
- **Electron API**: `app.getPath('userData')`
- **XDG Compliance**: Standard location, no special considerations

---

## Eviction Algorithm Details

### Dual-Tier Approach

**Per-Repository Threshold**
- Limit: 100MB
- Trigger: After successful file fetch
- Action: Delete oldest (by access_timestamp) entries until under 90MB

**Global Threshold**
- Limit: 5GB
- Trigger: On app startup + hourly background check
- Action: Delete globally oldest entries until under 4.5GB

### LRU Implementation

```sql
-- Find entries to evict for repository
SELECT id, size_bytes FROM cache_entries
WHERE repo_url = ?
ORDER BY access_timestamp ASC
LIMIT ?;

-- Update access timestamp on read (background, non-blocking)
UPDATE cache_entries
SET access_timestamp = ?
WHERE id = ?;
```

---

## Metadata & Cache Validation

### Per-Entry Metadata
- `fetch_timestamp`: When file was cached (ISO 8601)
- `access_timestamp`: When file was last read (Unix timestamp)
- `size_bytes`: Cached file size (for eviction calculations)
- `etag`: HTTP ETag for conditional requests (future: cache invalidation)
- `content_type`: MIME type for proper rendering

### Startup Validation
```
1. Open cache.db with integrity check
2. Verify repo_cache_stats accuracy (scan if needed)
3. Delete orphaned files (entries in DB but missing on disk)
4. Log validation results for diagnostics
```

---

## Performance Characteristics

| Operation | Latency | Notes |
|-----------|---------|-------|
| **File Lookup** | <10ms | Indexed SQLite query |
| **File Read (Hit)** | <500ms | Disk I/O + rendering |
| **File Write** | 50-150ms | Lock + File write + DB insert |
| **Repo Eviction** | <500ms | Batch 50-100 entries typical |
| **Global Eviction** | 2-5s | Rare, runs in background |
| **App Startup** | <500ms | DB open + stats query |

---

## Dependencies Required

```json
{
  "dependencies": {
    "better-sqlite3": "^9.0.0"  // Synchronous SQLite for Electron
  }
}
```

### Why better-sqlite3?
- Synchronous API matches Electron main process requirements
- No callbacks/promises for simpler error handling
- Excellent performance for medium-scale databases (5GB+)
- Active maintenance and Electron community support
- Native bindings compiled for target platform during npm install

---

## Testing Strategy

### Unit Tests
- [ ] Cache entry write/read operations
- [ ] LRU eviction correctness (verify oldest entries deleted)
- [ ] Per-repository size limits enforced
- [ ] Global cache size limits enforced
- [ ] Concurrent write serialization
- [ ] Metadata persistence and retrieval

### Integration Tests
- [ ] Multi-repository cache management
- [ ] Branch switching cache isolation
- [ ] Offline access after cache population
- [ ] Cache corruption recovery
- [ ] Large file handling (>100MB)

### Performance Tests
- [ ] Lookup latency with 10k+ entries
- [ ] Eviction speed with cache full
- [ ] Startup time with large cache
- [ ] Concurrent access stress (100+ simultaneous reads)

### Platform Tests
- [ ] AppData path resolution on Windows/macOS/Linux
- [ ] File permissions (read-only, write) across platforms
- [ ] Disk space handling (low disk scenarios)

---

## Risk Mitigation

### Risk: SQLite Database Corruption
**Mitigation**:
- Implement startup integrity check (PRAGMA integrity_check)
- Maintain WAL (Write-Ahead Logging) for crash recovery
- Graceful recovery: rebuild index from filesystem on corruption

### Risk: Concurrent Access Race Condition
**Mitigation**:
- File-level promise-based mutex prevents simultaneous writes
- SQLite transaction isolation prevents index corruption
- Atomic file operations (write-then-rename)

### Risk: Disk Space Exhaustion
**Mitigation**:
- Eviction triggers at 90% thresholds (100MB per-repo, 5GB global)
- Continuous monitoring of available disk space
- Emergency eviction if space drops below 500MB

### Risk: Stale Cache After External Modifications
**Mitigation**:
- Repository URL normalization ensures uniqueness
- ETags support conditional requests (future feature)
- Manual refresh button forces re-fetch

---

## Migration Path for Future Enhancements

This architecture enables:

1. **Compression**: Add compression flag to cache_entries, compress old entries
2. **Encryption**: Add encryption for sensitive files (auth tokens, private repos)
3. **Distributed Cache**: Sync cache across devices via cloud storage (future)
4. **Smart Prefetch**: ML-based prediction of likely-needed files
5. **Bandwidth Optimization**: Partial file caching (first N lines of large files)

---

## Summary Table

| Requirement | Solution | Status |
|-------------|----------|--------|
| 100MB per-repo limit | Tier-1 eviction on fetch | ✓ |
| 5GB total limit | Tier-2 eviction on startup | ✓ |
| LRU eviction | access_timestamp index + ORDER BY | ✓ |
| Fast lookup | Indexed query on (url, branch, path) | ✓ |
| Metadata storage | cache_entries table with timestamp/size | ✓ |
| Cross-platform AppData | app.getPath('userData') | ✓ |
| Concurrent safety | SQLite transactions + file locks | ✓ |
| Offline access | Direct file read from cache | ✓ |

---

## Recommendation: APPROVED FOR IMPLEMENTATION

This decision should be implemented in the following order:

1. **Phase 1**: Database schema and migration system
2. **Phase 2**: Core cache operations (read/write with locking)
3. **Phase 3**: Eviction system (per-repo and global)
4. **Phase 4**: Integration with Git API clients
5. **Phase 5**: Testing and performance validation

Estimated implementation time: 40-60 hours (including tests)
