# Hostie — Design

**Feature slug:** hostie
**Date:** 2026-06-02
**Brainstorming session:** complete
**Scope:** Standard

---

## Feature Boundary

A VS Code extension for managing multiple system hosts file configurations. Users can create, edit, and organize host profiles in `~/.host/` directory, then activate/deactivate them to sync with the system hosts file. This is a clean-slate TypeScript rewrite inspired by mingjiezhou/live-host, focusing exclusively on host management (excluding the GitHub IP fetcher feature from the source).

**Domain type(s):** SEE + ORGANIZE

---

## Locked Decisions

### Extension Identity & Branding
- **D1**: Extension name is "Hostie" — friendly, memorable branding that clearly conveys purpose
  *Rationale: Professional yet approachable name for marketplace discoverability*

### Feature Scope
- **D2**: Full feature parity with live-host's host manager — all CRUD operations included (add, rename, delete, activate, deactivate)
  *Rationale: Complete host management workflow without feature gaps*

### User Experience & Feedback
- **D3**: Enhanced user feedback with polished design:
  - Success operations: subtle checkmark notifications or status bar updates
  - Errors: proper error dialogs with clear messaging
  - Destructive actions (delete): confirmation dialogs to prevent accidents
  - Visual polish: smooth tree updates, proper icons, loading states
  *Rationale: User requested "fancy design" — polish beyond the source implementation*

### Permission Handling
- **D4**: Intelligent permission handling with graceful degradation:
  - Pre-check permissions on first sync attempt
  - Show platform-specific helpful instructions when permission issues detected
  - Allow users to manage `.host` files even without system permissions (edit/organize profiles)
  - Clear visual indicator showing sync status (synced / needs elevated permissions)
  *Rationale: System hosts modification requires elevated permissions; extension should remain useful even without them*

### File Organization
- **D5**: Keep same structure as live-host — `~/.host/` directory with `.host` file extensions and `meta.json` for tracking active configs
  *Rationale: Maintains compatibility if users have existing live-host setups or want to migrate*

### Implementation Approach
- **D6**: Clean-slate TypeScript rewrite using modern VS Code extension patterns
  *Rationale: Source has technical debt (@ts-nocheck, mixed patterns); fresh implementation delivers maintainable, polished extension aligned with "fancy design" goal*

### Agent's Discretion
- Icon design and visual assets during implementation — constraint: professional appearance consistent with VS Code marketplace standards
- Specific wording for error messages — constraint: clear, actionable, platform-appropriate
- Loading/transition animations — constraint: subtle, non-distracting, enhance perceived performance

---

## Specific Ideas & References

**Source reference:** https://github.com/mingjiezhou/live-host
- Reference for behavior understanding only
- Do NOT copy code directly — clean rewrite

**Visual inspiration:**
- VS Code's built-in TreeView patterns (Explorer, Extensions sidebar)
- Checkbox/checkmark pattern for active/inactive state (similar to VS Code's SCM decorations)

---

## Existing Code Context

This is a new project in an empty repository. No existing codebase to integrate with.

### Extension Structure to Create
- `src/extension.ts` — Entry point, activation, command registration
- `src/hostManager.ts` — Core business logic service
- `src/treeDataProvider.ts` — VS Code TreeView data provider
- `src/fileUtils.ts` — Cross-platform file system utilities
- `src/types.ts` — TypeScript interfaces and types
- `package.json` — VS Code extension manifest

### VS Code APIs to Use
- `vscode.window.registerTreeDataProvider` — TreeView registration
- `vscode.commands.registerCommand` — Command registration
- `vscode.window.showInformationMessage/showErrorMessage` — User feedback
- `vscode.window.showInputBox` — Name input for add/rename
- `vscode.workspace.openTextDocument` — Open `.host` files for editing
- `vscode.workspace.onDidSaveTextDocument` — Auto-sync on save
- `vscode.TreeDataProvider` interface — TreeView data source

---

## Outstanding Questions

### Resolve Before Planning
*None — all product decisions locked*

### Deferred to Planning
- [ ] Should status bar item be persistent or only show during operations? — UX research during implementation
- [ ] Exact syntax highlighting rules for `.host` files — research TextMate grammar during implementation
- [ ] Backup strategy details (location, retention, cleanup) — technical design during planning
- [ ] Should file watcher watch only `~/.host/` or also system hosts file? — performance consideration during planning

---

## Deferred Ideas

- Syntax highlighting for `.host` files (TextMate grammar) — nice-to-have enhancement for future version
- Import/export profiles as `.zip` or `.tar.gz` — sharing/backup feature for v2
- Cloud sync for profiles across machines — advanced feature requiring backend
- Templates for common host configurations (localhost dev, staging, production) — productivity feature for future
- Diff view showing what will change in system hosts before sync — safety feature for v2
- GitHub IP fetcher (from original live-host) — explicitly out of scope per user request

---

## Handoff Note

design.md is the single source of truth for this feature.

- **writing-plans** reads: locked decisions, deferred-to-planning questions
- **validating** reads: locked decisions (to verify plan coverage)
- **executing-plans** reads: locked decisions (to honor during implementation)
- **reviewing** reads: locked decisions (for UAT verification)

Decision IDs (D1, D2, D3, D4, D5, D6) are stable. Reference them by ID in all downstream artifacts.
