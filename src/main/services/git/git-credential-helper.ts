/**
 * Git Credential Manager Helper
 *
 * Integrates with Git Credential Manager (GCM) for Azure DevOps authentication.
 * GCM handles OAuth, PAT storage, and token refresh automatically.
 *
 * This approach follows VS Code's pattern - let Git handle credentials instead
 * of implementing our own OAuth flow.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Git credential information returned by GCM
 */
export interface GitCredential {
  protocol: string;
  host: string;
  username?: string;
  password: string; // This is the access token
  path?: string;
}

/**
 * Git Credential Manager helper service
 *
 * Features:
 * - Checks for Git installation
 * - Triggers GCM authentication via git ls-remote
 * - Extracts credentials from GCM
 * - Supports OAuth and PAT authentication
 * - Cross-platform (Windows, Mac, Linux)
 */
export class GitCredentialHelper {
  private gitVersion: string | null = null;
  private hasGCM: boolean | null = null;

  /**
   * Check if Git is installed and get version
   *
   * @returns Git version string or null if not installed
   */
  async checkGitInstalled(): Promise<string | null> {
    if (this.gitVersion !== null) {
      return this.gitVersion;
    }

    try {
      const { stdout } = await execAsync('git --version');
      this.gitVersion = stdout.trim();
      console.log('[GitCredentialHelper] Git installed:', this.gitVersion);
      return this.gitVersion;
    } catch (error: any) {
      console.error('[GitCredentialHelper] Git not found:', error.message);
      this.gitVersion = null;
      return null;
    }
  }

  /**
   * Check if Git Credential Manager is available
   *
   * @returns True if GCM is available
   */
  async checkGCMAvailable(): Promise<boolean> {
    if (this.hasGCM !== null) {
      return this.hasGCM;
    }

    try {
      // Try to get GCM version
      const { stdout } = await execAsync('git credential-manager --version', {
        timeout: 5000,
      });
      this.hasGCM = true;
      console.log('[GitCredentialHelper] GCM available:', stdout.trim());
      return true;
    } catch (error) {
      // GCM might still work even if this command fails
      // (older versions might not have --version flag)
      console.log('[GitCredentialHelper] GCM version check failed, but may still be available');
      this.hasGCM = true; // Assume it's available
      return true;
    }
  }

  /**
   * Trigger authentication by running git ls-remote
   * This causes GCM to prompt for credentials if needed
   *
   * @param url - Repository URL
   * @param timeout - Timeout in milliseconds (default 60s)
   * @returns True if authentication succeeded
   */
  async triggerAuthentication(url: string, timeout: number = 60000): Promise<boolean> {
    console.log('[GitCredentialHelper] Triggering authentication for:', url);

    try {
      // git ls-remote will trigger GCM authentication if needed
      // We don't care about the output, just whether it succeeds
      const { stdout, stderr } = await execAsync(`git ls-remote "${url}" HEAD`, {
        timeout,
        // Set environment to ensure interactive prompts work
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '1', // Enable terminal prompts
        },
      });

      console.log('[GitCredentialHelper] Authentication successful');
      if (stderr) {
        console.log('[GitCredentialHelper] Git stderr:', stderr);
      }

      return true;
    } catch (error: any) {
      console.error('[GitCredentialHelper] Authentication failed:', error.message);

      // Check for specific error types
      if (error.code === 'ETIMEDOUT') {
        throw {
          code: 'TIMEOUT',
          message: 'Authentication timed out. Please try again.',
          retryable: true,
        };
      }

      if (error.stderr?.includes('Authentication failed') || error.stderr?.includes('fatal: Authentication failed')) {
        throw {
          code: 'AUTH_FAILED',
          message: 'Authentication failed. Please check your credentials.',
          statusCode: 401,
          retryable: false,
        };
      }

      if (error.stderr?.includes('Repository not found')) {
        throw {
          code: 'REPOSITORY_NOT_FOUND',
          message: 'Repository not found. Please check the URL.',
          statusCode: 404,
          retryable: false,
        };
      }

      throw {
        code: 'GIT_ERROR',
        message: `Git authentication failed: ${error.message}`,
        retryable: true,
        details: error.stderr || error.message,
      };
    }
  }

  /**
   * Extract credential from GCM for a given URL
   *
   * @param url - Repository URL
   * @returns Git credential with access token
   */
  async getCredential(url: string): Promise<GitCredential> {
    console.log('[GitCredentialHelper] Getting credential for:', url);

    // Parse URL to extract protocol, host, and path
    const urlObj = new URL(url);
    const protocol = urlObj.protocol.replace(':', '');
    const host = urlObj.hostname;
    const path = urlObj.pathname;

    console.log('[GitCredentialHelper] URL components:', { protocol, host, path });

    // Try multiple approaches to get the credential
    // GCM might store credentials differently depending on configuration

    // Approach 1: Try with full path
    let input = [
      `protocol=${protocol}`,
      `host=${host}`,
      `path=${path}`,
      '', // Empty line to signal end of input
    ].join('\n');

    try {
      console.log('[GitCredentialHelper] Attempting credential fill with path...');
      const result = await this.executeGitCredentialFill(input);
      console.log('[GitCredentialHelper] Raw credential output:', result);

      const credential = this.parseCredentialOutput(result);
      if (credential.password) {
        console.log('[GitCredentialHelper] Credential retrieved successfully with path');
        return credential;
      }
    } catch (error: any) {
      console.warn('[GitCredentialHelper] Failed with path, trying without...', error.message);
    }

    // Approach 2: Try without path (GCM often stores credentials per host only)
    input = [
      `protocol=${protocol}`,
      `host=${host}`,
      '', // Empty line to signal end of input
    ].join('\n');

    try {
      console.log('[GitCredentialHelper] Attempting credential fill without path...');
      const result = await this.executeGitCredentialFill(input);
      console.log('[GitCredentialHelper] Raw credential output (no path):', result);

      const credential = this.parseCredentialOutput(result);
      if (credential.password) {
        console.log('[GitCredentialHelper] Credential retrieved successfully without path');
        return credential;
      } else {
        throw new Error('No password/token found in credential response');
      }
    } catch (error: any) {
      console.error('[GitCredentialHelper] Failed to get credential:', error.message);
      throw {
        code: 'CREDENTIAL_NOT_FOUND',
        message: 'Could not retrieve credentials from Git Credential Manager',
        retryable: true,
        details: error.message,
      };
    }
  }

  /**
   * Execute git credential fill with proper stdin handling
   *
   * @param input - Input string for git credential fill
   * @returns Output from git credential fill
   */
  private async executeGitCredentialFill(input: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = require('child_process').spawn('git', ['credential', 'fill'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      process.on('close', (code: number) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`git credential fill failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err: Error) => {
        reject(err);
      });

      // Write input to stdin
      process.stdin.write(input);
      process.stdin.end();
    });
  }

  /**
   * Parse output from git credential fill
   *
   * @param output - Output from git credential fill
   * @returns Parsed credential
   */
  private parseCredentialOutput(output: string): GitCredential {
    const lines = output.split('\n').filter(line => line.trim());
    const credential: Partial<GitCredential> = {};

    for (const line of lines) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('='); // Handle values with '=' in them

      if (key === 'protocol') credential.protocol = value;
      else if (key === 'host') credential.host = value;
      else if (key === 'username') credential.username = value;
      else if (key === 'password') credential.password = value;
      else if (key === 'path') credential.path = value;
    }

    if (!credential.protocol || !credential.host || !credential.password) {
      throw new Error('Invalid credential output - missing required fields');
    }

    return credential as GitCredential;
  }

  /**
   * Store credential in GCM (for PAT or manual token entry)
   *
   * @param url - Repository URL
   * @param username - Username (optional)
   * @param password - Password/token
   */
  async storeCredential(url: string, username: string, password: string): Promise<void> {
    console.log('[GitCredentialHelper] Storing credential for:', url);

    const urlObj = new URL(url);
    const protocol = urlObj.protocol.replace(':', '');
    const host = urlObj.hostname;
    const path = urlObj.pathname;

    const input = [
      `protocol=${protocol}`,
      `host=${host}`,
      `path=${path}`,
      `username=${username}`,
      `password=${password}`,
      '', // Empty line to signal end of input
    ].join('\n');

    return new Promise((resolve, reject) => {
      const process = require('child_process').spawn('git', ['credential', 'approve'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';

      process.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      process.on('close', (code: number) => {
        if (code === 0) {
          console.log('[GitCredentialHelper] Credential stored successfully');
          resolve();
        } else {
          reject(new Error(`git credential approve failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err: Error) => {
        reject(err);
      });

      // Write input to stdin
      process.stdin.write(input);
      process.stdin.end();
    });
  }

  /**
   * Delete credential from GCM
   *
   * @param url - Repository URL
   */
  async deleteCredential(url: string): Promise<void> {
    console.log('[GitCredentialHelper] Deleting credential for:', url);

    const urlObj = new URL(url);
    const protocol = urlObj.protocol.replace(':', '');
    const host = urlObj.hostname;
    const path = urlObj.pathname;

    const input = [
      `protocol=${protocol}`,
      `host=${host}`,
      `path=${path}`,
      '', // Empty line to signal end of input
    ].join('\n');

    return new Promise((resolve, reject) => {
      const process = require('child_process').spawn('git', ['credential', 'reject'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';

      process.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      process.on('close', (code: number) => {
        if (code === 0) {
          console.log('[GitCredentialHelper] Credential deleted successfully');
          resolve();
        } else {
          reject(new Error(`git credential reject failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err: Error) => {
        reject(err);
      });

      // Write input to stdin
      process.stdin.write(input);
      process.stdin.end();
    });
  }
}

// Export singleton instance
export const gitCredentialHelper = new GitCredentialHelper();
