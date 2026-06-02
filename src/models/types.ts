/**
 * Host profile data model
 */
export interface HostProfile {
  name: string;
  path: string;
  isActive: boolean;
  lastModified: Date;
}

/**
 * Meta.json structure for tracking active profiles
 */
export interface MetaData {
  cur: string[];
}

/**
 * Result status from hosts file synchronization operations
 */
export interface SyncStatus {
  success: boolean;
  error?: string;
  needsPermission: boolean;
}
