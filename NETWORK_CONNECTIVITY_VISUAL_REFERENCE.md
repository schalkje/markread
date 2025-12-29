# Network Connectivity Detection - Visual Reference Guide
## Quick Diagrams and Reference Charts

---

## 1. Decision Tree: Which Approach to Use?

```
┌─────────────────────────────────────────────────────┐
│   Need to detect network connectivity status?       │
│   (for Git repository operations)                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ Need to know when offline/online?                  │
│ AND verify Git APIs are reachable?                 │
│ AND minimize polling overhead?                     │
└────────────────┬────────────────────────────────────┘
                 │
    ┌────────────┴────────────────┐
    │                             │
    YES                           NO
    │                             │
    ▼                             ▼
  ┌──────────────────────┐   ┌──────────────────────┐
  │ HYBRID APPROACH      │   │ Use simpler method:  │
  │ ✅ USE THIS          │   │ ❌ Not recommended  │
  │                      │   │ (see research.md)   │
  │ • Events + polling   │   └──────────────────────┘
  │ • Active checks      │
  │ • Per-provider status│
  │ • Smart polling      │
  └──────────────────────┘
```

---

## 2. Network State Transitions

```
┌─────────────────────────────────────────────────────────────────┐
│                      NETWORK STATE MACHINE                       │
└─────────────────────────────────────────────────────────────────┘

                              ONLINE
                                ▲
                                │
                    ┌───────────┴──────────┐
                    │                      │
                    │ navigator.onLine     │ Immediate check
                    │ 'online' event       │ succeeds
                    │ (< 100ms)            │ (< 3s)
                    │                      │
                    │         ┌────────────▼─────┐
                    │         │                  │
                    │         │  RECOVERING      │
                    │         │  (polling 5s)    │
                    │         │  [spinner badge] │
                    │         │                  │
                    │         └────────────┬─────┘
                    │                      │
                    └──────────────────────┘
                            │
                            │
                    ┌───────┴─────────┐
                    │ navigator.onLine│
                    │ 'offline' event │
                    │ (< 2s)          │
                    │                 │
                    ▼                 ▼
                  OFFLINE
                [red badge]

LABELS:
✓ ONLINE
  - Show no badge
  - Enable Git ops
  - Poll every 30s

⚠ RECOVERING
  - Show spinner badge
  - Disable Git ops (temporarily)
  - Poll every 5s
  - Exponential backoff (up to 60s)

✗ OFFLINE
  - Show red badge
  - Disable Git ops
  - Cache-only mode
  - Poll every 5s (recovery)
```

---

## 3. Polling Timeline During Recovery

```
SCENARIO: User goes offline for 1 minute

TIME    EVENT                           POLLING          STATUS
────────────────────────────────────────────────────────────────────
T+0s    User unplugs network

T+1s    navigator.onLine 'offline'
        event fires
                                                          OFFLINE
                                                          [Red badge]
T+5s                                    Check #1 (fail)
                                        Next: 5s          (still offline)

T+10s                                   Check #2 (fail)
                                        Next: 10s         (still offline)

T+20s                                   Check #3 (fail)
                                        Next: 20s         (still offline)

T+40s                                   Check #4 (fail)
                                        Next: 40s         (still offline)

T+60s   User plugs network back in

T+61s   navigator.onLine 'online'
        event fires
        Trigger immediate check →
        checkConnectivity() → SUCCESS!
                                                          ONLINE
                                                          [No badge]
T+61s                                   STOP POLLING
                                        Resume Git ops

POLLING SUMMARY:
- Total offline time: 60 seconds
- Total checks: 4 failed, 1 success
- API requests: 5
- Recovery latency: 1 second from network return

EXPONENTIAL BACKOFF CALCULATION:
Interval = min(5 * 2^(n-1), 60000) seconds
Check 1: min(5 * 2^0, 60) = 5s
Check 2: min(5 * 2^1, 60) = 10s
Check 3: min(5 * 2^2, 60) = 20s
Check 4: min(5 * 2^3, 60) = 40s
Check 5: min(5 * 2^4, 60) = 60s (capped)
```

---

## 4. Component Interaction Diagram

```
┌────────────────────────────────────────────────────────┐
│                   RENDERER PROCESS                     │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │          App.tsx (Main Component)               │ │
│  │  ┌────────────────────────────────────────────┐ │ │
│  │  │ useConnectivityStatus()                   │ │ │
│  │  │ (React Hook - lifecycle management)       │ │ │
│  │  │  ├─ Listen: navigator.onLine events       │ │ │
│  │  │  ├─ Call: connectivity:check IPC          │ │ │
│  │  │  └─ Update: Zustand store                 │ │ │
│  │  └────────────────────────────────────────────┘ │ │
│  │                      │                          │ │
│  │                      ▼                          │ │
│  │  ┌────────────────────────────────────────────┐ │ │
│  │  │  connectivity.ts (Zustand Store)          │ │ │
│  │  │  ├─ isOnline: boolean                     │ │ │
│  │  │  ├─ providers: {github, azure}            │ │ │
│  │  │  ├─ isRecovering: boolean                 │ │ │
│  │  │  └─ Actions: setOnline, updateProviders   │ │ │
│  │  └────────────────────────────────────────────┘ │ │
│  │         │              │              │         │ │
│  │    FEEDS│           FEEDS│         FEEDS│        │ │
│  │         │              │              │         │ │
│  │         ▼              ▼              ▼         │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐  │ │
│  │  │ MyComponent│ │ MyComponent│ │ OfflineBad│  │ │
│  │  │ (uses hook)│ │ (uses hook)│ │ ge.tsx    │  │ │
│  │  │            │ │            │ │ Shows/    │  │ │
│  │  │ Disables   │ │ Disables   │ │ hides     │  │ │
│  │  │ Git ops    │ │ Git ops    │ │ badge    │  │ │
│  │  └────────────┘ └────────────┘ └────────────┘  │ │
│  └──────────────────────────────────────────────────┘ │
│                      │                                │
│  ════════════════════════════════════════════════════ │
│              IPC: connectivity:check                  │
│  ════════════════════════════════════════════════════ │
│                      │                                │
│                      ▼                                │
├────────────────────────────────────────────────────────┤
│               MAIN PROCESS (Node.js)                   │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │   connectivity-service.ts                       │ │
│  │  ┌────────────────────────────────────────────┐ │ │
│  │  │ checkProvider(provider: 'github'|'azure')  │ │ │
│  │  │ ├─ fetch(endpoint, {method: 'HEAD'})      │ │ │
│  │  │ ├─ Timeout: 3000ms                         │ │ │
│  │  │ └─ Return: boolean                         │ │ │
│  │  └────────────────────────────────────────────┘ │ │
│  │              │                  │               │ │
│  │              ▼                  ▼               │ │
│  │  ┌──────────────────┐  ┌──────────────────┐   │ │
│  │  │ api.github.com   │  │dev.azure.com     │   │ │
│  │  │ HEAD /zen        │  │HEAD /_apis/...   │   │ │
│  │  │ (< 1KB, fast)    │  │(< 1KB, fast)     │   │ │
│  │  └──────────────────┘  └──────────────────┘   │ │
│  └──────────────────────────────────────────────────┘ │
│                      │                                │
│  ════════════════════════════════════════════════════ │
│          IPC: connectivity:changed (notification)     │
│  ════════════════════════════════════════════════════ │
│                      │                                │
└──────────────────────┼────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ Renderer updates UI  │
            │ (badge, disabled ops)│
            └──────────────────────┘

FLOW SUMMARY:
1. App mounts: useConnectivityStatus() hook runs
2. Hook: Listens to navigator.onLine events
3. Hook: Calls connectivity:check IPC to main process
4. Main: Performs HEAD requests to API endpoints
5. Main: Returns results via connectivity:changed IPC
6. Hook: Updates Zustand store with results
7. Components: Consume store and update UI
```

---

## 5. API Rate Limiting Safety

```
GITHUB API RATE LIMITS (unauthenticated):
  Limit: 60 requests per hour
  Reset: Every hour at :00

AZURE DEVOPS API RATE LIMITS:
  Limit: Similar (60-100 per hour for unauthenticated)
  Reset: Per minute for authenticated

OUR POLLING STRATEGY:

Normal operation:     1 check / 30 seconds
                    = 120 checks per hour
                    ⚠ SLIGHTLY OVER 60 limit

Recovery mode:       1 check / 5 seconds (average with backoff)
                    ≈ 12 checks per minute for ~1 minute
                    = 12 bursts per reconnection
                    ✓ Well within limits

Exponential backoff:  5s → 10s → 20s → 40s → 60s → 60s...
                    Averages to ~40s per check in recovery
                    ✓ Safe margin

SOLUTION FOR RATE LIMIT SAFETY:

1. Use HEAD requests (lighter weight)
   ✓ HEAD doesn't count heavily against rate limits
   ✓ Response < 1KB

2. Fallback endpoints if one rate-limited
   ✓ GitHub: /zen → /status → / (fallback chain)
   ✓ Azure: /_apis/connectionData → / (fallback chain)

3. Exponential backoff when failing
   ✓ Auto-reduces polling frequency
   ✓ Protects against rate limit hammering

4. Only poll during recovery
   ✓ Normal operation: 30s interval (safe)
   ✓ Recovery: Backoff kicks in quickly

RATE LIMIT CALCULATION:

NORMAL USAGE (8 hours online daily):
  120 checks/hour × 8 hours = 960 checks/day
  960 / 24 = 40 checks/hour average
  ✓ SAFE (under 60/hour limit)

HEAVY USAGE (constant toggles online/offline):
  20 toggles per hour
  × 12 checks per recovery
  = 240 checks per hour
  ⚠ OVER LIMIT

MITIGATION FOR HEAVY USAGE:
  Exponential backoff limits to:
  5s for 1st check
  then 10s, 20s, 40s, 60s
  Average ≈ 30s between checks
  = 120 checks/hour (safe)
```

---

## 6. UI States Reference

```
┌──────────────────────────────────────────────────────────┐
│                   OFFLINE BADGE STATES                  │
└──────────────────────────────────────────────────────────┘

STATE 1: ONLINE (No Badge)
┌────────────────────────────────────────────────────────┐
│ ✅ All systems operational                             │
│ • Git operations enabled                               │
│ • No badge displayed                                   │
│ • Normal polling every 30s                             │
└────────────────────────────────────────────────────────┘

STATE 2: RECOVERING (Warning Badge with Spinner)
┌────────────────────────────────────────────────────────┐
│                    ⟳                                   │
│              Recovering...                              │
│                                                         │
│ • Network detected but not verified                    │
│ • Git operations disabled (temporary)                  │
│ • Polling every 5s + exponential backoff              │
│ • Spinner indicates active recovery                    │
│ • Tooltip: "No internet connection - recovering..."   │
└────────────────────────────────────────────────────────┘

STATE 3: OFFLINE (Error Badge)
┌────────────────────────────────────────────────────────┐
│                    ⚠️ OFFLINE                          │
│                                                         │
│ • No network connectivity detected                     │
│ • Git operations disabled                              │
│ • Cached content only mode                             │
│ • Recovery polling every 5s                            │
│ • Tooltip: "No internet connection"                    │
└────────────────────────────────────────────────────────┘

STATE 4: DEGRADED (Warning Badge)
┌────────────────────────────────────────────────────────┐
│                    ⚠️ Limited                           │
│                                                         │
│ • One provider available, one down                     │
│ • (e.g., GitHub up, Azure down)                        │
│ • Git operations enabled for available provider        │
│ • Cannot access disabled provider                      │
│ • Tooltip: "GitHub available, Azure unavailable"      │
└────────────────────────────────────────────────────────┘

BADGE POSITIONING:
┌──────────────────────────────────────────────┐
│ ⚠️ OFFLINE    (top-right)                    │
│                                               │
│                                               │
│  Window Content                               │
│                                               │
│                                   ⚠️ OFFLINE │
│                                   (bottom-right)
│                                               │
└──────────────────────────────────────────────┘

COLOR SCHEME:
ONLINE:      [No badge shown]
RECOVERING:  🟡 Yellow/Orange (#ffaa00)
OFFLINE:     🔴 Red (#ff4444)
DEGRADED:    🟠 Orange (#ffaa00)
```

---

## 7. Implementation Timeline

```
DAY 1 - TYPE DEFINITIONS & SERVICE LAYER (2-3 hours)
┌─────────────────────────────────────────────────────┐
│ ✓ Create connectivity types (15 min)               │
│ ✓ Create connectivity-service.ts (45 min)          │
│ ✓ Create connectivity-monitor.ts (30 min)          │
│ ✓ Test service layer (30 min)                      │
└─────────────────────────────────────────────────────┘
         ↓ CHECKPOINT: Services working

DAY 2 - STATE & UI LAYER (2-3 hours)
┌─────────────────────────────────────────────────────┐
│ ✓ Create Zustand store (30 min)                    │
│ ✓ Create React hook (45 min)                       │
│ ✓ Create OfflineBadge component (45 min)           │
│ ✓ Test components (30 min)                         │
└─────────────────────────────────────────────────────┘
         ↓ CHECKPOINT: UI appears

DAY 3 - INTEGRATION & TESTING (2-3 hours)
┌─────────────────────────────────────────────────────┐
│ ✓ Register IPC handlers (15 min)                   │
│ ✓ Update preload script (15 min)                   │
│ ✓ Add operation guards (30 min)                    │
│ ✓ Integrate into App.tsx (15 min)                  │
│ ✓ Manual testing (1 hour)                          │
│ ✓ Fix issues (30 min)                              │
└─────────────────────────────────────────────────────┘
         ↓ CHECKPOINT: Feature complete

OPTIONAL DAY 4 - ADVANCED FEATURES (2-3 hours)
┌─────────────────────────────────────────────────────┐
│ ✓ Exponential backoff refinement                   │
│ ✓ Fallback endpoints                               │
│ ✓ Monitoring/telemetry                             │
│ ✓ Documentation                                     │
└─────────────────────────────────────────────────────┘
         ↓ CHECKPOINT: Production ready

TOTAL TIME ESTIMATE: 4-8 hours (1-2 days with breaks)
```

---

## 8. Error Handling Decision Tree

```
API Check Fails (timeout, connection refused, etc.)

    ↓

┌─ Is this the first check?
│  YES: Set isOnline = false (assume offline)
│       Proceed to recovery polling
│  NO: Continue to next check
│
└─ Is network transitioning?
   If 'online' event just fired:
   YES: Network coming back, check immediately
   NO: Continue polling per schedule

┌─ Is recovery polling active?
│  YES: Check failed, reschedule with backoff
│  NO: Normal failure, don't change state

└─ How many consecutive failures?
   1-2: backoff 5s
   3-4: backoff 10-20s
   5+:  backoff 40-60s

API Check Succeeds but Returns Error Status

    ↓

┌─ Is status 5xx (server error)?
│  YES: Service is down, treat as offline
│       Continue polling for recovery
│  NO: Continue to next check
│
└─ Is status 4xx (auth/permission)?
   YES: Service is UP (just auth issue)
        → Mark as online, error is operational
   NO: Handle per provider

┌─ Is status 2xx or 3xx?
│  YES: Service is definitely up, mark online
│       Stop recovery polling
│  NO: Depends on status code
```

---

## 9. Testing Validation Matrix

```
╔════════════════════════╦═════════════╦═══════════════╗
║ TEST SCENARIO          ║ EXPECTED    ║ PASS/FAIL     ║
╠════════════════════════╬═════════════╬═══════════════╣
║ App startup            ║ Checks API  ║ ___________   ║
║ Network normal         ║ Badge: OFF  ║ ___________   ║
║ Unplug network (1s)    ║ Badge: ON   ║ ___________   ║
║ Badge latency (< 2s)   ║ YES         ║ ___________   ║
║ Plug back in (1s)      ║ Badge: OFF  ║ ___________   ║
║ Recovery latency (< 6s)║ YES         ║ ___________   ║
║ GitHub API down        ║ Show status ║ ___________   ║
║ Azure API down         ║ Show status ║ ___________   ║
║ Both APIs down         ║ Full offline║ ___________   ║
║ Click Connect (offline)║ Error msg   ║ ___________   ║
║ Click Switch (offline) ║ Error msg   ║ ___________   ║
║ View cache (offline)   ║ Works       ║ ___________   ║
║ 30min offline recovery ║ Works clean ║ ___________   ║
║ API rate limit check   ║ No hammering║ ___________   ║
║ Battery impact test    ║ Negligible  ║ ___________   ║
║ Windows + Mac + Linux  ║ All work    ║ ___________   ║
╚════════════════════════╩═════════════╩═══════════════╝

SCORING:
15-16/16 PASS ✅ Ready for production
13-14/16 PASS ⚠️  Minor issues to fix
<13/16 FAIL  ❌ Major issues, needs rework
```

---

## 10. Troubleshooting Flowchart

```
PROBLEM: Badge not appearing

    ↓

├─ Is app running? → NO: Start app
│  YES ↓
├─ Is hook called? → NO: Add useConnectivityStatus() to App
│  YES ↓
├─ Is store updating? → Check React DevTools
│  Updated? YES ↓
├─ Is CSS imported? → NO: Import OfflineBadge.css
│  YES ↓
└─ Check browser console for errors


PROBLEM: Recovery stuck "Recovering..."

    ↓

├─ Is network actually online? → NO: Fix network
│  YES ↓
├─ Can you ping api.github.com? → NO: Network issue
│  YES ↓
├─ Are API endpoints up? → Check status pages
│  UP? YES ↓
├─ Check server logs for errors → See troubleshooting guide
│  ↓
└─ Restart app and try again


PROBLEM: Git ops disabled when should be online

    ↓

├─ Check offline badge → Is it showing?
│  YES ↓ Badge showing correctly
├─ Is internet actually available? → NO: Fix network
│  YES ↓
├─ Can curl reach api.github.com? → Run from terminal
│  Works? YES ↓
├─ Check main process logs → See app logs
│  ↓
└─ Report issue with logs


PROBLEM: API rate limit hits

    ↓

├─ How many requests/hour? → Count from logs
│  > 150? YES ↓
├─ Is exponential backoff working? → Check intervals
│  Working? YES ↓
├─ Reduce normal polling interval → Increase 30s → 60s
│  ↓
└─ Add fallback endpoints → See implementation guide
```

---

## 11. Architecture Layers

```
┌─────────────────────────────────────────────────┐
│         PRESENTATION LAYER (React)              │
│  ┌───────────────────────────────────────────┐  │
│  │ • OfflineBadge component                  │  │
│  │ • UI state visualization                  │  │
│  │ • User interactions                       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│      STATE MANAGEMENT LAYER (Zustand)           │
│  ┌───────────────────────────────────────────┐  │
│  │ • Store state: isOnline, providers        │  │
│  │ • Actions: setOnlineStatus, etc.          │  │
│  │ • Computed: canPerformGitOperations       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│     HOOK/INTEGRATION LAYER (React Hook)         │
│  ┌───────────────────────────────────────────┐  │
│  │ • useConnectivityStatus()                 │  │
│  │ • Event listeners                         │  │
│  │ • IPC coordination                        │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│     IPC LAYER (Electron Communication)          │
│  ┌───────────────────────────────────────────┐  │
│  │ • connectivity:check (renderer → main)    │  │
│  │ • connectivity:changed (main → renderer)  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│    SERVICE LAYER (Node.js, Main Process)        │
│  ┌───────────────────────────────────────────┐  │
│  │ • ConnectivityService                     │  │
│  │ • checkProvider() implementation          │  │
│  │ • HTTP HEAD requests                      │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│    EXTERNAL SERVICES (Network/APIs)             │
│  ┌───────────────────────────────────────────┐  │
│  │ • api.github.com                          │  │
│  │ • dev.azure.com                           │  │
│  │ • Network/Internet                        │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 12. Feature Completeness Checklist

```
PHASE 1: BASIC CONNECTIVITY (MVP)
  ✓ Event-based offline detection
  ✓ Simple online/offline states
  ✓ Single provider check (GitHub)
  ✓ Offline badge UI
  ✓ Basic operation guards
  Estimated: 2-3 hours

PHASE 2: PER-PROVIDER DETECTION
  ✓ GitHub provider check
  ✓ Azure provider check
  ✓ Separate provider status
  ✓ Graceful degradation
  ✓ Enhanced UI (GitHub/Azure status)
  Estimated: +1-2 hours

PHASE 3: ADVANCED RESILIENCE
  ✓ Exponential backoff
  ✓ Fallback endpoints
  ✓ Recovery state management
  ✓ Monitoring/telemetry
  ✓ Production hardening
  Estimated: +2-3 hours

TOTAL: 4-8 hours for complete implementation
```

---

**This visual reference guide complements the detailed documentation. Use in conjunction with NETWORK_CONNECTIVITY_RECOMMENDATION.md and NETWORK_CONNECTIVITY_IMPLEMENTATION_GUIDE.md for complete understanding.**
