/**
 * Git API Preload Script
 *
 * Exposes Git repository operations to the renderer process via contextBridge.
 * Aligns with FR-003, FR-004, FR-012 through FR-016, and security best practices.
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Git API exposed to renderer process via window.git
 *
 * Usage in renderer:
 * ```typescript
 * const result = await window.git.repo.connect({ url: '...', authMethod: 'oauth' });
 * ```
 */
export const exposeGitAPI = () => {
  contextBridge.exposeInMainWorld('git', {
    // Repository operations (Phase 3 - US1)
    repo: {
      // TODO: T042 - Implement git.repo.connect()
      // TODO: T043 - Implement git.repo.fetchFile()
      // TODO: T044 - Implement git.repo.fetchTree()
      // TODO: T069 - Implement git.repo.switchBranch() and listBranches()
      // TODO: T084 - Implement git.repo.openBranchInNewTab()
    },

    // Authentication operations (Phase 4 - US2)
    auth: {
      // TODO: T060 - Implement git.auth.authenticateWithPAT()
      // TODO: T095-T097 - Implement git.auth.initiateOAuth() (if needed)
    },

    // Connectivity operations (Phase 3 - US1)
    connectivity: {
      // TODO: T045 - Implement git.connectivity.check()
      // TODO: Implement git.connectivity.onChanged() event listener
    },

    // Recent items (Phase 6 - US4)
    recent: {
      // TODO: T078 - Implement git.recent.list()
    },
  });
};
