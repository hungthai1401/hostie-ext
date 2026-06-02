import * as fs from 'fs/promises';
import * as path from 'path';
import { HostProfile, MetaData } from '../models/types';
import { HOSTS_DIR, META_FILE } from '../constants';
import {
  readFilePreservingLineEndings,
  writeFilePreservingLineEndings,
  ensureDirectoryExists,
} from '../utils/fileSystem';

/**
 * Service for managing host profiles
 */
export class ProfileManager {
  /**
   * List all available host profiles
   */
  async listProfiles(): Promise<HostProfile[]> {
    // Ensure directory exists
    await ensureDirectoryExists(HOSTS_DIR);

    try {
      const files = await fs.readdir(HOSTS_DIR);
      const hostFiles = files.filter((f) => f.endsWith('.host'));

      const profiles: HostProfile[] = [];
      const activeProfiles = await this.getActiveProfiles();

      for (const file of hostFiles) {
        const name = path.basename(file, '.host');
        const filePath = path.join(HOSTS_DIR, file);
        const stats = await fs.stat(filePath);

        profiles.push({
          name,
          path: filePath,
          isActive: activeProfiles.includes(name),
          lastModified: stats.mtime,
        });
      }

      return profiles.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Create a new host profile
   */
  async createProfile(name: string): Promise<HostProfile> {
    this.validateProfileName(name);

    await ensureDirectoryExists(HOSTS_DIR);

    const filePath = path.join(HOSTS_DIR, `${name}.host`);

    // Check if profile already exists
    try {
      await fs.access(filePath);
      throw new Error(`Profile "${name}" already exists`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Create empty profile file
    await writeFilePreservingLineEndings(filePath, '', '\n');

    const stats = await fs.stat(filePath);

    return {
      name,
      path: filePath,
      isActive: false,
      lastModified: stats.mtime,
    };
  }

  /**
   * Rename an existing profile
   */
  async renameProfile(oldName: string, newName: string): Promise<void> {
    this.validateProfileName(oldName);
    this.validateProfileName(newName);

    const oldPath = path.join(HOSTS_DIR, `${oldName}.host`);
    const newPath = path.join(HOSTS_DIR, `${newName}.host`);

    // Check if old profile exists
    try {
      await fs.access(oldPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Profile "${oldName}" does not exist`);
      }
      throw error;
    }

    // Check if new name already exists
    try {
      await fs.access(newPath);
      throw new Error(`Profile "${newName}" already exists`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Rename file
    await fs.rename(oldPath, newPath);

    // Update meta.json if profile was active
    const activeProfiles = await this.getActiveProfiles();
    if (activeProfiles.includes(oldName)) {
      const updatedProfiles = activeProfiles.map((p) =>
        p === oldName ? newName : p
      );
      await this.saveActiveProfiles(updatedProfiles);
    }
  }

  /**
   * Delete a profile
   */
  async deleteProfile(name: string): Promise<void> {
    this.validateProfileName(name);

    const filePath = path.join(HOSTS_DIR, `${name}.host`);

    // Check if profile exists
    try {
      await fs.access(filePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Profile "${name}" does not exist`);
      }
      throw error;
    }

    // Delete file
    await fs.unlink(filePath);

    // Remove from active profiles if present
    const activeProfiles = await this.getActiveProfiles();
    if (activeProfiles.includes(name)) {
      const updatedProfiles = activeProfiles.filter((p) => p !== name);
      await this.saveActiveProfiles(updatedProfiles);
    }
  }

  /**
   * Get the content of a profile
   */
  async getProfileContent(name: string): Promise<string> {
    this.validateProfileName(name);

    const filePath = path.join(HOSTS_DIR, `${name}.host`);
    const { content } = await readFilePreservingLineEndings(filePath);
    return content;
  }

  /**
   * Check if a profile is active
   */
  async isProfileActive(name: string): Promise<boolean> {
    const activeProfiles = await this.getActiveProfiles();
    return activeProfiles.includes(name);
  }

  /**
   * Load meta.json data
   */
  async loadMeta(): Promise<MetaData> {
    try {
      const content = await fs.readFile(META_FILE, 'utf8');
      const meta: MetaData = JSON.parse(content);
      // Validate structure
      if (!Array.isArray(meta.cur)) {
        throw new Error('Invalid meta.json format: cur must be an array');
      }
      return meta;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Return default if file doesn't exist
        return { cur: [] };
      }
      if (error instanceof SyntaxError) {
        throw new Error('meta.json contains invalid JSON');
      }
      throw error;
    }
  }

  /**
   * Save meta.json data atomically
   */
  async saveMeta(meta: MetaData): Promise<void> {
    await ensureDirectoryExists(HOSTS_DIR);
    
    // Atomic write: write to temp file, then rename
    const tempFile = `${META_FILE}.tmp`;
    const content = JSON.stringify(meta, null, 2);
    
    try {
      await fs.writeFile(tempFile, content, 'utf8');
      await fs.rename(tempFile, META_FILE);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Set a profile's active state
   */
  async setProfileActive(name: string, active: boolean): Promise<void> {
    this.validateProfileName(name);
    
    const meta = await this.loadMeta();
    const currentIndex = meta.cur.indexOf(name);
    
    if (active && currentIndex === -1) {
      // Add to active list
      meta.cur.push(name);
      await this.saveMeta(meta);
    } else if (!active && currentIndex !== -1) {
      // Remove from active list
      meta.cur.splice(currentIndex, 1);
      await this.saveMeta(meta);
    }
    // If already in desired state, do nothing
  }

  /**
   * Get list of active profile names from meta.json
   */
  async getActiveProfiles(): Promise<string[]> {
    const meta = await this.loadMeta();
    return meta.cur;
  }

  /**
   * Save active profile names to meta.json
   */
  private async saveActiveProfiles(profiles: string[]): Promise<void> {
    await this.saveMeta({ cur: profiles });
  }

  /**
   * Validate profile name for security and file system compatibility
   */
  private validateProfileName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Profile name cannot be empty');
    }

    // Check for path traversal attempts
    if (name.includes('/') || name.includes('\\') || name.includes('..')) {
      throw new Error('Profile name cannot contain path separators');
    }

    // Check for invalid file name characters
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(name)) {
      throw new Error('Profile name contains invalid characters');
    }

    // Check for reserved names (Windows)
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];
    if (reservedNames.includes(name.toUpperCase())) {
      throw new Error('Profile name is reserved by the system');
    }
  }
}
