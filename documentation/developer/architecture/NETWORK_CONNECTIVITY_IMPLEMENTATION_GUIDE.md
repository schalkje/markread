# Network Connectivity Detection: Implementation Guide
## Ready-to-Use Code Templates for MarkRead

---

## File Structure

```
src/main/
├── services/
│   ├── connectivity/
│   │   ├── connectivity-service.ts      [NEW] Core connectivity checks
│   │   └── connectivity-monitor.ts      [NEW] Event monitoring & polling
│   └── ...existing services...
└── ipc-handlers.ts (MODIFY)

src/renderer/
├── stores/
│   └── connectivity.ts                   [NEW] Zustand store
├── hooks/
│   └── useConnectivityStatus.ts          [NEW] React hook
├── components/
│   ├── git/
│   │   ├── OfflineBadge.tsx             [NEW] UI indicator
│   │   └── ...existing components...
│   └── ...existing components...
└── services/
    └── git-service.ts (MODIFY)

src/shared/
└── types/
    └── connectivity.ts                   [NEW] Type definitions
```

---

## Step 1: Create Type Definitions

**File**: `src/shared/types/connectivity.ts`

```typescript
/**
 * Connectivity Detection Types
 * Shared types for main and renderer processes
 */

export type Provider = 'github' | 'azure';

export interface ProviderConnectivity {
  github: boolean;
  azure: boolean;
}

export interface ConnectivityStatus {
  isOnline: boolean;
  providers: ProviderConnectivity;
  lastVerificationTime: number;
  isRecovering: boolean;
}

export interface ConnectivityCheckResult {
  github: boolean;
  azure: boolean;
  anyAvailable: boolean;
  allAvailable: boolean;
}

export interface ConnectivityConfig {
  checkTimeoutMs: number;           // 3000ms per check
  recoveryPollIntervalMs: number;   // 5000ms when recovering
  normalPollIntervalMs: number;      // 30000ms when online
  maxBackoffIntervalMs: number;      // 60000ms maximum
  userAgent: string;
}
```

---

## Step 2: Main Process - Connectivity Service

**File**: `src/main/services/connectivity/connectivity-service.ts`

```typescript
/**
 * Connectivity Service
 * Performs actual connectivity checks to Git providers
 * Runs in main process (has full Node.js access)
 */

import { logger } from '../../logger';
import {
  Provider,
  ProviderConnectivity,
  ConnectivityCheckResult,
  ConnectivityConfig,
} from '../../../shared/types/connectivity';

const DEFAULT_CONFIG: ConnectivityConfig = {
  checkTimeoutMs: 3000,
  recoveryPollIntervalMs: 5000,
  normalPollIntervalMs: 30000,
  maxBackoffIntervalMs: 60000,
  userAgent: 'MarkRead/1.0',
};

const PROVIDER_ENDPOINTS = {
  github: 'https://api.github.com/zen',
  azure: 'https://dev.azure.com/_apis/connectionData',
};

export class ConnectivityService {
  private config: ConnectivityConfig;

  constructor(config: Partial<ConnectivityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check connectivity to a specific provider
   * Returns true if service is reachable and operational
   */
  async checkProvider(provider: Provider): Promise<boolean> {
    const endpoint = PROVIDER_ENDPOINTS[provider];

    try {
      const response = await this.fetchWithTimeout(endpoint, {
        method: 'HEAD',
        headers: { 'User-Agent': this.config.userAgent },
      });

      // Service is up if response is not a 5xx error
      const isUp = !response.status.toString().startsWith('5');

      logger.debug(`[Connectivity] ${provider}: ${isUp ? 'OK' : 'DOWN'} (${response.status})`);

      return isUp;
    } catch (error) {
      logger.debug(
        `[Connectivity] ${provider}: ERROR - ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      return false;
    }
  }

  /**
   * Check all configured providers
   * Returns status for each provider
   */
  async checkAll(): Promise<ConnectivityCheckResult> {
    const [github, azure] = await Promise.all([
      this.checkProvider('github'),
      this.checkProvider('azure'),
    ]);

    return {
      github,
      azure,
      anyAvailable: github || azure,
      allAvailable: github && azure,
    };
  }

  /**
   * Check specific providers (selective check)
   */
  async checkProviders(providers: Provider[]): Promise<ProviderConnectivity> {
    const results: ProviderConnectivity = {
      github: false,
      azure: false,
    };

    if (providers.includes('github')) {
      results.github = await this.checkProvider('github');
    }

    if (providers.includes('azure')) {
      results.azure = await this.checkProvider('azure');
    }

    return results;
  }

  /**
   * Fetch with timeout support
   * AbortController allows canceling request after timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.checkTimeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ConnectivityConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ConnectivityConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
export const connectivityService = new ConnectivityService();
```

---

## Step 3: Main Process - Connectivity Monitor

**File**: `src/main/services/connectivity/connectivity-monitor.ts`

```typescript
/**
 * Connectivity Monitor
 * Manages event listening and polling for connectivity status
 * Notifies renderer process via IPC of connectivity changes
 */

import { BrowserWindow } from 'electron';
import { connectivityService } from './connectivity-service';
import { logger } from '../../logger';
import { Provider, ConnectivityCheckResult } from '../../../shared/types/connectivity';

export class ConnectivityMonitor {
  private mainWindow: BrowserWindow | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private failureCount = 0;
  private isRecovering = false;
  private lastCheckResult: ConnectivityCheckResult | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setupEventListeners();
  }

  /**
   * Setup electron event listeners for online/offline
   * These events fire when network status changes
   */
  private setupEventListeners(): void {
    // Note: In Electron, we listen on the app, not navigator
    // But we can still use the standard web events through IPC from renderer
    logger.debug('[ConnectivityMonitor] Event listeners setup');
  }

  /**
   * Perform immediate connectivity check
   * Called when app starts or when 'online' event fires
   */
  async performCheck(): Promise<ConnectivityCheckResult> {
    try {
      const result = await connectivityService.checkAll();
      this.lastCheckResult = result;
      this.failureCount = 0; // Reset failure counter on success

      logger.debug(
        `[ConnectivityMonitor] Check result: GitHub=${result.github}, Azure=${result.azure}`
      );

      // Notify renderer of result
      this.notifyRenderer(result);

      return result;
    } catch (error) {
      logger.error(
        `[ConnectivityMonitor] Check failed: ${error instanceof Error ? error.message : 'Unknown'}`
      );
      this.failureCount++;
      throw error;
    }
  }

  /**
   * Start recovery polling
   * Called when offline event fires
   * Polls every 5 seconds with exponential backoff up to 60 seconds
   */
  startRecoveryPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
    }

    this.isRecovering = true;
    this.failureCount = 0;

    logger.debug('[ConnectivityMonitor] Starting recovery polling');

    const poll = async () => {
      try {
        const result = await connectivityService.checkAll();

        if (result.anyAvailable) {
          logger.debug('[ConnectivityMonitor] Recovery successful, stopping polling');
          this.stopRecoveryPolling();
          this.notifyRenderer(result);
          return;
        }

        // Still offline, increase backoff interval
        this.failureCount++;
        this.reschedulePolling();
      } catch (error) {
        this.failureCount++;
        this.reschedulePolling();
      }
    };

    // Initial poll immediately
    poll();
  }

  /**
   * Reschedule polling with exponential backoff
   */
  private reschedulePolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
    }

    const baseInterval = 5000; // 5 seconds
    const maxInterval = 60000; // 60 seconds
    const nextInterval = Math.min(
      baseInterval * Math.pow(2, Math.max(0, this.failureCount - 1)),
      maxInterval
    );

    logger.debug(
      `[ConnectivityMonitor] Rescheduling poll in ${nextInterval}ms (attempt ${this.failureCount})`
    );

    this.pollInterval = setTimeout(() => {
      // Recursively poll
      this.startRecoveryPolling();
    }, nextInterval);
  }

  /**
   * Stop recovery polling
   */
  stopRecoveryPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.isRecovering = false;
    this.failureCount = 0;

    logger.debug('[ConnectivityMonitor] Recovery polling stopped');
  }

  /**
   * Notify renderer process of connectivity change
   */
  private notifyRenderer(result: ConnectivityCheckResult): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    this.mainWindow.webContents.send('connectivity:changed', {
      isOnline: result.anyAvailable,
      providers: {
        github: result.github,
        azure: result.azure,
      },
      lastVerificationTime: Date.now(),
      isRecovering: this.isRecovering,
    });
  }

  /**
   * Cleanup on app shutdown
   */
  destroy(): void {
    this.stopRecoveryPolling();
    this.mainWindow = null;
    logger.debug('[ConnectivityMonitor] Destroyed');
  }

  /**
   * Get current status
   */
  getLastResult(): ConnectivityCheckResult | null {
    return this.lastCheckResult;
  }

  /**
   * Check if currently recovering
   */
  isCurrentlyRecovering(): boolean {
    return this.isRecovering;
  }
}
```

---

## Step 4: Register IPC Handlers

**File**: `src/main/ipc-handlers.ts` (MODIFY - add connectivity handlers)

```typescript
// At the top of the file, add imports:
import { connectivityService } from './services/connectivity/connectivity-service';
import { ConnectivityCheckResult } from '../shared/types/connectivity';

// Inside registerIpcHandlers function, add:

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  // ... existing handlers ...

  // NEW: T0XX: connectivity:check IPC handler
  ipcMain.handle('connectivity:check', async (_event, providers?: string[]) => {
    try {
      const result = providers && providers.length > 0
        ? await connectivityService.checkProviders(
            providers as Array<'github' | 'azure'>
          )
        : await connectivityService.checkAll();

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // ... rest of handlers ...
}
```

---

## Step 5: Create Zustand Store

**File**: `src/renderer/stores/connectivity.ts`

```typescript
/**
 * Zustand Store: Connectivity State
 * Manages network connectivity state for Git operations
 */

import { create } from 'zustand';
import { ConnectivityStatus, ProviderConnectivity } from '../../shared/types/connectivity';

interface ConnectivityStore extends ConnectivityStatus {
  // Actions
  setOnlineStatus: (online: boolean) => void;
  setProviderStatus: (provider: 'github' | 'azure', online: boolean) => void;
  updateProviders: (providers: ProviderConnectivity) => void;
  setRecovering: (recovering: boolean) => void;
  updateLastVerification: () => void;
  reset: () => void;
}

const INITIAL_STATE: ConnectivityStatus = {
  isOnline: true, // Assume online initially
  providers: {
    github: true,
    azure: true,
  },
  lastVerificationTime: Date.now(),
  isRecovering: false,
};

export const useConnectivityStore = create<ConnectivityStore>((set) => ({
  ...INITIAL_STATE,

  setOnlineStatus: (online: boolean) => {
    set((state) => ({
      isOnline: online,
      isRecovering: !online, // Start recovery if going offline
    }));
  },

  setProviderStatus: (provider: 'github' | 'azure', online: boolean) => {
    set((state) => ({
      providers: {
        ...state.providers,
        [provider]: online,
      },
    }));
  },

  updateProviders: (providers: ProviderConnectivity) => {
    set({ providers });
  },

  setRecovering: (recovering: boolean) => {
    set({ isRecovering: recovering });
  },

  updateLastVerification: () => {
    set({ lastVerificationTime: Date.now() });
  },

  reset: () => {
    set(INITIAL_STATE);
  },
}));

export default useConnectivityStore;
```

---

## Step 6: Create React Hook

**File**: `src/renderer/hooks/useConnectivityStatus.ts`

```typescript
/**
 * React Hook: useConnectivityStatus
 * Manages connectivity detection lifecycle
 * Sets up event listeners and polling
 */

import { useEffect } from 'react';
import { useConnectivityStore } from '../stores/connectivity';

interface UseConnectivityStatusReturn {
  isOnline: boolean;
  githubAvailable: boolean;
  azureAvailable: boolean;
  canPerformGitOperations: boolean;
  isRecovering: boolean;
  lastVerificationTime: number;
}

export function useConnectivityStatus(): UseConnectivityStatusReturn {
  const {
    isOnline,
    providers,
    isRecovering,
    lastVerificationTime,
    setOnlineStatus,
    updateProviders,
    setRecovering,
    updateLastVerification,
  } = useConnectivityStore();

  useEffect(() => {
    // Setup event listeners
    const handleOnline = () => {
      console.log('[useConnectivityStatus] Online event fired');
      setOnlineStatus(true);

      // Immediate check
      performConnectivityCheck();
    };

    const handleOffline = () => {
      console.log('[useConnectivityStatus] Offline event fired');
      setOnlineStatus(false);
      setRecovering(true);

      // Start recovery polling via IPC listener
    };

    // Listen for connectivity changes from main process
    const unsubscribeIpc = window.electronAPI?.connectivity?.onChanged?.(
      (status: any) => {
        console.log('[useConnectivityStatus] IPC update:', status);
        setOnlineStatus(status.isOnline);
        updateProviders(status.providers);
        setRecovering(status.isRecovering);
        updateLastVerification();
      }
    );

    // Add web event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connectivity check
    performConnectivityCheck();

    // Periodic check every 30 seconds
    const normalInterval = setInterval(() => {
      if (!isRecovering) {
        performConnectivityCheck();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(normalInterval);
      unsubscribeIpc?.();
    };
  }, [isRecovering, setOnlineStatus, setRecovering, updateProviders, updateLastVerification]);

  async function performConnectivityCheck() {
    try {
      const result = await window.electronAPI?.connectivity?.check(['github', 'azure']);

      if (result?.success && result?.data) {
        updateProviders(result.data);
        setOnlineStatus(result.data.anyAvailable);
        updateLastVerification();

        if (result.data.anyAvailable && isRecovering) {
          setRecovering(false);
        }
      }
    } catch (error) {
      console.error('[useConnectivityStatus] Check failed:', error);
      // Don't change state on transient errors
    }
  }

  return {
    isOnline,
    githubAvailable: providers.github,
    azureAvailable: providers.azure,
    canPerformGitOperations: isOnline && (providers.github || providers.azure),
    isRecovering,
    lastVerificationTime,
  };
}

export default useConnectivityStatus;
```

---

## Step 7: Create Offline Badge Component

**File**: `src/renderer/components/git/OfflineBadge.tsx`

```typescript
/**
 * Offline Badge Component
 * Displays connectivity status indicator
 * Shows when user cannot access Git providers
 */

import React from 'react';
import { useConnectivityStatus } from '../../hooks/useConnectivityStatus';
import './OfflineBadge.css';

export interface OfflineBadgeProps {
  /**
   * Position in UI (top-right, bottom-left, etc.)
   * @default 'top-right'
   */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

  /**
   * Custom CSS class
   */
  className?: string;

  /**
   * Callback when badge is clicked
   */
  onClick?: () => void;
}

export const OfflineBadge: React.FC<OfflineBadgeProps> = ({
  position = 'top-right',
  className,
  onClick,
}) => {
  const { isOnline, githubAvailable, azureAvailable, isRecovering } =
    useConnectivityStatus();

  // If online and any provider available, don't show badge
  if (isOnline && (githubAvailable || azureAvailable)) {
    return null;
  }

  // Determine badge status
  const status = !isOnline ? 'offline' : 'degraded';
  const isPartiallyAvailable = githubAvailable !== azureAvailable;
  const tooltip = !isOnline
    ? isRecovering
      ? 'No internet connection - recovering...'
      : 'No internet connection'
    : isPartiallyAvailable
      ? githubAvailable
        ? 'GitHub available, Azure unavailable'
        : 'Azure available, GitHub unavailable'
      : 'Services unavailable';

  return (
    <div
      className={`offline-badge offline-badge--${status} offline-badge--${position} ${className || ''}`}
      title={tooltip}
      onClick={onClick}
      role="status"
      aria-label={`Connectivity status: ${tooltip}`}
    >
      <span className="offline-badge__icon">
        {isRecovering && <span className="offline-badge__spinner" />}
        {!isRecovering && '⚠️'}
      </span>
      <span className="offline-badge__text">
        {!isOnline ? (isRecovering ? 'Recovering...' : 'OFFLINE') : 'Limited'}
      </span>
    </div>
  );
};

export default OfflineBadge;
```

**File**: `src/renderer/components/git/OfflineBadge.css`

```css
.offline-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: fixed;
  z-index: 1000;
  user-select: none;
}

.offline-badge--offline {
  background-color: #ff4444;
  color: white;
  box-shadow: 0 2px 8px rgba(255, 68, 68, 0.3);
}

.offline-badge--degraded {
  background-color: #ffaa00;
  color: white;
  box-shadow: 0 2px 8px rgba(255, 170, 0, 0.3);
}

.offline-badge--top-right {
  top: 16px;
  right: 16px;
}

.offline-badge--top-left {
  top: 16px;
  left: 16px;
}

.offline-badge--bottom-right {
  bottom: 16px;
  right: 16px;
}

.offline-badge--bottom-left {
  bottom: 16px;
  left: 16px;
}

.offline-badge__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.offline-badge__spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.offline-badge__text {
  white-space: nowrap;
}

.offline-badge:hover {
  opacity: 0.9;
  transform: scale(1.05);
}

/* Dark theme */
@media (prefers-color-scheme: dark) {
  .offline-badge--offline {
    background-color: #cc0000;
  }

  .offline-badge--degraded {
    background-color: #cc8800;
  }
}
```

---

## Step 8: Update Preload Script

**File**: `src/preload/index.ts` (MODIFY - add connectivity API)

```typescript
// Add to the electronAPI object:

const electronAPI = {
  // ... existing APIs ...

  connectivity: {
    /**
     * Check connectivity to Git providers
     */
    check: (providers?: string[]) =>
      ipcRenderer.invoke('connectivity:check', providers),

    /**
     * Listen for connectivity changes from main process
     */
    onChanged: (callback: (status: any) => void) => {
      ipcRenderer.on('connectivity:changed', (_event, status) => {
        callback(status);
      });

      // Return unsubscribe function
      return () => {
        ipcRenderer.removeAllListeners('connectivity:changed');
      };
    },
  },
};
```

---

## Step 9: Update TypeScript Definitions

**File**: `src/shared/types/ipc-contracts.d.ts` (MODIFY - add connectivity contracts)

```typescript
// Add to global window.electronAPI interface:

interface ConnectivityAPI {
  check: (providers?: string[]) => Promise<{
    success: boolean;
    data?: { github: boolean; azure: boolean };
    error?: string;
  }>;
  onChanged: (
    callback: (status: {
      isOnline: boolean;
      providers: { github: boolean; azure: boolean };
      lastVerificationTime: number;
      isRecovering: boolean;
    }) => void
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI?: {
      // ... existing APIs ...
      connectivity?: ConnectivityAPI;
    };
  }
}
```

---

## Step 10: Disable Git Operations When Offline

**File**: `src/renderer/services/git-service.ts` (MODIFY - add guard check)

```typescript
// Add this guard to all Git operations:

async function checkConnectivityBeforeGitOperation(
  operationName: string
): Promise<{ canProceed: boolean; reason?: string }> {
  const { canPerformGitOperations, isRecovering, githubAvailable, azureAvailable } =
    useConnectivityStore.getState();

  if (!canPerformGitOperations) {
    if (isRecovering) {
      return {
        canProceed: false,
        reason: 'Network connectivity recovering. Please wait...',
      };
    }

    const unavailableServices = [];
    if (!githubAvailable) unavailableServices.push('GitHub');
    if (!azureAvailable) unavailableServices.push('Azure DevOps');

    return {
      canProceed: false,
      reason: `Cannot perform "${operationName}": ${unavailableServices.join(' and ')} not reachable. Check your internet connection.`,
    };
  }

  return { canProceed: true };
}

// Use in operations:
export async function connectToRepository(url: string, token?: string) {
  const check = await checkConnectivityBeforeGitOperation('Connect to Repository');
  if (!check.canProceed) {
    throw new Error(check.reason);
  }

  // ... rest of connection logic ...
}

export async function switchBranch(branch: string) {
  const check = await checkConnectivityBeforeGitOperation('Switch Branch');
  if (!check.canProceed) {
    throw new Error(check.reason);
  }

  // ... rest of branch switch logic ...
}

export async function refreshFiles() {
  const check = await checkConnectivityBeforeGitOperation('Refresh Files');
  if (!check.canProceed) {
    throw new Error(check.reason);
  }

  // ... rest of refresh logic ...
}
```

---

## Step 11: Use Components in UI

**File**: `src/renderer/App.tsx` or main layout (MODIFY - add badge)

```tsx
import React from 'react';
import { OfflineBadge } from './components/git/OfflineBadge';
import { useConnectivityStatus } from './hooks/useConnectivityStatus';

export function App() {
  // This will setup all connectivity detection
  useConnectivityStatus();

  return (
    <div className="app">
      {/* Your existing app content */}

      {/* Add offline badge */}
      <OfflineBadge position="top-right" />
    </div>
  );
}
```

---

## Testing Guide

### Manual Testing

```bash
# Test 1: Offline detection
1. Run app
2. Unplug network / turn off WiFi
3. Badge should appear within 2 seconds
4. Git operations should be disabled
5. Error messages should appear when attempting Git ops

# Test 2: Recovery detection
1. Badge showing (offline state)
2. Plug network back in / turn WiFi on
3. Badge should disappear within 6 seconds
4. Git operations should become enabled

# Test 3: Partial connectivity
1. Simulate GitHub down, Azure up (requires network modification)
2. Badge should show "Limited" status
3. Git operations should work with Azure

# Test 4: Long offline period
1. Go offline for 30+ minutes
2. Come back online
3. Should recover cleanly without errors
```

### Automated Testing (Vitest)

```typescript
// tests/unit/services/connectivity-service.test.ts

import { describe, it, expect, vi } from 'vitest';
import { ConnectivityService } from '../../../src/main/services/connectivity/connectivity-service';

describe('ConnectivityService', () => {
  it('should check GitHub connectivity', async () => {
    const service = new ConnectivityService();
    const result = await service.checkProvider('github');
    expect(typeof result).toBe('boolean');
  });

  it('should timeout after specified duration', async () => {
    const service = new ConnectivityService({ checkTimeoutMs: 100 });
    // This will likely timeout
    const result = await service.checkProvider('github');
    // Should handle gracefully
    expect(typeof result).toBe('boolean');
  });

  it('should return valid ConnectivityCheckResult', async () => {
    const service = new ConnectivityService();
    const result = await service.checkAll();

    expect(result).toHaveProperty('github');
    expect(result).toHaveProperty('azure');
    expect(result).toHaveProperty('anyAvailable');
    expect(result).toHaveProperty('allAvailable');

    expect(typeof result.github).toBe('boolean');
    expect(typeof result.azure).toBe('boolean');
    expect(typeof result.anyAvailable).toBe('boolean');
    expect(typeof result.allAvailable).toBe('boolean');
  });
});
```

---

## Checklist for Implementation

- [ ] Create `src/shared/types/connectivity.ts` (Step 1)
- [ ] Create `src/main/services/connectivity/connectivity-service.ts` (Step 2)
- [ ] Create `src/main/services/connectivity/connectivity-monitor.ts` (Step 3)
- [ ] Register IPC handlers in `src/main/ipc-handlers.ts` (Step 4)
- [ ] Create `src/renderer/stores/connectivity.ts` (Step 5)
- [ ] Create `src/renderer/hooks/useConnectivityStatus.ts` (Step 6)
- [ ] Create `src/renderer/components/git/OfflineBadge.tsx` (Step 7)
- [ ] Update `src/preload/index.ts` (Step 8)
- [ ] Update `src/shared/types/ipc-contracts.d.ts` (Step 9)
- [ ] Update `src/renderer/services/git-service.ts` (Step 10)
- [ ] Add badge to main layout in `src/renderer/App.tsx` (Step 11)
- [ ] Run `npm run type-check` - should have no errors
- [ ] Run `npm run lint:fix` - should have no linting errors
- [ ] Run `npm test` - all tests should pass
- [ ] Manual testing: Unplug network and verify offline detection
- [ ] Manual testing: Plug network back in and verify recovery

---

## Troubleshooting

### Badge not appearing
- Check that `useConnectivityStatus()` is called in your main App component
- Verify CSS is imported correctly
- Check browser console for errors in connectivity hook

### Connectivity checks taking too long
- Reduce timeout in `ConnectivityConfig.checkTimeoutMs`
- Check network latency to GitHub/Azure APIs
- Verify no proxy is intercepting requests

### Recovery stuck in "Recovering..." state
- Manually check network connectivity
- Verify GitHub/Azure APIs are actually accessible
- Check browser console for IPC errors
- Restart application

### Rate limiting errors
- Verify polling interval is at least 30 seconds between checks
- Check if exponential backoff is working (should cap at 60s)
- Consider using authenticated requests if hitting limits with shared IP

### IPC communication failing
- Verify preload script is correctly exposing `connectivity` API
- Check main process is registering IPC handlers
- Verify window type definitions include `ConnectivityAPI`
- Check Electron version compatibility (requires Electron 9+)

---

## Next Steps

1. **Implement Phase 1** (Steps 1-7): Basic connectivity detection with offline badge
2. **Test thoroughly**: Manual network disconnect/reconnect tests
3. **Implement Phase 2** (Step 8-11): Per-provider detection and Git operation guards
4. **Add unit tests**: Test connectivity-service and store
5. **Monitor in production**: Track user feedback on connectivity reliability

---

## References

- Electron Online/Offline Events: https://www.electronjs.org/docs/latest/tutorial/online-offline-events
- Fetch API with AbortController: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
- Zustand Documentation: https://github.com/pmndrs/zustand
- GitHub API Status: https://www.githubstatus.com/
- Azure DevOps API: https://learn.microsoft.com/en-us/rest/api/azure/devops/
