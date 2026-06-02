import * as vscode from 'vscode';
import { HostProfile } from '../models/types';
import { HOSTS_DIR } from '../constants';
import { ProfileManager } from '../services/profileManager';
import { HostsSync } from '../services/hostsSync';

/**
 * TreeItem representing a host profile
 */
export class ProfileTreeItem extends vscode.TreeItem {
  constructor(
    public readonly profile: HostProfile,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(profile.name, collapsibleState);

    // Set icon based on active state
    this.iconPath = profile.isActive
      ? new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
      : new vscode.ThemeIcon('circle-outline');

    // Set context value for menu filtering
    this.contextValue = profile.isActive ? 'activeProfile' : 'inactiveProfile';

    // Set tooltip
    this.tooltip = profile.isActive
      ? `${profile.name} (Active)\nLast modified: ${profile.lastModified.toLocaleString()}`
      : `${profile.name}\nLast modified: ${profile.lastModified.toLocaleString()}`;

    // Set description (inline text)
    this.description = profile.isActive ? '✓ Active' : '';

    // Set command to open profile on click (single or double-click)
    this.command = {
      command: 'hostie.editProfile',
      title: 'Edit Profile',
      arguments: [this],
    };
  }
}

/**
 * TreeDataProvider for displaying host profiles
 */
export class ProfileTreeProvider implements vscode.TreeDataProvider<ProfileTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProfileTreeItem | undefined | null | void> =
    new vscode.EventEmitter<ProfileTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ProfileTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private fileWatchers: vscode.FileSystemWatcher[] = [];

  constructor(private profileManager: ProfileManager, private hostsSync: HostsSync) {}

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item representation
   */
  getTreeItem(element: ProfileTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children for the tree
   * @param element Optional parent element (undefined for root)
   */
  async getChildren(element?: ProfileTreeItem): Promise<ProfileTreeItem[]> {
    // Root level - return all profiles
    if (!element) {
      try {
        const profiles = await this.profileManager.listProfiles();
        return profiles.map(
          (profile) =>
            new ProfileTreeItem(profile, vscode.TreeItemCollapsibleState.None)
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to load profiles: ${error.message}`);
        return [];
      }
    }

    // Flat list - no children
    return [];
  }

  /**
   * Initialize file system watchers for auto-refresh
   * @param context Extension context for subscription management
   */
  initializeWatchers(context: vscode.ExtensionContext): void {
    // Watch for changes to .host files
    const hostFilesPattern = new vscode.RelativePattern(HOSTS_DIR, '**/*.host');
    const hostFilesWatcher = vscode.workspace.createFileSystemWatcher(hostFilesPattern);

    hostFilesWatcher.onDidChange(async (uri) => {
      this.refresh();
      // Auto-sync if the changed file is an active profile
      const fileName = uri.fsPath.split('/').pop()?.replace('.host', '');
      if (fileName) {
        const profiles = await this.profileManager.listProfiles();
        const changedProfile = profiles.find(p => p.name === fileName);
        if (changedProfile?.isActive) {
          // Build map of all active profiles
          const activeProfiles = await this.profileManager.getActiveProfiles();
          const profileContents = new Map<string, string>();
          for (const name of activeProfiles) {
            try {
              const content = await this.profileManager.getProfileContent(name);
              profileContents.set(name, content);
            } catch (error) {
              console.warn(`Skipping profile "${name}" during auto-sync: ${error}`);
            }
          }
          // Sync to system hosts
          await this.hostsSync.syncToSystem(profileContents);
        }
      }
    });
    hostFilesWatcher.onDidCreate(() => this.refresh());
    hostFilesWatcher.onDidDelete(() => this.refresh());

    this.fileWatchers.push(hostFilesWatcher);
    context.subscriptions.push(hostFilesWatcher);

    // Watch for changes to meta.json (tracks active profiles)
    const metaFilePattern = new vscode.RelativePattern(HOSTS_DIR, 'meta.json');
    const metaFileWatcher = vscode.workspace.createFileSystemWatcher(metaFilePattern);

    metaFileWatcher.onDidChange(() => this.refresh());
    metaFileWatcher.onDidCreate(() => this.refresh());
    metaFileWatcher.onDidDelete(() => this.refresh());

    this.fileWatchers.push(metaFileWatcher);
    context.subscriptions.push(metaFileWatcher);
  }

  /**
   * Dispose of file watchers
   */
  dispose(): void {
    this.fileWatchers.forEach((watcher) => watcher.dispose());
    this.fileWatchers = [];
  }
}
