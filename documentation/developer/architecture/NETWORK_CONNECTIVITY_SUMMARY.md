# Network Connectivity Detection - Executive Summary

---

## Decision

**HYBRID MULTI-LAYER APPROACH**

Combine event-based detection (navigator.onLine) with active API connectivity checks (HTTP HEAD requests) and adaptive polling to achieve reliable offline/online status detection for Git operations.

---

## Key Points

### ✅ The Problem We're Solving

1. **navigator.onLine is unreliable**: Returns true when connected to WiFi with no internet
2. **Need accurate Git provider status**: Must know if GitHub/Azure APIs are actually reachable
3. **Performance matters**: Don't want to poll constantly (battery drain, rate limits)
4. **Fast detection needed**: <2s for offline, <6s for online

### ✅ The Solution

1. **Use events for speed** (< 100ms): navigator.onLine 'online'/'offline' events
2. **Use active checks for accuracy** (< 3s): HTTP HEAD to api.github.com and dev.azure.com
3. **Smart polling only when needed**: 5s recovery polling, 30s normal polling
4. **Per-provider status tracking**: Know GitHub and Azure separately

### ✅ What Gets Disabled When Offline

- Connect to new repository
- Switch branches
- Refresh files from remote
- Force refresh operations
- All Git API calls

### ✅ What Still Works When Offline

- View cached file content
- Browse cached repository structure
- View recent repositories
- View local folders
- App continues to function

### ✅ Performance Targets (All Achievable)

| Metric | Target | Method |
|--------|--------|--------|
| Offline detection | < 2 seconds | navigator.onLine event |
| Online detection | < 6 seconds | Immediate check + 5s polling |
| Single API check | < 3 seconds | HEAD request with timeout |
| App startup | < 100ms | Concurrent checks |
| Normal polling overhead | ~120 checks/hour | 1 check per 30s |

---

## Why This Approach

### vs Pure navigator.onLine
- ❌ False positives (WiFi with no internet)
- ❌ Delayed recovery (5-30s delay)
- ❌ Platform inconsistencies
- ✅ Our approach: Adds active checks to verify actual API connectivity

### vs Continuous Polling
- ❌ Battery drain
- ❌ Rate limit issues (720 checks/hour vs 60 limit)
- ❌ Slow disconnect detection
- ✅ Our approach: Only polls during recovery, 30s intervals otherwise

### vs DNS Lookup
- ❌ Only verifies domain name resolves
- ❌ Service can be down while DNS works
- ❌ Doesn't tell you if Git operations will succeed
- ✅ Our approach: HTTP HEAD request directly to Git APIs

### vs Third-party Libraries
- ❌ No robust library exists (electron-online just wraps navigator.onLine)
- ❌ Libraries add dependencies without solving the problem
- ✅ Our approach: Custom implementation tailored to MarkRead needs

---

## Implementation Overview

### Files to Create
- `src/main/services/connectivity/connectivity-service.ts` - Core connectivity checks
- `src/main/services/connectivity/connectivity-monitor.ts` - Event/polling management
- `src/renderer/stores/connectivity.ts` - Zustand state management
- `src/renderer/hooks/useConnectivityStatus.ts` - React hook
- `src/renderer/components/git/OfflineBadge.tsx` - UI indicator badge
- `src/shared/types/connectivity.ts` - Shared TypeScript types

### Files to Modify
- `src/main/ipc-handlers.ts` - Register connectivity:check handler
- `src/preload/index.ts` - Expose connectivity API to renderer
- `src/shared/types/ipc-contracts.d.ts` - Add type definitions
- `src/renderer/services/git-service.ts` - Add connectivity guards
- `src/renderer/App.tsx` - Add OfflineBadge component

### Lines of Code
- ~400 lines in service layer
- ~200 lines in stores/hooks
- ~150 lines in UI components
- ~100 lines in IPC/preload
- Total: ~1,000 lines of well-documented code

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                 RENDERER PROCESS (React)                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  App.tsx                                                │
│  ├─ useConnectivityStatus() [React Hook]               │
│  │  ├─ Listens to 'online'/'offline' events            │
│  │  ├─ Calls connectivity:check IPC                    │
│  │  └─ Updates Zustand store                           │
│  │                                                      │
│  ├─ connectivity.ts [Zustand Store]                    │
│  │  ├─ isOnline: boolean                               │
│  │  ├─ providers: { github, azure }                    │
│  │  └─ canPerformGitOperations: computed               │
│  │                                                      │
│  ├─ OfflineBadge.tsx [UI Component]                    │
│  │  ├─ Shows when offline                              │
│  │  ├─ Shows recovery status                           │
│  │  └─ Shows provider status (GitHub/Azure)            │
│  │                                                      │
│  └─ git-service.ts [Modified]                          │
│     ├─ Checks canPerformGitOperations before ops       │
│     └─ Throws error if offline                         │
│                                                          │
├─────────────────────┬──────────────────────────────────┤
│ IPC Channel: connectivity:check & connectivity:changed │
└─────────────────────┼──────────────────────────────────┘
                      │
┌─────────────────────┴──────────────────────────────────┐
│              MAIN PROCESS (Node.js)                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  connectivity-service.ts                                │
│  ├─ checkProvider('github')                             │
│  │  └─ fetch('https://api.github.com/zen', HEAD)       │
│  ├─ checkProvider('azure')                              │
│  │  └─ fetch('https://dev.azure.com/_apis/...', HEAD)  │
│  └─ checkAll() → { github: bool, azure: bool }         │
│                                                          │
│  connectivity-monitor.ts                                │
│  ├─ Listens to Electron online/offline events          │
│  ├─ Calls connectivityService on event                 │
│  ├─ Manages polling during recovery                    │
│  └─ Notifies renderer via IPC                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
                      │
                      └──→ GitHub API (api.github.com)
                      │
                      └──→ Azure DevOps API (dev.azure.com)
                      │
                      └──→ Internet/Network
```

---

## Polling Behavior Over Time

```
Timeline: User goes offline, then comes back online

T+0s:   User unplugs network
        ↓
T+1s:   navigator.onLine 'offline' event fires
        → isOnline = false
        → Show offline badge immediately
        → Start recovery polling (5s interval)
        ↓
T+5s:   First recovery poll runs
        → checkConnectivity() → fails (no network)
        → nextPoll = 5 * 2^0 = 5s (exponential backoff)
        ↓
T+10s:  Second recovery poll
        → Still offline
        → nextPoll = 5 * 2^1 = 10s
        ↓
T+20s:  Third recovery poll (20s later)
        → Still offline
        → nextPoll = 5 * 2^2 = 20s (capped at 60s max)
        ↓
T+40s:  User plugs network back in
        ↓
T+41s:  navigator.onLine 'online' event fires
        → Trigger immediate connectivity check
        → checkConnectivity() → succeeds!
        → isOnline = true
        → Hide offline badge
        → Stop recovery polling
        → Resume Git operations
```

---

## Code Examples

### For Developers Using This Feature

```typescript
// In any React component that uses Git features:
import { useConnectivityStatus } from '@hooks/useConnectivityStatus';

function MyGitComponent() {
  const { isOnline, canPerformGitOperations, githubAvailable } = useConnectivityStatus();

  if (!canPerformGitOperations) {
    return <OfflineMessage />;
  }

  return <GitOperations />;
}

// In Git service layer:
export async function connectToRepository(url: string) {
  const { canPerformGitOperations } = useConnectivityStore.getState();

  if (!canPerformGitOperations) {
    throw new Error('Cannot connect: offline');
  }

  // Proceed with connection
}
```

### Behind the Scenes

```typescript
// When user unplugs network:
window.dispatchEvent(new Event('offline'));
  → useConnectivityStatus hook catches it
  → setOnlineStatus(false)
  → store.isOnline = false
  → OfflineBadge appears
  → startRecoveryPolling()

// Recovery polling:
setInterval(async () => {
  const result = await checkProviderConnectivity('github');
  if (result.anyAvailable) {
    setOnlineStatus(true);
    stopRecoveryPolling();
  }
}, 5000);

// User plugs network back in:
window.dispatchEvent(new Event('online'));
  → useConnectivityStatus hook catches it
  → performConnectivityCheck()
  → HTTP HEAD to api.github.com → succeeds
  → setOnlineStatus(true)
  → OfflineBadge disappears
  → Git operations re-enabled
```

---

## Testing Scenarios

### Must Pass Before Ship

1. **Offline Detection**
   - Unplug network → Badge appears within 2s
   - Kill WiFi → Badge appears within 2s
   - Disable network adapter → Badge appears within 2s

2. **Recovery Detection**
   - Plug network back in → Badge disappears within 6s
   - WiFi reconnect → Badge disappears within 6s
   - Enable network adapter → Badge disappears within 6s

3. **Partial Connectivity** (requires network testing tools)
   - GitHub down, Azure up → Shows "Limited" badge
   - Azure down, GitHub up → Shows "Limited" badge
   - Both down → Shows "OFFLINE" badge

4. **Git Operation Guards**
   - Offline: Click "Connect Repository" → Error with offline message
   - Offline: Click "Switch Branch" → Error with offline message
   - Offline: View cached content → Works fine
   - Online: All operations work normally

5. **Recovery Robustness**
   - Offline for 30+ minutes → Recovers cleanly
   - Rapid offline/online toggles → Handles without errors
   - Multiple rapid checks → Doesn't hammer API rate limits
   - Network switch (WiFi → cellular) → Works transparently

---

## Monitoring & Telemetry

Optional additions for production:

```typescript
// Log connectivity events
logger.info('[Connectivity] Transitioned to offline', {
  timestamp: Date.now(),
  provider: 'github',
  reason: 'fetch_timeout',
});

logger.info('[Connectivity] Recovered to online', {
  timestamp: Date.now(),
  recoveryDuration: 45000, // 45 seconds
  providersAvailable: ['github', 'azure'],
});

// Track polling metrics
metrics.record('connectivity.poll_duration', checkDuration);
metrics.record('connectivity.poll_success_rate', successCount / totalCount);
metrics.record('connectivity.recovery_time', recoveryDuration);
```

---

## FAQ

**Q: Why not just use navigator.onLine?**
A: It's unreliable. Returns true when connected to WiFi with no internet. We need to verify Git APIs are actually reachable.

**Q: Why not poll constantly?**
A: Battery drain, API rate limits, and no performance benefit. Smart polling only during recovery balances responsiveness and efficiency.

**Q: What if GitHub API is down but Azure is up?**
A: We detect this and show "GitHub unavailable, Azure available". Git operations work with Azure.

**Q: Can users perform Git operations on 2G/3G?**
A: Yes, as long as the APIs are reachable. Head requests work on any connection. No minimum speed required.

**Q: What about VPN/Proxy?**
A: The solution is transparent to VPN/Proxy. If GitHub/Azure APIs are reachable through your network path, we'll detect it.

**Q: How much battery does this use?**
A: Minimal. Normal polling (30s intervals) uses ~0.1% battery per hour. Recovery polling (5s) only runs when offline, so no impact.

**Q: Does this affect app startup time?**
A: No. Connectivity checks are asynchronous and non-blocking. App starts immediately while checks happen in background.

**Q: Can I disable offline detection?**
A: Yes, set `pollInterval: Infinity` in config, but not recommended. Offline detection is important for UX.

---

## Success Metrics

After implementation, we should measure:

- Offline detection latency: < 2 seconds (90th percentile)
- Online recovery latency: < 6 seconds (90th percentile)
- False positive rate: < 1% (user reports offline when actually online)
- False negative rate: < 2% (user thinks online when actually offline)
- API rate limit hits: 0 (should not hit GitHub/Azure rate limits)
- User satisfaction: "Offline behavior is clear and expected"

---

## References & Further Reading

- **Electron Documentation**: https://www.electronjs.org/docs/latest/tutorial/online-offline-events
- **MDN - Navigator.onLine**: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
- **GitHub API Status**: https://www.githubstatus.com/
- **Azure DevOps API**: https://learn.microsoft.com/en-us/rest/api/azure/devops/
- **Electron Best Practices**: https://www.electronjs.org/docs/latest/tutorial/context-isolation

---

## Deliverables

1. ✅ **NETWORK_CONNECTIVITY_RESEARCH.md** - Complete research findings
2. ✅ **NETWORK_CONNECTIVITY_RECOMMENDATION.md** - Decision and rationale
3. ✅ **NETWORK_CONNECTIVITY_IMPLEMENTATION_GUIDE.md** - Ready-to-use code templates
4. ✅ **NETWORK_CONNECTIVITY_SUMMARY.md** - This document

---

## Next Action

**Ready to implement?**

Start with the implementation guide step-by-step:
1. Create type definitions (Step 1)
2. Create service layer (Steps 2-3)
3. Register IPC handlers (Step 4)
4. Create Zustand store (Step 5)
5. Create React hook (Step 6)
6. Create UI badge (Step 7)
7. Integrate with preload and App component (Steps 8-11)
8. Run tests: `npm test`
9. Manual testing: Unplug network and verify

Estimated implementation time: 2-3 hours for basic functionality, 4-6 hours with all advanced features.

**Phase-based delivery recommended**:
- Phase 1 (4h): Basic offline detection + UI badge + operation guards
- Phase 2 (2h): Per-provider detection + graceful degradation
- Phase 3 (2h): Advanced recovery patterns + monitoring

---

**Last Updated**: 2025-12-29
**For**: MarkRead Git Repository Integration Feature
**Status**: Research Complete, Ready for Implementation
