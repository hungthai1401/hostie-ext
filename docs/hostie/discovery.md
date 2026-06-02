# Hostie — Discovery

**Feature:** Hostie VS Code Extension
**Date:** 2026-06-02
**Discovery Type:** Greenfield (no existing codebase)

---

## Institutional Learnings

No prior learnings for this domain — this is the first feature in the repository.

---

## Architecture Snapshot

### VS Code Extension Structure

**Standard Directory Layout (TypeScript)**
```
src/
  extension.ts              # Entry point, exports activate() and deactivate()
  providers/
    profileTreeProvider.ts  # TreeDataProvider implementation
  services/
    profileManager.ts       # CRUD operations for .host profiles
    hostsSync.ts            # System hosts file synchronization
  utils/
    fileSystem.ts           # Cross-platform file operations
    platform.ts             # Platform detection and path utilities
  models/
    types.ts                # TypeScript interfaces (HostProfile, etc.)
  constants.ts              # Paths, defaults, error messages
out/                        # Compiled JavaScript (generated)
resources/                  # Icons and assets
.vscode/                    # Launch configs
package.json                # Extension manifest
tsconfig.json               # TypeScript config
.vscodeignore               # Package exclusions
README.md                   # User documentation
```

**Required Files**
- `package.json` — Extension manifest with contributions, activation events, dependencies
- `tsconfig.json` — TypeScript configuration (target ES2020, module commonjs, outDir "./out")
- Entry point: `./out/extension.js` after compilation

**Activation Lifecycle**
1. VS Code loads extension when activation event fires (auto-activates for contributed views since VS Code 1.74+)
2. Calls `activate(context: ExtensionContext)` 
3. Extension registers TreeView, commands, file watchers
4. Add disposables to `context.subscriptions` for automatic cleanup
5. `deactivate()` called on shutdown

### Extension Manifest (package.json)

**Required Fields for Publishing**
- `name`: "hostie" (lowercase, no spaces)
- `displayName`: "Hostie"
- `publisher`: (to be set during marketplace setup)
- `version`: "0.1.0" (SemVer)
- `engines.vscode`: "^1.85.0" (broad compatibility)
- `description`: "Manage multiple system hosts file configurations"
- `categories`: ["Other"]
- `main`: "./out/extension.js"
- `icon`: "resources/icon.png" (128x128 minimum)

**Contribution Points Needed**
- `viewsContainers.activitybar` — Custom Activity Bar icon for Hostie
- `views` — Register "Host Profiles" TreeView
- `commands` — Define all CRUD commands
- `menus.view/title` — Toolbar buttons (add, refresh)
- `menus.view/item/context` — Context menu per profile (activate, deactivate, rename, delete, edit)

### Integration Points

**TreeView Registration**
```typescript
const provider = new ProfileTreeProvider();
const treeView = vscode.window.createTreeView('hostieProfiles', {
  treeDataProvider: provider,
  showCollapseAll: false  // Flat list, no need to collapse
});
context.subscriptions.push(treeView, provider);
```

**TreeDataProvider Interface**
- `getChildren(element?: T)` — Returns profile list (root level) or empty array (no children)
- `getTreeItem(element: T)` — Converts HostProfile to TreeItem with icon, contextValue, tooltip
- `onDidChangeTreeData` — Event emitter to trigger view refresh after operations

**File System Watchers**
```typescript
// Watch ~/.host/ directory for external changes
const watcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(profilesDir, '**/*.host')
);
watcher.onDidChange(() => provider.refresh());
watcher.onDidCreate(() => provider.refresh());
watcher.onDidDelete(() => provider.refresh());
context.subscriptions.push(watcher);
```

---

## Pattern Search

### Similar Extensions Reference

**TreeView-based extensions:**
- **GitLens** — Complex TreeView with status icons, inline actions, refresh patterns
- **NPM Scripts** — Built-in TreeView for scripts with run actions + file watcher integration
- **Project Manager** — Configuration management with custom storage location (~/.vscode/projects)

**File management patterns:**
- **Settings Sync** — File synchronization with conflict resolution
- **EditorConfig** — File-based configuration application with multi-file monitoring

### Reusable Patterns

**TreeItem with State Visualization**
```typescript
const treeItem = new vscode.TreeItem(profile.name, vscode.TreeItemCollapsibleState.None);
treeItem.iconPath = new vscode.ThemeIcon(
  profile.isActive ? 'check' : 'circle-outline'
);
treeItem.contextValue = profile.isActive ? 'activeProfile' : 'inactiveProfile';
treeItem.tooltip = profile.isActive ? 'Currently active' : 'Inactive';
treeItem.description = profile.isActive ? '✓ Active' : '';
```

**Error Handling for Permission Issues**
```typescript
try {
  await fs.promises.writeFile(hostsPath, content, 'utf8');
  vscode.window.showInformationMessage('✓ Profile activated');
} catch (err) {
  if (err.code === 'EACCES') {
    const action = await vscode.window.showErrorMessage(
      'Permission denied. Requires elevated access.',
      'Learn More', 'Cancel'
    );
    if (action === 'Learn More') {
      // Open documentation
    }
  } else {
    vscode.window.showErrorMessage(`Failed: ${err.message}`);
  }
}
```

**File Watcher Auto-Refresh**
```typescript
const watcher = vscode.workspace.createFileSystemWatcher('**/*.host');
watcher.onDidChange(() => provider.refresh());
watcher.onDidCreate(() => provider.refresh());
watcher.onDidDelete(() => provider.refresh());
```

**Event-Driven Refresh**
```typescript
class ProfileTreeProvider {
  private _onDidChangeTreeData = new vscode.EventEmitter<ProfileTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}
```

### Naming Conventions

**Commands** (pattern: `hostie.<action>`)
- `hostie.createProfile`
- `hostie.renameProfile`
- `hostie.deleteProfile`
- `hostie.activateProfile`
- `hostie.deactivateProfile`
- `hostie.editProfile`
- `hostie.refreshProfiles`

**TypeScript Interfaces**
```typescript
interface HostProfile {
  name: string;           // Profile name (without .host extension)
  path: string;           // Absolute path to .host file
  isActive: boolean;      // Tracked in meta.json
  lastModified: Date;     // File mtime
}

interface MetaData {
  cur: string[];          // Array of active profile names
}
```

**Context Values for Menu Filtering**
- `activeProfile` — Profile currently active (show "Deactivate")
- `inactiveProfile` — Profile currently inactive (show "Activate")

---

## Constraints Analysis

### Runtime Requirements
- **Minimum VS Code version**: ^1.85.0 (broad compatibility, current stable is 1.96+)
- **Node.js version**: 18.x or higher (VS Code embeds Node.js)
- **TypeScript version**: ^5.3.0 recommended

### Build Tooling
- **Scaffolding**: Yeoman + `generator-code` for project setup
- **Bundling**: esbuild (recommended — faster) or webpack (mature ecosystem)
- **Testing**: `@vscode/test-electron` + Mocha (official VS Code testing framework)
- **Linting**: ESLint with `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin`
- **Formatting**: Prettier
- **Publishing**: `@vscode/vsce` (VS Code Extension CLI)

### Dependencies

**Core Dependencies** (minimal)
- `@types/vscode` — VS Code API types (version must match `engines.vscode`)
- `@types/node` — Node.js API types

**Dev Dependencies**
- `typescript`
- `@vscode/test-electron`
- `eslint`, `@typescript-eslint/*`
- `prettier`
- `@vscode/vsce`
- `esbuild` or `webpack`

**Keep lightweight** — Extensions run in shared extension host process.

### Cross-Platform Constraints

**System Hosts File Paths**
- **Windows**: `C:\Windows\System32\drivers\etc\hosts`
- **macOS**: `/etc/hosts`
- **Linux**: `/etc/hosts`

**Path Resolution**
- Use `path.join()` / `path.resolve()` for cross-platform paths
- Use `os.platform()` to detect: `'win32'`, `'darwin'`, `'linux'`
- Use `os.homedir()` for `~/.host/` directory

**Line Endings**
- Windows: CRLF (`\r\n`)
- macOS/Linux: LF (`\n`)
- **Must preserve existing line endings** when modifying system hosts file
- Use `os.EOL` for platform-appropriate line endings

### Security & Permissions

**Critical Constraint: Elevated Access Required**
- **All platforms require administrator/root access** to modify system hosts file
- Reading may work without elevation on some systems
- **Writing always requires elevation**

**VS Code Extension Sandbox Limitations**
- Extensions run in Node.js but **cannot directly access elevated permissions**
- No built-in elevation API in VS Code
- Cannot prompt for admin/sudo password directly

**Recommended Strategy (D4 Implementation)**
1. **Allow profile management (CRUD) without elevated permissions** — users can edit `.host` files freely
2. **Pre-check permissions on first sync attempt** — detect EACCES error
3. **Show platform-specific helpful instructions** when permission denied:
   - Windows: "Run VS Code as Administrator" or PowerShell elevation command
   - macOS/Linux: `sudo` command guidance
4. **Visual indicator in UI** showing sync status (synced ✓ / needs permissions ⚠️)
5. **Never store or execute elevated operations automatically**

**Best Practices**
- Validate hosts file syntax before any write
- Back up system hosts file before first modification
- Write to temp file, then attempt atomic move/overwrite
- Clear error messages with actionable recovery steps

---

## External Research (Deferred)

No external library integration required — uses only VS Code API and Node.js built-ins (`fs`, `path`, `os`).

---

## Key Takeaways

1. **Greenfield project** — No existing code to integrate with
2. **Minimal dependencies** — Only VS Code API types + Node.js standard library
3. **Permission handling is the primary technical challenge** — Cannot bypass OS security model
4. **TreeView pattern is well-established** — Many reference implementations available
5. **Cross-platform support requires careful path handling** — Use Node.js `path` and `os` modules
6. **Line ending preservation is critical** — System hosts file must maintain platform conventions
7. **Standard VS Code extension structure applies** — Use established patterns for TreeView + commands
