/**
 * Credential Store
 *
 * Manages authentication credentials using Electron's safeStorage API.
 * Credentials are encrypted at rest using OS-level credential managers:
 * - Windows: Credential Manager
 * - macOS: Keychain
 * - Linux: Secret Service API
 *
 * Source: specs/001-git-repo-integration/research.md (Section 3)
 */

import { safeStorage } from 'electron';
import type Store from 'electron-store';

/**
 * Credential entry structure
 */
interface CredentialEntry {
  repositoryId: string;
  authMethod: 'oauth' | 'pat';
  encryptedToken: string;
  expiresAt?: number;
}

/**
 * Credential storage service
 *
 * Security guarantees:
 * - Tokens encrypted using OS-level credential manager
 * - Tokens never stored in plain text
 * - Expired credentials automatically removed
 * - Tokens never logged or sent over IPC
 */
export class CredentialStore {
  private store: Store<{ credentials: CredentialEntry[] }> | null = null;
  private storePromise: Promise<Store<{ credentials: CredentialEntry[] }>> | null = null;

  /**
   * Initialize the store (lazy loading with dynamic import)
   */
  private async getStore(): Promise<Store<{ credentials: CredentialEntry[] }>> {
    if (this.store) {
      return this.store;
    }

    if (!this.storePromise) {
      this.storePromise = (async () => {
        const { default: ElectronStore } = await import('electron-store');
        this.store = new ElectronStore({
          name: 'git-credentials',
          encryptionKey: 'obfuscation-only', // Not for security - actual encryption is via safeStorage
        });
        return this.store;
      })();
    }

    return this.storePromise;
  }

  /**
   * Save a credential for a repository
   *
   * @param repositoryId - Repository identifier
   * @param authMethod - Authentication method (oauth or pat)
   * @param token - Plain text token (will be encrypted)
   * @param expiresAt - Optional expiration timestamp
   * @throws {Error} If OS credential encryption is not available
   */
  async saveCredential(
    repositoryId: string,
    authMethod: 'oauth' | 'pat',
    token: string,
    expiresAt?: number
  ): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('OS credential encryption not available');
    }

    const store = await this.getStore();

    // Encrypt using OS-level encryption
    const encryptedBuffer = safeStorage.encryptString(token);
    const encryptedToken = encryptedBuffer.toString('base64');

    const credentials = store.get('credentials', []);
    const existing = credentials.findIndex(
      c => c.repositoryId === repositoryId && c.authMethod === authMethod
    );

    const entry: CredentialEntry = {
      repositoryId,
      authMethod,
      encryptedToken,
      expiresAt,
    };

    if (existing >= 0) {
      credentials[existing] = entry;
    } else {
      credentials.push(entry);
    }

    store.set('credentials', credentials);
  }

  /**
   * Retrieve a credential for a repository
   *
   * @param repositoryId - Repository identifier
   * @param authMethod - Authentication method (oauth or pat)
   * @returns Decrypted token, or null if not found or expired
   */
  async getCredential(
    repositoryId: string,
    authMethod: 'oauth' | 'pat'
  ): Promise<string | null> {
    const store = await this.getStore();
    const credentials = store.get('credentials', []);
    const entry = credentials.find(
      c => c.repositoryId === repositoryId && c.authMethod === authMethod
    );

    if (!entry) return null;

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await this.deleteCredential(repositoryId, authMethod);
      return null;
    }

    // Decrypt using OS-level decryption
    const encryptedBuffer = Buffer.from(entry.encryptedToken, 'base64');
    const decrypted = safeStorage.decryptString(encryptedBuffer);
    return decrypted;
  }

  /**
   * Delete credentials for a repository
   *
   * @param repositoryId - Repository identifier
   * @param authMethod - Optional specific auth method to delete (deletes all if not specified)
   */
  async deleteCredential(
    repositoryId: string,
    authMethod?: 'oauth' | 'pat'
  ): Promise<void> {
    const store = await this.getStore();
    const credentials = store.get('credentials', []);
    const filtered = credentials.filter(
      c => !(c.repositoryId === repositoryId &&
            (!authMethod || c.authMethod === authMethod))
    );
    store.set('credentials', filtered);
  }

  /**
   * Check if a credential exists for a repository
   *
   * @param repositoryId - Repository identifier
   * @param authMethod - Authentication method
   * @returns True if credential exists and is not expired
   */
  async hasCredential(
    repositoryId: string,
    authMethod: 'oauth' | 'pat'
  ): Promise<boolean> {
    const store = await this.getStore();
    const credentials = store.get('credentials', []);
    const entry = credentials.find(
      c => c.repositoryId === repositoryId && c.authMethod === authMethod
    );

    if (!entry) return false;

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await this.deleteCredential(repositoryId, authMethod);
      return false;
    }

    return true;
  }

  /**
   * Store a token for a provider (not repository-specific)
   * Used for OAuth tokens that work across all repositories
   *
   * @param provider - Git provider (github or azure)
   * @param token - Plain text token (will be encrypted)
   */
  async storeToken(provider: 'github' | 'azure', token: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('OS credential encryption not available');
    }

    const store = await this.getStore();

    // Encrypt using OS-level encryption
    const encryptedBuffer = safeStorage.encryptString(token);
    const encryptedToken = encryptedBuffer.toString('base64');

    // Store in a separate key for provider tokens
    store.set(`provider-token-${provider}`, encryptedToken);
  }

  /**
   * Retrieve a token for a provider
   *
   * @param provider - Git provider (github or azure)
   * @returns Decrypted token, or null if not found
   */
  async getToken(provider: 'github' | 'azure'): Promise<string | null> {
    const store = await this.getStore();
    const encryptedToken = store.get(`provider-token-${provider}`) as string | undefined;

    if (!encryptedToken) return null;

    try {
      // Decrypt using OS-level decryption
      const encryptedBuffer = Buffer.from(encryptedToken, 'base64');
      const decrypted = safeStorage.decryptString(encryptedBuffer);
      return decrypted;
    } catch (error) {
      // If decryption fails, delete the corrupted token
      store.delete(`provider-token-${provider}`);
      return null;
    }
  }

  /**
   * Delete a token for a provider
   *
   * @param provider - Git provider (github or azure)
   */
  async deleteToken(provider: 'github' | 'azure'): Promise<void> {
    const store = await this.getStore();
    store.delete(`provider-token-${provider}`);
  }

  /**
   * Check if a token exists for a provider
   *
   * @param provider - Git provider (github or azure)
   * @returns True if token exists
   */
  async hasToken(provider: 'github' | 'azure'): Promise<boolean> {
    const store = await this.getStore();
    return store.has(`provider-token-${provider}`);
  }
}

// Export singleton instance
export const credentialStore = new CredentialStore();
