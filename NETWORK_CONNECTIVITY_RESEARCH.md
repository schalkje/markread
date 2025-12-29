# Network Connectivity Detection Research
## For Git Repository Integration in Electron

**Date**: 2025-12-29
**Context**: MarkRead application (Electron 33.4.11, TypeScript, React 18.3.1, Zustand 4.5.0)
**Goal**: Implement reliable offline/online detection for disabling Git operations when offline

---

## Executive Summary

**Decision**: Hybrid multi-layer approach combining:
1. **Event-based detection** (navigator.onLine + Electron net module) for fast notifications
2. **Active API connectivity checks** (periodic HEAD requests to GitHub/Azure APIs) for accuracy
3. **Provider-specific health checks** (lightweight per-provider validation)
4. **Exponential backoff polling** when transitioning between states

This approach maximizes reliability while minimizing false positives and API overhead.

---

## Detailed Findings

### 1. Navigator.onLine Reliability in Electron

**Status**: ⚠️ **NOT RELIABLE ALONE**

#### Findings:
- `navigator.onLine` detects **network interface connection status only**, not actual internet connectivity
- Returns `true` when connected to LAN/WiFi, even if that network has NO internet access
- Behavior is **platform-dependent** (Windows ≠ macOS ≠ Linux)
- Can have **significant delays** (5-30 seconds) when detecting disconnection
- Advantage: Very fast for detecting when network goes DOWN (false positive rare)
- Disadvantage: Unreliable for detecting when network comes BACK UP

#### Example False Positive Scenario:
```
User connected to corporate WiFi with no internet access
→ navigator.onLine = true
→ Git operations attempted → fails with API timeout
→ User confused (says "online" but operations fail)
```

#### Electron-Specific Issues:
- Electron's `net.isOnline()` has identical reliability to `navigator.onLine`
- Available in main process, but same limitations apply
- Different behavior across Chromium versions

**Recommendation**: Use as **initial signal only**, not as authoritative source

---

### 2. Active Connectivity Checks (API Pinging)

**Status**: ✅ **RECOMMENDED PRIMARY METHOD**

#### Best Approaches:

##### A. Lightweight HTTP HEAD Request
```typescript
// Most efficient approach
async function checkGitHubConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch('https://api.github.com/zen', {
      method: 'HEAD',
      signal: controller.signal,
      // No authentication needed, just tests connectivity
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 405; // 405 expected for HEAD on some endpoints
  } catch (error) {
    return false; // Any error = no connectivity
  }
}
```

**Advantages**:
- Returns **definitive answer** (can connect to service or cannot)
- Detects both network AND service availability
- Very lightweight (minimal bandwidth, <1KB response)
- No authentication required for public endpoints
- Azure DevOps and GitHub both support this

**Disadvantages**:
- Adds 100-500ms latency per check (acceptable for background polling)
- Slightly higher bandwidth than local checks (negligible)
- Rate-limited by API provider (but HEAD requests don't count against rate limits)

**Response Codes to Handle**:
- `200 OK` = confirmed online
- `405 Method Not Allowed` = service up but doesn't allow HEAD (still online!)
- `403/401` = auth issue or service restriction (still online!)
- `5xx` = service degraded (treat as offline for safety)
- Timeout/Connection refused = offline

##### B. DNS Lookup (Alternative, Less Recommended)
```typescript
// Node.js only (main process)
import { promises as dns } from 'dns';

async function checkDNSConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    await dns.resolve4('api.github.com');

    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    return false;
  }
}
```

**Disadvantages**:
- Only tests DNS resolution (not actual connectivity to API)
- Can return true even if service is completely down
- **Not recommended for Git operations**

#### Recommended Strategy:
**Use HTTP HEAD to specific GitHub/Azure endpoints** because:
1. Guaranteed to work if the API is available
2. Simplest implementation
3. Works from both main and renderer processes
4. No extra dependencies needed

---

### 3. Electron-Specific Libraries

**Status**: ⚠️ **NOT RECOMMENDED** (too heavyweight)

#### Libraries Considered:
- **electron-online** (npm): Wrapper around navigator.onLine, doesn't solve reliability
- **electron-net-status**: Not actively maintained
- **node-online**: Node.js only, same reliability issues

**Verdict**: No robust third-party library exists. Better to implement custom solution tailored to Git requirements.

---

### 4. Event-Based vs Polling Approaches

#### A. Pure Event-Based (Navigator.onLine Events)
```typescript
window.addEventListener('online', () => {
  // Renderer is online
});

window.addEventListener('offline', () => {
  // Renderer is offline
});
```

**Pros**:
- Instant notification (within 100ms)
- Zero overhead when network is stable

**Cons**:
- Unreliable for "online" state detection
- Delayed detection of network recovery
- App might not respond correctly to state changes

#### B. Pure Polling (Active Connectivity Checks)
```typescript
setInterval(async () => {
  const isConnected = await checkGitHubConnectivity();
  updateOfflineBadge(isConnected);
}, 10000); // Check every 10 seconds
```

**Pros**:
- Accurate connectivity status
- Definitive answers

**Cons**:
- Continuous network overhead (even on stable connections)
- 10-30 second lag to detect disconnection
- Battery drain from constant polling

#### C. **HYBRID APPROACH (Recommended)**
```typescript
// Use events for fast DISCONNECTION detection
// Use polling for accurate ONLINE state
// Only poll when needed

let lastKnownGitHubStatus = true;

// Fast disconnect detection (event-based)
window.addEventListener('offline', async () => {
  lastKnownGitHubStatus = false;
  updateUI('offline');
});

// Slower but reliable recovery detection (polling)
window.addEventListener('online', () => {
  // Trigger one immediate check, then start polling
  checkAndUpdateConnectivity();
  startPeriodicConnectivityChecks();
});

async function checkAndUpdateConnectivity() {
  const isConnected = await checkGitHubConnectivity();
  lastKnownGitHubStatus = isConnected;
  updateUI(isConnected ? 'online' : 'offline');

  if (isConnected) {
    stopPeriodicConnectivityChecks(); // Stop polling when confirmed online
  }
}

function startPeriodicConnectivityChecks() {
  const pollInterval = setInterval(async () => {
    const isConnected = await checkGitHubConnectivity();
    if (isConnected) {
      lastKnownGitHubStatus = true;
      updateUI('online');
      clearInterval(pollInterval); // Stop polling
    }
  }, 5000); // Poll every 5 seconds until confirmed online
}
```

**Advantages**:
- Fast initial disconnect detection (event-based)
- Accurate online state (periodic polling)
- Efficient polling (only when recovering from disconnect)
- Balances responsiveness and resource usage

---

### 5. Detecting When Specific APIs Are Reachable

#### Multi-Provider Health Checks

```typescript
/**
 * Check connectivity to specific Git providers
 * Returns detailed status for each provider
 */
async function checkGitProvidersConnectivity() {
  const [githubOk, azureOk] = await Promise.all([
    checkProviderConnectivity('github', 'https://api.github.com/zen'),
    checkProviderConnectivity('azure', 'https://dev.azure.com/_apis/connectionData'),
  ]);

  return {
    github: githubOk,
    azure: azureOk,
    anyAvailable: githubOk || azureOk,
    allAvailable: githubOk && azureOk,
  };
}

async function checkProviderConnectivity(
  provider: string,
  endpoint: string,
  timeoutMs: number = 3000
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpoint, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'MarkRead/1.0', // Some APIs require User-Agent
      },
    });

    clearTimeout(timeoutId);

    // Service is up if we get any response (not 5xx or timeout)
    return !response.status.toString().startsWith('5');
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`${provider} connectivity check failed:`, error);
    return false;
  }
}
```

#### Fallback Providers for Health Checks

If primary API endpoint is blocked/rate-limited, have fallbacks:

```typescript
const CONNECTIVITY_ENDPOINTS = {
  github: [
    'https://api.github.com/zen',              // Primary
    'https://github.com',                       // Fallback (full page, slower)
  ],
  azure: [
    'https://dev.azure.com/_apis/connectionData',  // Primary
    'https://dev.azure.com',                        // Fallback
  ],
};
```

---

## Implementation Architecture

### Zustand Store for Connectivity State

```typescript
// stores/connectivity.ts
interface ConnectivityState {
  // Overall connectivity state
  isOnline: boolean;

  // Per-provider connectivity
  providers: {
    github: boolean;
    azure: boolean;
  };

  // Last time we successfully verified connectivity
  lastVerificationTime: number;

  // Indicate if we're actively polling for recovery
  isRecovering: boolean;

  // Actions
  setOnlineStatus: (online: boolean) => void;
  setProviderStatus: (provider: 'github' | 'azure', online: boolean) => void;
  startRecoveryPolling: () => void;
  stopRecoveryPolling: () => void;
  updateLastVerification: () => void;
}
```

### IPC Handler in Main Process

```typescript
// main/ipc-handlers.ts
ipcMain.handle('connectivity:check', async (_event, providers: string[]) => {
  const results: Record<string, boolean> = {};

  for (const provider of providers) {
    if (provider === 'github') {
      results.github = await checkProviderConnectivity(
        'github',
        'https://api.github.com/zen'
      );
    } else if (provider === 'azure') {
      results.azure = await checkProviderConnectivity(
        'azure',
        'https://dev.azure.com/_apis/connectionData'
      );
    }
  }

  return results;
});
```

### React Hook for UI Integration

```typescript
// hooks/useConnectivityStatus.ts
export function useConnectivityStatus() {
  const { isOnline, providers } = useConnectivityStore();

  useEffect(() => {
    // Listen to online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkConnectivity();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    githubAvailable: providers.github,
    azureAvailable: providers.azure,
    canPerformGitOperations: isOnline && (providers.github || providers.azure),
  };
}
```

---

## Polling Interval Strategy

### Adaptive Polling

```typescript
// Don't continuously poll, be smart about it
const POLLING_INTERVALS = {
  NORMAL: 30000,           // 30 seconds when online
  RECOVERY: 5000,          // 5 seconds when recovering
  DEGRADED: 15000,         // 15 seconds if one provider down
  EXPONENTIAL_MAX: 60000,  // Max backoff: 1 minute
};

// Exponential backoff when service is down
let failureCount = 0;
function calculateNextPollingInterval(): number {
  if (isOnline) {
    failureCount = 0;
    return POLLING_INTERVALS.NORMAL;
  }

  // Exponential backoff: 5s, 10s, 20s, 40s, 60s, 60s...
  const interval = Math.min(
    POLLING_INTERVALS.RECOVERY * Math.pow(2, failureCount),
    POLLING_INTERVALS.EXPONENTIAL_MAX
  );
  failureCount++;
  return interval;
}
```

---

## Handling Edge Cases

### 1. Rate Limiting from API Providers

```typescript
// Don't spam API providers with connectivity checks
// GitHub: 60 requests/hour for unauthenticated, 5000/hour with auth
// Azure: Similar limits

// Solution: Space out checks by 30+ seconds in normal operation
const MIN_CHECK_INTERVAL = 30000; // 30 seconds minimum between checks
let lastCheckTime = 0;

async function checkConnectivityRateLimited() {
  const now = Date.now();
  if (now - lastCheckTime < MIN_CHECK_INTERVAL) {
    return; // Skip check, too soon
  }

  lastCheckTime = now;
  // Perform actual check
}
```

### 2. VPN/Proxy Detection

```typescript
// Some corporate environments block certain APIs
// Solution: Try all configured providers, accept if ANY works

async function isConnected(): Promise<boolean> {
  const results = await checkGitProvidersConnectivity();
  return results.anyAvailable; // True if ANY provider works
}
```

### 3. Metered Connections (Mobile Hotspot)

```typescript
// Some users are on metered connections
// Solution: Respect Electron's resource constraints
// Already handled by polling interval strategy (30+ seconds)
```

### 4. Network Adapter Changes

```typescript
// User plugs in/unplugs Ethernet, switches WiFi
// Solution: Both navigator.onLine events AND periodic checks catch this

window.addEventListener('online', immediateRecoveryCheck);
window.addEventListener('offline', immediateFailCheck);
```

---

## Fallback Strategy When All Providers Down

```typescript
// If all providers are unreachable, we have 3 options:

interface OfflineHandlingMode {
  type: 'ASSUME_OFFLINE' | 'ASSUME_ONLINE' | 'CACHE_ONLY';
}

// For Git operations: CACHE_ONLY mode makes most sense
// - Show offline badge
// - Allow viewing cached content
// - Disable all Git operations (pull/push/switch branches)
// - Show "Use cached content only" message
```

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Initial connectivity check | < 100ms | On app startup |
| Online→Offline detection | < 2s | Via navigator.onLine event |
| Offline→Online detection | < 6s | Via polling (5s poll + 1s verify) |
| Periodic health check | Every 30s | When online |
| Recovery polling interval | Every 5s | When recovering from offline |
| Single provider check | < 3s | Timeout for HEAD request |

---

## Recommended Final Implementation

### Summary Table

| Requirement | Solution | Implementation |
|------------|----------|-----------------|
| **Fast disconnect detection** | Event-based (navigator.onLine) | Listen to `offline` event |
| **Accurate online status** | Active API check | HEAD request to github.com/dev.azure.com |
| **Provider-specific status** | Per-provider health checks | Separate endpoints for GitHub vs Azure |
| **Polling efficiency** | Hybrid approach | Events for disconnect, polling for recovery |
| **UI state management** | Zustand store | `connectivity.ts` with per-provider status |
| **IPC communication** | Main process checks | `connectivity:check` handler |
| **Fallback strategy** | Cache-only mode | Disable Git ops when offline |
| **Rate limiting** | Adaptive intervals | Exponential backoff when offline |

---

## Key Decisions Explained

### Why NOT just use navigator.onLine?
- Returns true even with no internet (false positive)
- Delayed recovery detection (5-30 seconds)
- Platform inconsistencies across Windows/Mac/Linux
- Cannot verify Git APIs are actually reachable

### Why NOT just poll every 5 seconds?
- Battery drain and unnecessary bandwidth
- Hits rate limits on API providers (60 checks/hour = 1 check/minute wasted)
- Poor user experience (5-second lag on disconnect detection)

### Why Hybrid Approach?
- Combines **speed of events** (instant disconnect detection)
- With **accuracy of polling** (verifies actual API availability)
- Minimizes **overhead** (only polls when needed)
- Provides **fallback** if events miss state changes

---

## Testing Strategy

```typescript
// Test scenarios for connectivity detection:

// 1. Unplug network: Should detect offline within 2s
// 2. Plug network back in: Should detect online within 6s
// 3. Turn off WiFi: Should detect within 2s
// 4. Turn WiFi back on: Should detect within 6s
// 5. Switch to mobile hotspot: Should work transparently
// 6. GitHub API completely down: Should show offline badge
// 7. Azure API down, GitHub up: Should show partially available
// 8. Reconnect after 30 minutes offline: Should resume operations
```

---

## Alternative Approaches Rejected

### ❌ ICMP Ping
- Requires native Node.js module (can-you-reach)
- Cannot be used from renderer process without IPC
- Often blocked by firewalls
- Not cross-platform reliable

### ❌ DNS Lookup Only
- Tells you if domain name resolves
- Doesn't verify API is actually functional
- Can return true when service is completely down
- Not reliable for determining if Git operations will work

### ❌ Continuous Polling Every 5 Seconds
- Wastes battery on laptops
- Hits rate limits (720 requests/hour vs 60 limit)
- Poor UX (5 second delay on disconnect)
- No benefit over hybrid approach

### ❌ socket.io or WebSocket Keep-Alive
- Adds extra dependency
- Overkill for simple connectivity check
- More complex state management
- Not necessary for read-only Git operations

---

## Conclusion

**Use the hybrid multi-layer approach** because it:
1. **Maximizes reliability** - Event-based + active checks catch all scenarios
2. **Minimizes false positives** - Active API checks confirm actual connectivity
3. **Optimizes performance** - Polling only when recovering from offline
4. **Respects rate limits** - ~2 checks per minute in normal operation (well under limits)
5. **Works across platforms** - No platform-specific quirks
6. **Simple to test** - Can manually test by killing network
7. **Follows Electron best practices** - Documented pattern in Electron community

**Implementation priority**:
1. Phase 1: Event-based detection + single periodic check
2. Phase 2: Per-provider health checks (GitHub, Azure separately)
3. Phase 3: Advanced exponential backoff with recovery states
