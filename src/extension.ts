import * as vscode from 'vscode';
import { ProfileTreeProvider } from './providers/profileTreeProvider';
import { ProfileManager } from './services/profileManager';
import { HostsSync } from './services/hostsSync';
import {
  createProfileCommand,
  renameProfileCommand,
  deleteProfileCommand,
  activateProfileCommand,
  deactivateProfileCommand,
  editProfileCommand,
} from './commands/profileCommands';

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext) {
  // Create ProfileManager, HostsSync, and TreeView provider
  const profileManager = new ProfileManager();
  const hostsSync = new HostsSync();
  const treeProvider = new ProfileTreeProvider(profileManager, hostsSync);

  // Register TreeView
  const treeView = vscode.window.createTreeView('hostieProfiles', {
    treeDataProvider: treeProvider,
    showCollapseAll: false,
  });

  // Initialize file watchers
  treeProvider.initializeWatchers(context);

  // Register commands
  const commands = [
    // Create profile command
    vscode.commands.registerCommand('hostie.createProfile', () =>
      createProfileCommand(treeProvider)
    ),

    // Rename profile command
    vscode.commands.registerCommand('hostie.renameProfile', (item) =>
      renameProfileCommand(item, treeProvider)
    ),

    // Delete profile command
    vscode.commands.registerCommand('hostie.deleteProfile', (item) =>
      deleteProfileCommand(item, treeProvider)
    ),

    // Activate profile command
    vscode.commands.registerCommand('hostie.activateProfile', (item) =>
      activateProfileCommand(item, treeProvider)
    ),

    // Deactivate profile command
    vscode.commands.registerCommand('hostie.deactivateProfile', (item) =>
      deactivateProfileCommand(item, treeProvider)
    ),

    // Edit profile command
    vscode.commands.registerCommand('hostie.editProfile', (item) =>
      editProfileCommand(item)
    ),

    // Refresh TreeView command
    vscode.commands.registerCommand('hostie.refreshProfiles', () =>
      treeProvider.refresh()
    ),
  ];

  // Add all disposables to context for cleanup
  context.subscriptions.push(treeView, treeProvider, ...commands);
}

/**
 * Extension deactivation cleanup
 */
export function deactivate() {
  // Cleanup is handled automatically via context.subscriptions
}
