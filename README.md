# Hostie

Manage multiple hosts file profiles with easy switching and visual status indicators.

## Features

- **Profile Management**: Create, rename, and delete hosts file profiles
- **Visual TreeView**: See all profiles at a glance with active status indicators
- **Quick Switching**: Activate or deactivate profiles with one click
- **System Sync**: Automatically sync active profiles to your system hosts file
- **Smart Permissions**: Graceful handling of admin/sudo requirements with clear guidance
- **Auto-Refresh**: File watchers automatically detect external changes
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Hostie"
4. Click Install

### From VSIX

1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions → Views and More Actions (⋯) → Install from VSIX...
4. Select the downloaded file

## Usage

### Creating a Profile

1. Click the **+** icon in the Hostie sidebar
2. Enter a profile name (e.g., "development", "staging")
3. Edit the profile by clicking the pencil icon or right-click → Edit
4. Add your host entries (e.g., `127.0.0.1 myapp.local`)

### Activating a Profile

1. Click the **play** icon (▶) next to an inactive profile
2. Or right-click the profile → Activate
3. The profile icon changes to a checkmark (✓) when active
4. Active profiles are automatically synced to your system hosts file

### Deactivating a Profile

1. Click the **stop** icon (■) next to an active profile
2. Or right-click the profile → Deactivate
3. The profile entries are removed from your system hosts file
4. The profile file is preserved in `~/.host/`

### Editing Profile Contents

1. Right-click a profile → Edit
2. Or click the profile and press Enter
3. Edit the hosts entries directly in VS Code
4. Changes sync automatically when the profile is active

### Managing Multiple Profiles

You can activate multiple profiles simultaneously. All active profiles are synced to the system hosts file with clear delimiters to prevent conflicts.

## Requirements

- VS Code 1.85.0 or higher
- Node.js 18+ (bundled with VS Code)

## Known Issues

### Permission Requirements

**Windows:**
- Modifying the hosts file requires Administrator privileges
- Run VS Code as Administrator, or manually apply changes to `C:\Windows\System32\drivers\etc\hosts`

**macOS / Linux:**
- Modifying the hosts file requires sudo access
- Either run VS Code with elevated permissions, or manually apply changes to `/etc/hosts`

**Graceful Handling:**
Hostie will detect permission issues and show clear instructions. You can continue managing profiles even without sync permissions - profiles are stored in `~/.host/` and remain accessible.

## Configuration

All profiles are stored in `~/.host/`:
- Profile files: `~/.host/<profile-name>.host`
- Active profiles tracking: `~/.host/meta.json`

## Contributing

Issues and pull requests are welcome! Please follow the existing code style and include tests for new features.

## License

MIT
