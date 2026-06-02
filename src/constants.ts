import * as os from 'os';
import * as path from 'path';

/**
 * Directory where host profile files are stored
 */
export const HOSTS_DIR = path.join(os.homedir(), '.host');

/**
 * Path to meta.json file that tracks active profiles
 */
export const META_FILE = path.join(HOSTS_DIR, 'meta.json');

/**
 * Delimiter format for marking profile sections in system hosts file
 */
export const DELIMITER_START = (name: string) => `# host ${name} start`;
export const DELIMITER_END = (name: string) => `# host ${name} end`;

/**
 * Platform-specific system hosts file paths
 */
export const SYSTEM_HOSTS_PATH: Record<string, string> = {
  win32: 'C:\\Windows\\System32\\drivers\\etc\\hosts',
  darwin: '/etc/hosts',
  linux: '/etc/hosts',
};

/**
 * Get the system hosts file path for the current platform
 */
export function getSystemHostsPath(): string {
  return SYSTEM_HOSTS_PATH[os.platform()] || '/etc/hosts';
}
