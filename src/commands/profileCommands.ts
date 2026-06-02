import * as vscode from 'vscode';
import { ProfileManager } from '../services/profileManager';
import { ProfileTreeProvider, ProfileTreeItem } from '../providers/profileTreeProvider';
import { HostsSync } from '../services/hostsSync';
import { getPlatform } from '../utils/platform';

const profileManager = new ProfileManager();
const hostsSync = new HostsSync();

/**
 * Command handler for creating a new host profile
 */
export async function createProfileCommand(treeProvider: ProfileTreeProvider): Promise<void> {
  try {
    // Show input box for profile name
    const profileName = await vscode.window.showInputBox({
      prompt: 'Enter a name for the new profile',
      placeHolder: 'e.g., dev, staging, production',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Profile name cannot be empty';
        }
        // Check for invalid characters (path traversal, special chars)
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
          return 'Profile name can only contain letters, numbers, hyphens, and underscores';
        }
        return undefined;
      },
    });

    // User cancelled input
    if (!profileName) {
      return;
    }

    // Create the profile
    await profileManager.createProfile(profileName.trim());

    // Show success message
    vscode.window.showInformationMessage(`✓ Profile "${profileName}" created successfully`);

    // Refresh tree view
    treeProvider.refresh();
  } catch (error) {
    // Show error message
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to create profile: ${message}`);
  }
}

/**
 * Command handler for renaming an existing host profile
 */
export async function renameProfileCommand(
  item: ProfileTreeItem,
  treeProvider: ProfileTreeProvider
): Promise<void> {
  try {
    const oldName = item.profile.name;

    // Show input box pre-filled with current name
    const newName = await vscode.window.showInputBox({
      prompt: `Rename profile "${oldName}"`,
      value: oldName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Profile name cannot be empty';
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
          return 'Profile name can only contain letters, numbers, hyphens, and underscores';
        }
        if (value === oldName) {
          return 'New name must be different from current name';
        }
        return undefined;
      },
    });

    // User cancelled input
    if (!newName) {
      return;
    }

    // Rename the profile
    await profileManager.renameProfile(oldName, newName.trim());

    // Show success message
    vscode.window.showInformationMessage(`✓ Profile renamed from "${oldName}" to "${newName}"`);

    // Refresh tree view
    treeProvider.refresh();
  } catch (error) {
    // Show error message
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to rename profile: ${message}`);
  }
}

/**
 * Command handler for deleting a host profile
 */
export async function deleteProfileCommand(
  item: ProfileTreeItem,
  treeProvider: ProfileTreeProvider
): Promise<void> {
  try {
    const profileName = item.profile.name;

    // Show confirmation dialog
    const confirmed = await vscode.window.showWarningMessage(
      `Delete profile "${profileName}"?`,
      { modal: true },
      'Delete',
      'Cancel'
    );

    // User cancelled or chose Cancel
    if (confirmed !== 'Delete') {
      return;
    }

    // Delete the profile
    await profileManager.deleteProfile(profileName);

    // Show success message
    vscode.window.showInformationMessage(`✓ Profile "${profileName}" deleted successfully`);

    // Refresh tree view
    treeProvider.refresh();
  } catch (error) {
    // Show error message
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to delete profile: ${message}`);
  }
}

/**
 * Command handler for activating a host profile
 */
export async function activateProfileCommand(
  item: ProfileTreeItem,
  treeProvider: ProfileTreeProvider
): Promise<void> {
  try {
    const profileName = item.profile.name;

    // Update meta.json to mark profile as active
    await profileManager.setProfileActive(profileName, true);

    // Get profile content and sync to system hosts
    const content = await profileManager.getProfileContent(profileName);
    const activeProfiles = await profileManager.getActiveProfiles();
    const profileContents = new Map<string, string>();
    
    for (const name of activeProfiles) {
      profileContents.set(name, await profileManager.getProfileContent(name));
    }

    const syncStatus = await hostsSync.syncToSystem(profileContents);

    // Always refresh tree view (icon changes even if sync fails)
    treeProvider.refresh();

    // Handle sync result
    if (syncStatus.needsPermission) {
      // Show permission error with platform-specific instructions
      const platform = getPlatform();
      const errorMessage = hostsSync.getPermissionErrorMessage(platform);
      vscode.window.showErrorMessage(
        `Profile "${profileName}" activated in Hostie, but system hosts sync failed.\n\n${errorMessage}`,
        { modal: true }
      );
    } else if (!syncStatus.success) {
      // Show other errors
      vscode.window.showErrorMessage(
        `Profile "${profileName}" activated, but sync failed: ${syncStatus.error || 'Unknown error'}`
      );
    } else {
      // Success
      vscode.window.showInformationMessage(`✓ Profile "${profileName}" activated and synced to system hosts`);
    }
  } catch (error) {
    // Show error message
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to activate profile: ${message}`);
    // Still refresh to show any state changes
    treeProvider.refresh();
  }
}

/**
 * Command handler for deactivating a host profile
 */
export async function deactivateProfileCommand(
  item: ProfileTreeItem,
  treeProvider: ProfileTreeProvider
): Promise<void> {
  try {
    const profileName = item.profile.name;

    // Update meta.json to mark profile as inactive
    await profileManager.setProfileActive(profileName, false);

    // Remove profile section from system hosts
    const syncStatus = await hostsSync.removeFromSystem(profileName);

    // Always refresh tree view (icon changes even if sync fails)
    treeProvider.refresh();

    // Handle sync result
    if (syncStatus.needsPermission) {
      // Show permission error with platform-specific instructions
      const platform = getPlatform();
      const errorMessage = hostsSync.getPermissionErrorMessage(platform);
      vscode.window.showErrorMessage(
        `Profile "${profileName}" deactivated in Hostie, but system hosts sync failed.\n\n${errorMessage}`,
        { modal: true }
      );
    } else if (!syncStatus.success) {
      // Show other errors
      vscode.window.showErrorMessage(
        `Profile "${profileName}" deactivated, but sync failed: ${syncStatus.error || 'Unknown error'}`
      );
    } else {
      // Success
      vscode.window.showInformationMessage(`✓ Profile "${profileName}" deactivated and removed from system hosts`);
    }
  } catch (error) {
    // Show error message
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to deactivate profile: ${message}`);
    // Still refresh to show any state changes
    treeProvider.refresh();
  }
}
