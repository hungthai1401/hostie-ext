# Change Log

All notable changes to the "Hostie" extension will be documented in this file.

## [0.1.0] - 2026-06-02

### Initial Release

#### Features
- **Profile Management**: Create, rename, and delete hosts file profiles
- **Visual TreeView**: Displays all profiles with active status indicators (checkmarks)
- **Quick Activation**: One-click activate/deactivate profiles from TreeView
- **System Hosts Sync**: Automatically syncs active profiles to system hosts file with delimiter markers
- **Smart Permission Handling**: Gracefully detects and handles admin/sudo requirements with platform-specific guidance
- **Auto-Refresh**: File watchers automatically update TreeView when profiles change externally
- **Profile Editing**: Open profiles directly in VS Code editor
- **Cross-Platform Support**: Works on Windows, macOS, and Linux with platform-specific paths

#### Technical
- TypeScript-based implementation with strict type checking
- Line ending preservation for system hosts file integrity
- Atomic file writes to prevent corruption
- Profile storage in `~/.host/` directory
- Active profile tracking via `meta.json`

#### Known Limitations
- System hosts file modification requires elevated permissions (Administrator on Windows, sudo on macOS/Linux)
- Profiles remain manageable even without sync permissions (graceful degradation)

### Future Enhancements
- Import/export profiles
- Profile templates
- Syntax highlighting for hosts entries
- Bulk operations
- Profile search/filter
