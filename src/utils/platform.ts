import * as os from 'os';

/**
 * Supported platform types
 */
export type Platform = 'win32' | 'darwin' | 'linux';

/**
 * Get the current operating system platform
 * @returns Platform identifier
 */
export function getPlatform(): Platform {
  const platform = os.platform();
  
  // Normalize to our supported platforms
  if (platform === 'win32') return 'win32';
  if (platform === 'darwin') return 'darwin';
  return 'linux'; // Default to linux for other Unix-like systems
}

/**
 * Get the system hosts file path for the current platform
 * @returns Absolute path to the system hosts file
 */
export function getSystemHostsPath(): string {
  const platform = getPlatform();
  
  switch (platform) {
    case 'win32':
      return 'C:\\Windows\\System32\\drivers\\etc\\hosts';
    case 'darwin':
    case 'linux':
      return '/etc/hosts';
    default:
      return '/etc/hosts';
  }
}
