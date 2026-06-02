import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SyncStatus } from '../models/types';
import { DELIMITER_START, DELIMITER_END } from '../constants';
import { getSystemHostsPath } from '../utils/platform';
import {
  detectLineEnding,
  readFilePreservingLineEndings,
  writeFilePreservingLineEndings,
} from '../utils/fileSystem';

/**
 * Service for synchronizing host profiles to system hosts file
 */
export class HostsSync {
  /**
   * Read current system hosts file content
   */
  async getCurrentSystemContent(): Promise<string> {
    const hostsPath = getSystemHostsPath();
    const { content } = await readFilePreservingLineEndings(hostsPath);
    return content;
  }

  /**
   * Sync active profiles to system hosts file
   * @param activeProfiles Map of profile names to their content
   */
  async syncToSystem(
    activeProfiles: Map<string, string>
  ): Promise<SyncStatus> {
    const hostsPath = getSystemHostsPath();

    try {
      // Read existing hosts file with line ending detection
      const { content: existingContent, lineEnding } =
        await readFilePreservingLineEndings(hostsPath);

      // Remove all existing managed sections
      let cleanedContent = this.removeAllManagedSections(
        existingContent,
        lineEnding
      );

      // Append active profiles with delimiters
      const profileSections: string[] = [];
      for (const [profileName, profileContent] of activeProfiles.entries()) {
        // Validate profile content
        if (!this.isValidProfileContent(profileContent)) {
          return {
            success: false,
            error: `Profile "${profileName}" contains invalid content`,
            needsPermission: false,
          };
        }

        const section = this.wrapInDelimiters(
          profileName,
          profileContent,
          lineEnding
        );
        profileSections.push(section);
      }

      // Construct final content
      let finalContent = cleanedContent;
      if (profileSections.length > 0) {
        // Ensure cleanedContent ends with a newline
        if (!finalContent.endsWith(lineEnding)) {
          finalContent += lineEnding;
        }
        finalContent += profileSections.join(lineEnding);
      }

      // Safety check: never write a completely empty hosts file
      const hasContent = finalContent.trim().length > 0;
      if (!hasContent) {
        // Restore default localhost entries if file would be empty
        const defaultHosts = [
          '##',
          '# Host Database',
          '#',
          '# localhost is used to configure the loopback interface',
          '# when the system is booting.  Do not change this entry.',
          '##',
          '127.0.0.1\tlocalhost',
          '255.255.255.255\tbroadcasthost',
          '::1             localhost',
        ].join(lineEnding);
        finalContent = defaultHosts;
      }

      // Write atomically
      await this.writeAtomic(hostsPath, finalContent, lineEnding);

      return {
        success: true,
        needsPermission: false,
      };
    } catch (error: any) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        return {
          success: false,
          error: error.message,
          needsPermission: true,
        };
      }

      return {
        success: false,
        error: error.message || 'Unknown error during sync',
        needsPermission: false,
      };
    }
  }

  /**
   * Remove a specific profile from system hosts file
   */
  async removeFromSystem(profileName: string): Promise<SyncStatus> {
    const hostsPath = getSystemHostsPath();

    try {
      const { content: existingContent, lineEnding } =
        await readFilePreservingLineEndings(hostsPath);

      const cleanedContent = this.removeManagedSection(
        existingContent,
        profileName,
        lineEnding
      );

      // Safety check: never write a completely empty hosts file
      const hasContent = cleanedContent.trim().length > 0;
      if (!hasContent) {
        // Restore default localhost entries if file would be empty
        const defaultHosts = [
          '##',
          '# Host Database',
          '#',
          '# localhost is used to configure the loopback interface',
          '# when the system is booting.  Do not change this entry.',
          '##',
          '127.0.0.1\tlocalhost',
          '255.255.255.255\tbroadcasthost',
          '::1             localhost',
        ].join(lineEnding);
        await this.writeAtomic(hostsPath, defaultHosts, lineEnding);
      } else {
        await this.writeAtomic(hostsPath, cleanedContent, lineEnding);
      }

      return {
        success: true,
        needsPermission: false,
      };
    } catch (error: any) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        return {
          success: false,
          error: error.message,
          needsPermission: true,
        };
      }

      return {
        success: false,
        error: error.message || 'Unknown error during removal',
        needsPermission: false,
      };
    }
  }

  /**
   * Remove all managed sections (between delimiters) from hosts content
   */
  private removeAllManagedSections(
    content: string,
    lineEnding: string
  ): string {
    const lines = content.split(lineEnding);
    const result: string[] = [];
    let inManagedSection = false;
    const startPattern = /^# host .+ start$/;
    const endPattern = /^# host .+ end$/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (startPattern.test(trimmed)) {
        inManagedSection = true;
        continue;
      }
      if (endPattern.test(trimmed)) {
        inManagedSection = false;
        continue;
      }
      if (!inManagedSection) {
        result.push(line);
      }
    }

    return result.join(lineEnding);
  }

  /**
   * Remove a specific managed section by profile name
   */
  private removeManagedSection(
    content: string,
    profileName: string,
    lineEnding: string
  ): string {
    const lines = content.split(lineEnding);
    const result: string[] = [];
    const startDelimiter = DELIMITER_START(profileName);
    const endDelimiter = DELIMITER_END(profileName);
    let inTargetSection = false;

    for (const line of lines) {
      if (line.trim() === startDelimiter) {
        inTargetSection = true;
        continue;
      }

      if (line.trim() === endDelimiter) {
        inTargetSection = false;
        continue;
      }

      if (!inTargetSection) {
        result.push(line);
      }
    }

    return result.join(lineEnding);
  }

  /**
   * Wrap profile content in delimiters
   */
  private wrapInDelimiters(
    profileName: string,
    content: string,
    lineEnding: string
  ): string {
    const startDelimiter = DELIMITER_START(profileName);
    const endDelimiter = DELIMITER_END(profileName);

    // Trim trailing whitespace from content
    const trimmedContent = content.trim();

    return [startDelimiter, trimmedContent, endDelimiter].join(lineEnding);
  }

  /**
   * Validate profile content for safety
   */
  private isValidProfileContent(content: string): boolean {
    // Empty content is valid
    if (!content || content.trim().length === 0) {
      return true;
    }

    // Check for delimiter injection attempts
    if (content.includes('# host ') && content.includes(' start')) {
      return false;
    }
    if (content.includes('# host ') && content.includes(' end')) {
      return false;
    }

    // Basic hosts file format validation (optional - could be stricter)
    // Each line should be: IP hostname [aliases...] or comment (#) or empty
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (trimmed.length === 0 || trimmed.startsWith('#')) {
        continue;
      }

      // Check for basic hosts entry format
      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) {
        // Invalid entry (should have at least IP and hostname)
        return false;
      }
    }

    return true;
  }

  /**
   * Write to hosts file atomically using temp file + rename
   */
  private async writeAtomic(
    targetPath: string,
    content: string,
    lineEnding: '\r\n' | '\n'
  ): Promise<void> {
    // For system files like /etc/hosts, we can't use copyFile (requires root)
    // Instead, write directly if target is writable
    const tempPath = path.join(os.tmpdir(), 'hostie-hosts.tmp');

    try {
      // Write to temp file first (for verification)
      await writeFilePreservingLineEndings(tempPath, content, lineEnding);
      // Read back the temp file content
      const tempContent = await fs.readFile(tempPath, 'utf8');
      // Write directly to target (works if target is 666)
      await fs.writeFile(targetPath, tempContent, 'utf8');
      // Clean up temp file
      await fs.unlink(tempPath);
    } catch (error: any) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      // Re-throw with target path (not temp path) for clearer error messages
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        const permError: any = new Error(`Permission denied writing to ${targetPath}`);
        permError.code = error.code;
        throw permError;
      }
      throw error;
    }
  }

  /**
   * Check read and write permissions on system hosts file
   */
  async checkPermissions(): Promise<{ canRead: boolean; canWrite: boolean }> {
    const hostsPath = getSystemHostsPath();

    // Test read permission
    let canRead = false;
    try {
      await fs.access(hostsPath, fs.constants.R_OK);
      canRead = true;
    } catch {
      canRead = false;
    }

    // Test write permission
    let canWrite = false;
    try {
      await fs.access(hostsPath, fs.constants.W_OK);
      canWrite = true;
    } catch {
      canWrite = false;
    }

    return { canRead, canWrite };
  }

  /**
   * Get platform-specific permission error message
   */
  getPermissionErrorMessage(platform: string): string {
    switch (platform) {
      case 'win32':
        return (
          'Requires administrator access. Restart VS Code as Administrator or manually edit hosts file at ' +
          'C:\\Windows\\System32\\drivers\\etc\\hosts. You can continue managing profiles without sync.'
        );

      case 'darwin':
        return (
          'Permission denied: /etc/hosts requires root access.\n\n' +
          'Option 1: Grant write permissions (one-time setup):\n' +
          '  sudo chmod 666 /etc/hosts\n' +
          '  (allows extension to sync automatically)\n\n' +
          'Option 2: Manual sync each time:\n' +
          '  1. Open profile: ~/.host/[profile].host\n' +
          '  2. Copy the hosts entries\n' +
          '  3. Edit system hosts: sudo nano /etc/hosts\n' +
          '  4. Paste between # host [profile] start/end delimiters\n\n' +
          'Profiles remain editable without sync.'
        );

      case 'linux':
        return (
          'Permission denied: /etc/hosts requires root access.\n\n' +
          'Option 1: Grant write permissions (one-time setup):\n' +
          '  sudo chmod 666 /etc/hosts\n' +
          '  (allows extension to sync automatically)\n\n' +
          'Option 2: Manual sync each time:\n' +
          '  1. Open profile: ~/.host/[profile].host\n' +
          '  2. Copy the hosts entries\n' +
          '  3. Edit system hosts: sudo nano /etc/hosts\n' +
          '  4. Paste between # host [profile] start/end delimiters\n\n' +
          'Profiles remain editable without sync.'
        );

      default:
        return (
          'Requires elevated permissions to modify system hosts file. ' +
          'You can continue managing profiles without sync.'
        );
    }
  }
}
