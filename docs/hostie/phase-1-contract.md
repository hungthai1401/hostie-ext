# Phase 1 Contract: Hostie

---

## Entry State

- Repository initialized with git
- Design decisions locked in `docs/hostie/design.md`
- Discovery and approach documents complete
- Node.js 18+ installed
- VS Code 1.85+ available for testing

---

## Exit State

- Extension installs and activates in VS Code without errors
- TreeView "Host Profiles" appears in Activity Bar with custom Hostie icon
- Users can create new host profiles (stored as `.host` files in `~/.host/`)
- Users can rename existing profiles
- Users can delete profiles (with confirmation dialog)
- Users can activate profiles (checkmark icon appears, profile syncs to system hosts if permissions allow)
- Users can deactivate profiles (checkmark icon disappears, profile removed from system hosts)
- Users can edit profiles in VS Code editor (click profile name)
- TreeView auto-refreshes when `.host` files change externally
- Permission errors show platform-specific helpful messages (Windows: "Run as Administrator", macOS/Linux: "Requires sudo")
- System hosts file preserves existing content and line endings
- All TypeScript code compiles without errors
- Extension can be packaged with `vsce package` successfully
- README.md documents all features with usage examples

---

## Demo Story

Open VS Code and click the Hostie icon in the Activity Bar. You see an empty "Host Profiles" tree initially. Click the "+" button in the toolbar to create a new profile called "dev". The profile appears in the tree with an empty checkbox icon. Click the profile name — it opens `~/.host/dev.host` in the editor. Add some host entries like `127.0.0.1 local.app`, save and close. Right-click the "dev" profile and select "Activate Profile". The checkbox icon changes to a checkmark, and (if you have permissions) your system hosts file now includes those entries wrapped in `# host dev start/end` delimiters. Open your browser and navigate to `local.app` — it resolves correctly. Back in VS Code, right-click and select "Deactivate Profile". The checkmark disappears, and the entries are removed from the system hosts file.

---

## Unlocks

- Users can manage multiple host configurations without manually editing system hosts file
- Developers can quickly switch between local/staging/production host mappings
- Extension is ready for VS Code Marketplace submission
- Future enhancements can build on the established architecture (syntax highlighting, import/export, templates)

---

## Pivot Signals

- VS Code API changes in a breaking way during development (check release notes, migrate if needed)
- System hosts file write operations fail on all platforms in testing (re-evaluate permission strategy)
- Cross-platform line ending preservation cannot be achieved reliably (consider per-platform handling or drop preservation requirement)
- Performance issues detected with file watchers on large `~/.host/` directories (>100 profiles) — throttle or debounce refresh
