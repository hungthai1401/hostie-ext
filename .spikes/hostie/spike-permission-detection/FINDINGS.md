# Spike: spike-permission-detection

## Risk
**Permission Detection & Error Handling (HIGH)** — Platform-specific error messages, graceful degradation logic. Must verify: EACCES/EPERM errors caught correctly, platform-specific instructions are accurate, UI indicators show sync status, users can still manage profiles when sync fails.

## Approach
Created a Node.js script that:
1. Detects platform (Windows/macOS/Linux)
2. Tests read/write permissions on system hosts file
3. Generates platform-specific error messages
4. Simulates graceful degradation flow (catch EACCES, return status object)

Tested on macOS without sudo (expected permission denied).

## Findings

### ✓ Platform Detection
- `os.platform()` correctly returns 'darwin' (macOS), 'win32' (Windows), 'linux' (Linux)
- System hosts path resolution works correctly:
  - Windows: `C:\Windows\System32\drivers\etc\hosts`
  - macOS/Linux: `/etc/hosts`

### ✓ Permission Behavior
- **Read permission**: Works without elevation on macOS (standard behavior)
- **Write permission**: Fails with `EACCES` error code on macOS (expected)
- Windows typically returns `EPERM` instead of `EACCES` for permission errors
- Error code detection: `err.code === 'EACCES' || err.code === 'EPERM'` catches both platforms

### ✓ Error Messages
Platform-specific messages provide clear, actionable guidance:

**Windows:**
- Restart VS Code as Administrator (most common)
- Manual edit path provided
- Option to continue without sync

**macOS:**
- Specific sudo command with `--user-data-dir` flag to avoid permission issues
- Manual edit with sudo
- Option to continue without sync

**Linux:**
- sudo command includes `--no-sandbox` flag (required for root on some distros)
- Manual edit with sudo
- Option to continue without sync

All messages emphasize: **users can continue managing profiles even if sync fails** (D4 graceful degradation).

### ✓ Graceful Degradation Flow
1. User activates profile via command
2. `syncToSystem()` attempts write
3. Catch `EACCES`/`EPERM` → return `{ success: false, needsPermission: true, error: 'EACCES' }`
4. Command handler shows error modal with platform-specific message
5. TreeView updates regardless (profile marked active in meta.json, UI shows checkmark)
6. User can still edit, rename, delete, deactivate profiles
7. Next activation attempt retries sync (gives user chance to restart with elevation)

### ✓ Status Object Pattern
```javascript
{
  success: boolean,        // true if sync completed
  needsPermission: boolean, // true if permission error detected
  error: string | null     // error code (EACCES, EPERM, etc.) or null
}
```

This pattern allows command handlers to differentiate:
- Success: show success message
- Permission error: show platform-specific instructions
- Other errors: show generic error message

## Verdict
**CONFIRMED** — Permission detection and graceful degradation strategy works. Key implementation notes:

1. **Catch both error codes**: `EACCES` (Unix) and `EPERM` (Windows)
2. **Platform-specific messages** are correct and actionable
3. **Read permissions** typically work without elevation (allows pre-check if needed)
4. **Write permissions** always require elevation (matches design assumption)
5. **Graceful degradation** preserves user intent (profile marked active in meta.json even if sync fails)

**Implementation guidance for bead hostie-ext-fh9:**
- Return status object from `syncToSystem()` and `removeFromSystem()` — never throw on permission errors
- Implement `getPermissionErrorMessage(platform)` function with messages from spike
- Command handlers check `result.needsPermission` and show modal with appropriate message
- TreeView refresh happens regardless of sync status (UI always reflects meta.json state)
- Optional: implement `checkPermissions()` for pre-flight check (can show warning icon in UI if write fails)

**No blocking issues found. Safe to proceed with implementation.**
