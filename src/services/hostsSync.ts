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

      await this.writeAtomic(hostsPath, cleanedContent, lineEnding);

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
    const lines = content.split(/\r?\n/);
    const result: string[] = [];
    let inManagedSection = false;

    for (const line of lines) {
      // Check if this is a start delimiter
      if (line.trim().startsWith('# host ') && line.trim().endsWith(' start')) {
        inManagedSection = true;
        continue;
      }

      // Check if this is an end delimiter
      if (line.trim().startsWith('# host ') && line.trim().endsWith(' end')) {
        inManagedSection = false;
        continue;
      }

      // Add line if not in managed section
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
    const lines = content.split(/\r?\n/);
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
    const tempPath = `${targetPath}.tmp`;

    try {
      await writeFilePreservingLineEndings(tempPath, content, lineEnding);
      await fs.rename(tempPath, targetPath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }
}
