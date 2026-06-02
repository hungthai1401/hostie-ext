import * as vscode from 'vscode';
import { HostProfile } from '../models/types';
import { ProfileManager } from '../services/profileManager';

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

  constructor(private profileManager: ProfileManager) {}

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
}
