# Approach: Hostie

**Date**: 2026-06-02
**Feature**: hostie
**Based on**:
- `docs/hostie/discovery.md`
- `docs/hostie/design.md`

---

## 1. Gap Analysis

> What exists vs. what the feature requires.

| Component | Have | Need | Gap Size |
|-----------|------|------|----------|
| Extension Manifest | None | package.json with contributions (viewsContainers, views, commands, menus) | New |
| TypeScript Config | None | tsconfig.json, ESLint, Prettier setup | New |
| Entry Point | None | src/extension.ts with activate/deactivate | New |
| TreeView Provider | None | ProfileTreeProvider implementing TreeDataProvider | New |
| Profile Manager Service | None | CRUD operations on ~/.host/*.host files | New |
| System Hosts Sync | None | Read/write system hosts file with platform detection | New |
| File Utilities | None | Cross-platform path resolution, permission detection | New |
| Type Definitions | None | HostProfile, MetaData interfaces | New |
| Icons & Assets | None | Extension icon, TreeView icons | New |
| Documentation | None | README.md with features, usage, screenshots | New |
| Tests | None | Unit tests for services, integration tests for commands | New |

---

## 2. Recommended Approach

Build a layered architecture with clear separation: **Platform layer** (file utilities, platform detection) → **Domain layer** (profile management, hosts sync logic) → **Application layer** (TreeView provider) → **Presentation layer** (VS Code commands and UI integration). Start with the platform utilities and type definitions, then build domain services, then wire up the TreeView and commands. This bottom-up approach allows testing each layer independently before integration.

### Why This Approach

- **Layered architecture is standard for VS Code extensions** — discovered in pattern search (GitLens, Project Manager follow this structure)
- **Honors locked decision D6** — clean-slate TypeScript rewrite with modern patterns, avoiding source code's technical debt
- **Honors locked decision D4** — permission handling isolated in platform layer, allowing graceful degradation when sync fails
- **Testable** — domain logic (profile CRUD, hosts sync) can be unit tested without VS Code API mocks

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| File structure storage | `~/.host/` directory with `.host` text files, `meta.json` for active profiles | D5: maintains compatibility with live-host |
| Permission handling strategy | Try sync, catch EACCES, show platform-specific instructions | D4: graceful degradation without breaking profile editing |
| TreeView refresh pattern | EventEmitter + file watcher | Discovered pattern (NPM Scripts, Project Manager) — auto-refresh on external changes |
| Line ending preservation | Detect system hosts line endings on first read, preserve on write | Cross-platform constraint — system file must maintain platform conventions |
| Icon strategy | VS Code ThemeIcon ('check', 'circle-outline') | Respects user themes, no custom assets needed for core functionality |
| Error feedback | Modal dialogs for errors, information messages for success | D3: enhanced feedback with clear messaging |

---

## 3. Alternatives Considered

### Option A: In-Memory State Management

- **Description**: Keep active profile state in `context.globalState` instead of `meta.json`
- **Why considered**: VS Code provides built-in state persistence
- **Why rejected**: Breaks compatibility with live-host (D5), harder to debug (state hidden in VS Code storage), prevents external tools from reading active profiles

### Option B: Single-File Approach

- **Description**: Store all profiles in one JSON file instead of separate `.host` files
- **Why considered**: Simpler file management, atomic operations
- **Why rejected**: Violates D5 (maintain live-host file structure), users can't easily edit profiles with standard text editors, loses per-file versioning

### Option C: Workspace-Scoped Profiles

- **Description**: Store profiles in `.vscode/` per workspace instead of global `~/.host/`
- **Why considered**: Per-project host configurations
- **Why rejected**: D5 requires `~/.host/` structure, system hosts file is global (not workspace-scoped), increases complexity for common use case (same profiles across projects)

---

## 4. Risk Map

> Every component that is part of this feature must appear here.

| Component | Risk Level | Reason | Verification Needed |
|-----------|------------|--------|---------------------|
| Extension Manifest (package.json) | **LOW** | Standard VS Code extension structure, well-documented | Proceed |
| TypeScript Setup | **LOW** | Standard TypeScript config, tooling is mature | Proceed |
| Entry Point (extension.ts) | **LOW** | Follows VS Code activation pattern exactly | Proceed |
| Type Definitions | **LOW** | Simple interfaces (HostProfile, MetaData) | Proceed |
| File Utilities (platform detection, path resolution) | **LOW** | Node.js built-ins (`os`, `path`), common pattern | Proceed |
| Profile Manager Service (CRUD on .host files) | **MEDIUM** | New implementation but straightforward file I/O | Basic smoke test recommended |
| TreeView Provider | **MEDIUM** | Implements standard TreeDataProvider interface, but needs correct refresh logic | Test refresh scenarios |
| System Hosts Sync | **HIGH** | Cross-platform, permission-sensitive, destructive operations, line ending preservation | Spike required (validating) |
| Permission Detection & Error Handling | **HIGH** | Platform-specific error messages, graceful degradation logic | Spike required (validating) |
| File Watcher Integration | **MEDIUM** | Standard pattern but must trigger correct refresh behavior | Test external file changes |
| Command Handlers | **LOW** | Thin wrappers around service methods | Proceed |
| Icons & Branding | **LOW** | Agent's discretion, using ThemeIcons | Proceed |

### Risk Classification Reference

```
Pattern in codebase?        -> YES = LOW base
External dependency?        -> YES = HIGH
Blast radius > 5 files?    -> YES = HIGH
Otherwise                   -> MEDIUM
```

### HIGH-Risk Summary (for validating skill)

- **System Hosts Sync**: Must verify cross-platform path resolution works correctly, permission errors are caught and handled gracefully, line endings are preserved, delimiter format doesn't corrupt existing hosts entries, sync is atomic (no partial writes)
- **Permission Detection & Error Handling**: Must verify platform-specific error messages are correct, UI indicators show sync status accurately, users can still manage profiles when sync fails

---

## 5. Proposed File Structure

```
hostie-ext/
  src/
    extension.ts                 # Entry point: activate/deactivate, register providers & commands
    constants.ts                 # Paths, defaults, error messages, delimiter format
    models/
      types.ts                   # HostProfile, MetaData, SyncStatus interfaces
    utils/
      platform.ts                # os.platform() detection, system hosts path resolution
      fileSystem.ts              # Read/write with error handling, line ending detection
    services/
      profileManager.ts          # CRUD for ~/.host/*.host files, meta.json management
      hostsSync.ts               # Sync active profiles to system hosts, permission checking
    providers/
      profileTreeProvider.ts     # TreeDataProvider implementation, EventEmitter refresh
    commands/
      profileCommands.ts         # Command handlers (add, rename, delete, activate, etc.)
  resources/
    icon.png                     # Extension icon (128x128)
  out/                           # Compiled JS (generated)
  package.json                   # Extension manifest
  tsconfig.json                  # TypeScript config
  .eslintrc.json                 # ESLint config
  .prettierrc.json               # Prettier config
  README.md                      # User documentation
  CHANGELOG.md                   # Version history
  LICENSE                        # License file
```

---

## 6. Dependency Order

```
Layer 1 (parallel): Types, Constants, Platform Utils, FileSystem Utils
Layer 2 (parallel): ProfileManager, HostsSync (both depend on Layer 1)
Layer 3 (sequential): ProfileTreeProvider (depends on ProfileManager)
Layer 4 (sequential): Command Handlers (depend on ProfileManager, HostsSync, TreeProvider)
Layer 5 (sequential): Extension Entry Point (wires everything together)
```

### Parallelizable Groups

- **Group A (Foundation)**: `types.ts`, `constants.ts`, `platform.ts`, `fileSystem.ts` — no dependencies between them
- **Group B (Services)**: `profileManager.ts`, `hostsSync.ts` — both depend on Group A, no dependencies between them
- **Group C (Provider)**: `profileTreeProvider.ts` — depends on `profileManager.ts` from Group B
- **Group D (Commands)**: `profileCommands.ts` — depends on Group B and Group C
- **Group E (Entry)**: `extension.ts` — depends on all above, last to implement
- **Group F (Manifest & Config)**: `package.json`, `tsconfig.json`, linting configs — can be done early or in parallel with Group A

---

## 7. Institutional Learnings Applied

> From Phase 0 — how past learnings shaped this approach.

No prior institutional learnings relevant to this feature — this is the first feature in the repository.

---

## 8. Open Questions for Validating

- [ ] **Backup strategy**: Should we back up the system hosts file before first modification? If yes, where (same directory, ~/.host/backups/, temp directory), and what's the retention policy? *Matters for user trust and recovery from mistakes.*
- [ ] **Status bar item behavior**: Should the sync status indicator be persistent or only show during/after operations? *Affects UI clutter vs. discoverability.*
- [ ] **File watcher scope**: Watch only `~/.host/` or also system hosts file for external changes? *Performance vs. completeness trade-off.*

---

## Implementation Notes

### Permission Handling Flow (D4)

1. User activates a profile (TreeView context menu or command)
2. `hostsSync.syncToSystem()` attempts write to system hosts file
3. If `EACCES` error caught:
   - Update sync status to "Permission Required"
   - Show modal error with platform-specific instructions:
     - **Windows**: "Requires administrator access. Restart VS Code as Administrator or manually copy the configuration."
     - **macOS/Linux**: "Requires root access. Run: `sudo code` or manually edit /etc/hosts"
   - TreeView shows warning icon on profile
4. Profile remains marked active in `meta.json` (user intent preserved)
5. User can deactivate, edit, or manage other profiles without errors
6. Retry sync on next activation attempt

### Delimiter Format (D5 compatibility)

```
# host <profile-name> start
<profile contents>
# host <profile-name> end
```

Matches live-host format exactly. On sync:
1. Read system hosts file
2. Remove all sections between `# host * start` and `# host * end` delimiters
3. Append active profiles wrapped in delimiters
4. Write atomically (write to temp file, move/overwrite)

### Line Ending Preservation

1. First read of system hosts file: detect line ending style (LF or CRLF)
2. Store detected style in memory or `meta.json`
3. All subsequent writes preserve the detected style
4. If mixed line endings detected, default to platform EOL (`os.EOL`)
