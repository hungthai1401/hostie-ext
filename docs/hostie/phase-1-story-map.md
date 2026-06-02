# Story Map: Hostie

---

## Plan

Enable VS Code users to manage multiple system hosts file configurations through a graphical TreeView interface.

---

## Phase: Phase 1 — Core Extension

Deliver the complete Hostie extension with CRUD operations, TreeView UI, and system hosts synchronization.

---

### Story: Foundation & Project Setup

**Purpose:** Establish the project structure, build tooling, and type definitions that all other code depends on.

**Why Now:** Must exist before any implementation code can be written or compiled.

**Contributes To:** "Extension installs and activates in VS Code without errors", "All TypeScript code compiles without errors"

**Creates:** Extension manifest, TypeScript configuration, type definitions, constants, build pipeline

**Unlocks:** All subsequent implementation work

**Done Looks Like:** Running `npm run compile` succeeds and produces `out/extension.js`.

**Beads:**

| Bead ID | Title | Notes |
|---------|-------|-------|
| `hostie-ext-ovw` | Set up extension project structure with package.json manifest | Includes viewsContainers, views, commands, menus |
| `hostie-ext-hby` | Configure TypeScript, ESLint, and build tooling | tsconfig.json, .eslintrc, compile script |
| `hostie-ext-uj8` | Define TypeScript interfaces and constants | types.ts (HostProfile, MetaData, SyncStatus), constants.ts (paths, delimiters) |

---

### Story: Platform Utilities

**Purpose:** Provide cross-platform path resolution and file system operations that services depend on.

**Why Now:** Services layer (next story) needs these utilities to handle platform differences.

**Contributes To:** "System hosts file preserves existing content and line endings", cross-platform functionality

**Creates:** Reusable platform detection and file utilities

**Unlocks:** Profile management and hosts sync implementation

**Done Looks Like:** Unit tests pass for path resolution on all platforms and line ending detection works correctly.

**Beads:**

| Bead ID | Title | Notes |
|---------|-------|-------|
| `hostie-ext-t9r` | Implement platform detection and system hosts path resolution | platform.ts: detect OS, return correct hosts file path |
| `hostie-ext-eqm` | Implement file system utilities with line ending preservation | fileSystem.ts: read/write with line ending detection |

---

### Story: Profile Management

**Purpose:** Users can create, read, rename, and delete host profiles stored in `~/.host/`.

**Why Now:** Core CRUD functionality must exist before UI can display or interact with profiles.

**Contributes To:** "Users can create new host profiles", "Users can rename existing profiles", "Users can delete profiles (with confirmation dialog)"

**Creates:** ProfileManager service, meta.json management

**Unlocks:** TreeView data source, command handlers

**Done Looks Like:** Calling `profileManager.createProfile("dev")` creates `~/.host/dev.host` and updates `meta.json`.

**Beads:**

| Bead ID | Title | Notes |
|---------|-------|-------|
| `hostie-ext-pra` | Implement ProfileManager service with CRUD operations | profileManager.ts: create, read, rename, delete, list profiles |
| `hostie-ext-k4m` | Implement meta.json persistence for active profile tracking | Load/save active profile list in meta.json |

---

### Story: System Hosts Synchronization

**Purpose:** Active profiles sync to the system hosts file with proper error handling and permission detection.

**Why Now:** Sync logic must be separate from UI so it can be tested independently and handle errors gracefully.

**Contributes To:** "Users can activate profiles (profile syncs to system hosts if permissions allow)", "Users can deactivate profiles (profile removed from system hosts)", "Permission errors show platform-specific helpful messages", "System hosts file preserves existing content and line endings"

**Creates:** HostsSync service with permission detection

**Unlocks:** Activate/deactivate command handlers

**Done Looks Like:** Activating a profile updates system hosts with delimiter-wrapped content; permission errors return clear error codes.

**Beads:**

| Bead ID | Title | Notes |
|---------|-------|-------|
| `hostie-ext-c7a` | Implement hosts file sync with delimiter format | hostsSync.ts: read system hosts, strip old sections, append active profiles |
| `hostie-ext-fh9` | Implement permission detection and error handling | Catch EACCES, return status codes, provide platform-specific error messages |

---

### Story: TreeView Display

**Purpose:** Users see their host profiles in a VS Code TreeView with visual state indicators (checkmarks for active profiles).

**Why Now:** UI display layer must exist before users can interact with profiles visually.

**Contributes To:** "TreeView 'Host Profiles' appears in Activity Bar with custom Hostie icon", "TreeView auto-refreshes when `.host` files change externally"

**Creates:** ProfileTreeProvider, file watcher integration

**Unlocks:** Command UI integration (context menus, inline actions)

**Done Looks Like:** Opening VS Code shows Hostie in Activity Bar; clicking it displays all profiles with correct active/inactive icons.

**Beads:**

| Bead ID | Title | Notes |
|---------|-------|-------|
| `hostie-ext-lrl` | Implement ProfileTreeProvider with EventEmitter refresh | profileTreeProvider.ts: TreeDataProvider interface, onDidChangeTreeData |
| `hostie-ext-mqa` | Integrate file watcher for auto-refresh on external changes | Watch ~/.host/*.host files, trigger provider.refresh() |

---

### Story: User Commands

**Purpose:** Users can trigger all operations (create, rename, delete, activate, deactivate, edit) via commands and context menus.

**Why Now:** Commands wire together services and UI, completing the user interaction flow.

**Contributes To:** All exit-state clauses related to user actions (create, rename, delete, activate, deactivate, edit)

**Creates:** Command handlers, UI feedback (success messages, error dialogs, confirmation dialogs)

**Unlocks:** Full extension functionality, marketplace readiness

**Done Looks Like:** Right-clicking a profile shows context menu with all operations; each operation completes with appropriate user feedback.

**Beads:**

| Bead ID | Title | Notes |
|---------|-------|-------|
| `hostie-ext-khb` | Implement create, rename, delete command handlers | profileCommands.ts: input boxes, confirmation dialogs, call services, refresh tree |
| `hostie-ext-s9l` | Implement activate and deactivate command handlers | Call hostsSync.syncToSystem(), handle permission errors, update UI |
| `hostie-ext-ucb` | Implement edit profile command | Open .host file in VS Code editor |

---

### Story: Extension Activation

**Purpose:** Extension activates correctly in VS Code and wires all components together.

**Why Now:** Entry point must be implemented last after all components exist.

**Contributes To:** "Extension installs and activates in VS Code without errors"

**Creates:** Complete working extension

**Unlocks:** Local testing, packaging

**Done Looks Like:** Pressing F5 in VS Code Extension Development Host launches Hostie with full functionality.

**Beads:**

| Bead ID | Title | Notes |
|---------|-------|-------|
| `hostie-ext-a56` | Implement extension.ts entry point with activate/deactivate | Register tree view, commands, file watchers; add to subscriptions |

---

### Story: Documentation & Assets

**Purpose:** Extension has professional branding and user-facing documentation for marketplace publication.

**Why Now:** Can be done in parallel with implementation; required for packaging and publishing.

**Contributes To:** "Extension can be packaged with `vsce package` successfully", "README.md documents all features with usage examples"

**Creates:** README, icon, CHANGELOG, LICENSE

**Unlocks:** VS Code Marketplace submission

**Done Looks Like:** README shows screenshots and usage examples; running `vsce package` produces .vsix file without warnings.

**Beads:**

| Bead ID | Title | Notes |
|---------|-------|-------|
| `hostie-ext-fw5` | Create extension icon and README with usage examples | 128x128 icon, README with screenshots and feature list |
| `hostie-ext-dpw` | Add CHANGELOG and LICENSE files | MIT license, initial 0.1.0 changelog |

---

## Story Map Validation

✓ Every story maps to ≥1 bead  
✓ Stories are ordered with clear dependencies  
✓ Every story contributes to at least one exit-state clause  
✓ Union of all stories covers the entire exit state  
✓ Story 1 (Foundation) has clear "first" rationale — must exist before code can compile
