import * as vscode from 'vscode';
import { ProfileManager } from '../services/profileManager';
import { ProfileTreeProvider, ProfileTreeItem } from '../providers/profileTreeProvider';

const profileManager = new ProfileManager();

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
