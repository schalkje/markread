# File System Caching Strategy for Git Repository Integration

**Research Date**: 2025-12-29
**Context**: Electron application caching Git repository files with 100MB per-repo limit and 5GB total limit

## Requirements Analysis

### Functional Requirements
- **Per-repository cache**: 100MB limit
- **Total cache**: 5GB limit
- **Eviction**: LRU (Least Recently Used)
- **Lookup**: Fast access by (repository URL + branch + file path)
- **Metadata**: Store fetch timestamp and file size
- **Platforms**: Windows, macOS, Linux (via Electron)

### Performance Targets (from spec.md)
- Cached file load: < 1 second
- Uncached file load: < 5 seconds
- Branch switching: < 5 seconds
- Application startup: < 1 second to load recent items

## Key Investigation Areas

### 1. File System Structure Options

#### Option A: Flat File Structure
```
~/AppData/MarkRead/cache/
├── repos/
│   ├── github-com-user-repo/          (normalized URL hash)
│   │   ├── main/                       (branch folder)
│   │   │   ├── README.md
│   │   │   ├── docs/
│   │   │   │   └── api.md
│   │   │   └── .cache-metadata.json    (timestamp, size)
│   │   └── develop/
│   │       └── ...
│   └── azure-dev-org-project/
│       └── ...
└── .index.json                         (global cache index)
```

**Pros:**
- Direct file operations via Node.js fs module
- Offline access to cached markdown files
- Natural directory structure mirrors repository
- No external dependencies
- Simple to understand and debug

**Cons:**
- Directory traversal required for LRU eviction
- Global size calculation requires scanning all files
- No atomic operations for consistency
- Concurrent access requires manual locking
- Image/asset caching mixed with markdown

#### Option B: SQLite Index with Flat Files
```
~/AppData/MarkRead/
├── cache.db                            (SQLite index)
└── file-cache/
    ├── repos/
    │   ├── [repo-id]/
    │   │   ├── [branch]/
    │   │   │   ├── [file-hash].md
    │   │   │   └── [file-hash].bin     (for images)
```

**Schema:**
```sql
CREATE TABLE cache_entries (
  id TEXT PRIMARY KEY,
  repo_url TEXT NOT NULL,
  branch TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT,
  size_bytes INTEGER NOT NULL,
  fetch_timestamp INTEGER NOT NULL,
  access_timestamp INTEGER NOT NULL,
  content_type TEXT,
  file_location TEXT NOT NULL,
  UNIQUE(repo_url, branch, file_path)
);

CREATE TABLE repo_stats (
  repo_url TEXT PRIMARY KEY,
  total_size INTEGER NOT NULL,
  file_count INTEGER NOT NULL,
  last_sync INTEGER
);

CREATE INDEX idx_access ON cache_entries(access_timestamp);
CREATE INDEX idx_repo ON cache_entries(repo_url);
CREATE INDEX idx_lookup ON cache_entries(repo_url, branch, file_path);
```

**Pros:**
- Fast lookup by URL + branch + file path via indexed queries
- Atomic transactions for consistency
- Quick size calculations per repo
- Efficient LRU eviction (sort by access_timestamp)
- Supports complex queries (e.g., "find all stale entries")
- ACID compliance prevents corruption

**Cons:**
- Additional dependency (better-sqlite3 for Electron)
- Database file could be corrupted if process crashes
- Slightly higher memory footprint during queries
- Need to maintain index-to-filesystem consistency

#### Option C: JSON Index with Flat Files
```
~/AppData/MarkRead/cache/
├── index.json                          (in-memory cache index)
└── repos/
    └── [repo-hash]/
        └── ...
```

**Pros:**
- Simple JSON structure
- Can be loaded entirely into memory for fast lookups
- No external database dependency
- Version-friendly for upgrades

**Cons:**
- Serialization/deserialization overhead
- Large index (50k+ files) becomes cumbersome
- Concurrent access requires process-wide locks
- Potential data loss if not flushed properly

---

### 2. Cache Eviction Algorithms

#### LRU Implementation Strategies

**Strategy A: Access Timestamp Ranking**
- Update `access_timestamp` on every file access
- Evict entries with oldest `access_timestamp`
- Suitable for: SQLite approach (efficient indexed queries)

```typescript
// Eviction trigger: when repo size > 100MB
const entriesToDelete = db.prepare(`
  SELECT id FROM cache_entries
  WHERE repo_url = ?
  ORDER BY access_timestamp ASC
  LIMIT ?
`).all(repoUrl, countToEvict);
```

**Strategy B: Weighted LRU (Size-Aware)**
- Track both recency and file size
- Prefer evicting larger old files
- Better for mixed-size repositories

```typescript
// Sort by: (now - access_time) * file_size
const score = (now - accessTime) * sizeBytes;
// Evict highest-scoring entries first
```

**Strategy C: Two-Tier Eviction**
1. Per-repository eviction: when > 100MB
2. Global eviction: when total > 5GB

Triggers:
- **Per-repo**: Check on file fetch completion
- **Global**: Daily background check or on startup

---

### 3. Concurrent Access Handling

#### Challenge: Node.js fs Module Limitations
- Node.js threadpool is not synchronized
- Multiple concurrent writes to same file = corruption risk
- No built-in file locking in Node.js

#### Solution: Promise-Based Sequential Locking

```typescript
// Implement file-level mutex
class CacheManager {
  private locks = new Map<string, Promise<void>>();

  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const currentLock = this.locks.get(key) ?? Promise.resolve();
    const newLock = currentLock.then(fn);
    this.locks.set(key, newLock);
    try {
      return await newLock;
    } finally {
      if (this.locks.get(key) === newLock) {
        this.locks.delete(key);
      }
    }
  }
}

// Usage
await cacheManager.withLock(`${repoUrl}:${branch}:${filePath}`, async () => {
  // Safe to write file
  await fs.promises.writeFile(cachePath, content);
});
```

#### SQLite Advantages for Concurrency
- File-level locking built-in
- Transactions ensure consistency
- Multiple readers + single writer supported
- Automatic retry on lock contention

---

### 4. AppData Folder Locations

#### Windows
- Path: `C:\Users\[Username]\AppData\Local\MarkRead`
- Electron API: `app.getPath('userData')`
- Behavior: Per-user, synced with Windows roaming profiles (for small files)
- Recommendation: Use `appData` for cache if <100MB/user, otherwise create custom path

#### macOS
- Path: `~/Library/Application Support/MarkRead`
- Electron API: `app.getPath('userData')`
- Behavior: Per-user, backed up with Time Machine
- Recommendation: Cache directory should be excluded from Time Machine (via extended attributes)

#### Linux
- Path: `~/.config/MarkRead`
- Electron API: `app.getPath('userData')`
- Behavior: Per-user, respects XDG Base Directory spec
- Recommendation: Standard location, no special considerations

#### Implementation
```typescript
import { app } from 'electron';
import path from 'path';

const getCacheDir = (): string => {
  const userData = app.getPath('userData');
  const cacheDir = path.join(userData, 'git-cache');
  return cacheDir;
};
```

---

## Comparative Analysis

| Aspect | Flat Files | SQLite Index | JSON Index |
|--------|-----------|-------------|-----------|
| **Lookup Speed** | O(n) traversal | O(1) indexed | O(n) in memory |
| **LRU Implementation** | Manual tracking | Native query | Manual tracking |
| **Concurrency** | Manual locking needed | Built-in | Process lock needed |
| **Size Calculation** | Full scan required | Query result | Scan JSON |
| **Offline Access** | Direct file access | Via index | Via index |
| **Dependencies** | None | better-sqlite3 | None |
| **Corruption Risk** | Moderate | Low (ACID) | Moderate (JSON) |
| **Startup Performance** | Fast (lazy load) | Moderate (DB open) | Moderate (parse JSON) |
| **Memory Footprint** | Low | Low-Moderate | Moderate-High |

---

## Recommended Architecture: Hybrid Approach

### Decision: SQLite Index + Flat Files

**Rationale:**
1. SQLite provides atomic transactions and ACID guarantees preventing cache corruption
2. Native indexed queries enable O(1) lookup by (repo_url, branch, file_path)
3. Built-in locking handles concurrent access safely without manual mutex code
4. Efficient LRU implementation via indexed timestamp queries

### Structure

```
~/AppData/MarkRead/
├── git-cache/
│   ├── cache.db                 (SQLite index with metadata)
│   └── repos/
│       ├── [repo-normalized-id]/
│       │   ├── [branch]/
│       │   │   ├── [file-path-hash].content
│       │   │   ├── [file-path-hash].meta.json
│       │   │   └── assets/
│       │   │       ├── [asset-hash].bin
│       │   │       └── [asset-hash].meta.json
│       │   └── ...
│       └── ...
└── config/                      (separate from cache)
    └── credentials.db           (for auth tokens, if applicable)
```

### Database Schema

```sql
-- Cache index table
CREATE TABLE cache_entries (
  id TEXT PRIMARY KEY,
  repo_url TEXT NOT NULL,
  branch TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_content_hash TEXT,
  size_bytes INTEGER NOT NULL,
  fetch_timestamp INTEGER NOT NULL,
  access_timestamp INTEGER NOT NULL,
  content_type TEXT DEFAULT 'text/markdown',
  is_asset BOOLEAN DEFAULT 0,
  etag TEXT,  -- for conditional requests
  UNIQUE(repo_url, branch, file_path)
);

CREATE TABLE repo_cache_stats (
  repo_url TEXT PRIMARY KEY,
  total_size_bytes INTEGER DEFAULT 0,
  file_count INTEGER DEFAULT 0,
  last_full_sync INTEGER,
  last_accessed INTEGER
);

CREATE TABLE cache_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER
);

-- Indexes for performance
CREATE INDEX idx_access_timestamp ON cache_entries(access_timestamp);
CREATE INDEX idx_repo_url ON cache_entries(repo_url);
CREATE INDEX idx_repo_branch ON cache_entries(repo_url, branch);
CREATE INDEX idx_lookup ON cache_entries(repo_url, branch, file_path);
CREATE INDEX idx_size_desc ON cache_entries(size_bytes DESC);
```

### Eviction Strategy: Dual-Tier with Size Awareness

**Tier 1: Per-Repository Eviction (100MB limit)**
```typescript
async evictRepositoryIfNeeded(repoUrl: string): Promise<void> {
  const stats = await this.getRepoStats(repoUrl);

  if (stats.totalSize > 100 * 1024 * 1024) {
    const excess = stats.totalSize - (100 * 1024 * 1024 * 0.9); // 90% threshold
    await this.evictLRU(repoUrl, excess);
  }
}

private async evictLRU(repoUrl: string, bytesToFree: number): Promise<void> {
  const entriesToDelete = db.prepare(`
    SELECT id, size_bytes, file_path FROM cache_entries
    WHERE repo_url = ?
    ORDER BY access_timestamp ASC
    LIMIT ?
  `).all(repoUrl, 1000);  // Batch limit

  let freedBytes = 0;
  for (const entry of entriesToDelete) {
    if (freedBytes >= bytesToFree) break;

    await this.deleteEntry(entry.id);
    freedBytes += entry.size_bytes;
  }

  // Update repo stats
  await this.updateRepoStats(repoUrl);
}
```

**Tier 2: Global Eviction (5GB limit)**
```typescript
async evictGlobalIfNeeded(): Promise<void> {
  const totalSize = await this.getTotalCacheSize();
  const limit = 5 * 1024 * 1024 * 1024;  // 5GB

  if (totalSize > limit) {
    const excess = totalSize - (limit * 0.9);  // 90% threshold
    await this.evictGlobalLRU(excess);
  }
}
```

### Concurrent Access Locking

```typescript
// File-level locks for writes
private fileLocks = new Map<string, Promise<void>>();

async writeFileToCache(
  repoUrl: string,
  branch: string,
  filePath: string,
  content: Buffer
): Promise<void> {
  const lockKey = `${repoUrl}:${branch}:${filePath}`;

  await this.withLock(lockKey, async () => {
    // SQLite transaction for index update
    const entryId = this.hashPath(repoUrl, branch, filePath);
    const fileLocation = this.getFileLocation(entryId);

    // Write file
    await fs.promises.mkdir(path.dirname(fileLocation), { recursive: true });
    await fs.promises.writeFile(fileLocation, content);

    // Update database (atomic)
    const now = Date.now();
    db.prepare(`
      INSERT INTO cache_entries
      (id, repo_url, branch, file_path, size_bytes, fetch_timestamp, access_timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(repo_url, branch, file_path) DO UPDATE SET
        size_bytes = excluded.size_bytes,
        fetch_timestamp = excluded.fetch_timestamp,
        access_timestamp = excluded.access_timestamp
    `).run(entryId, repoUrl, branch, filePath, content.length, now, now);

    // Check eviction after successful write
    await this.evictRepositoryIfNeeded(repoUrl);
  });
}

private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const current = this.fileLocks.get(key) ?? Promise.resolve();
  const next = current.then(fn);
  this.fileLocks.set(key, next);

  try {
    return await next;
  } finally {
    if (this.fileLocks.get(key) === next) {
      this.fileLocks.delete(key);
    }
  }
}
```

### Fast Lookup Implementation

```typescript
async getFileFromCache(
  repoUrl: string,
  branch: string,
  filePath: string
): Promise<CacheEntry | null> {
  const normalizedUrl = normalizeRepoUrl(repoUrl);

  // Single indexed query - O(1) lookup
  const entry = db.prepare(`
    SELECT id, file_content_hash, size_bytes, fetch_timestamp, access_timestamp
    FROM cache_entries
    WHERE repo_url = ? AND branch = ? AND file_path = ?
    LIMIT 1
  `).get(normalizedUrl, branch, filePath);

  if (!entry) return null;

  // Update access timestamp in background (non-blocking)
  this.updateAccessTimestamp(entry.id).catch(err => {
    console.error('Failed to update access timestamp:', err);
  });

  // Read file synchronously for immediate return (small files)
  const fileLocation = this.getFileLocation(entry.id);
  const content = await fs.promises.readFile(fileLocation);

  return {
    ...entry,
    content
  };
}
```

---

## Implementation Checklist

### Phase 1: Database Setup
- [ ] Define SQLite schema with migrations
- [ ] Create database initialization function
- [ ] Implement schema migration system (for future upgrades)
- [ ] Add database connection pooling (if using multiple connections)

### Phase 2: Core Cache Operations
- [ ] Implement file write with locking
- [ ] Implement file read with access timestamp update
- [ ] Implement metadata storage and retrieval
- [ ] Add size calculation functions

### Phase 3: Eviction System
- [ ] Per-repository eviction on fetch
- [ ] Global eviction (scheduled or on-demand)
- [ ] Eviction metrics (freed bytes, entries deleted)
- [ ] Eviction event logging

### Phase 4: Offline Support
- [ ] List cached entries for offline access
- [ ] Validate cache integrity on startup
- [ ] Handle corrupted cache entries gracefully

### Phase 5: Testing & Performance
- [ ] Unit tests for cache operations
- [ ] Concurrent access stress tests
- [ ] Performance benchmarks (lookup, write, eviction)
- [ ] Large repository stress tests (10k+ files)

---

## Alternative Considered: Simple Flat Files with In-Memory Index

**Why Rejected:**
- Startup time: Loading 50k+ file entries into memory defeats "fast startup" goal
- Concurrent writes: No built-in locking, requires external dependency (file locking library)
- Consistency: JSON serialization failure could corrupt entire index
- Querying: Complex eviction logic would require scanning all files repeatedly

---

## Migration & Upgrade Path

The SQLite approach allows for zero-downtime upgrades:

```typescript
// Migration system
const migrations = [
  {
    version: 1,
    up: () => {
      db.exec(`CREATE TABLE cache_entries (...)`);
    },
    down: () => {
      db.exec(`DROP TABLE cache_entries`);
    }
  },
  {
    version: 2,
    up: () => {
      db.exec(`ADD COLUMN etag TEXT`);
    }
  }
];
```

---

## Performance Expectations

With this architecture:
- **Lookup**: < 10ms (indexed SQLite query)
- **Write**: < 100ms (file write + DB insert)
- **Cache Hit Load**: < 1 second (disk read + file load)
- **Eviction**: < 500ms for typical batch (50-100 entries)
- **Startup**: < 500ms (DB open, stats query)

---

## References & Dependencies

### Required npm packages
```json
{
  "better-sqlite3": "^9.0.0",  // SQLite with sync API (Electron-safe)
  "node-cache": "^5.1.2"       // Optional: in-memory LRU for hot files
}
```

### Electron APIs Used
- `app.getPath('userData')` - Storage location
- `app.getPath('appData')` - Alternative location
- No IPC needed (cache operations in main process)

---

## Conclusion

The **SQLite Index + Flat Files** approach balances performance, reliability, and maintainability. It provides:
1. Fast O(1) lookups by repository URL + branch + file path
2. Atomic LRU eviction preventing corruption
3. Built-in concurrency safety
4. Scalable to 5GB+ cache
5. Platform-independent implementation
6. Minimal external dependencies

This recommendation aligns with MarkRead's technical context (TypeScript + Node.js + Electron) and meets all performance targets from the feature specification.
