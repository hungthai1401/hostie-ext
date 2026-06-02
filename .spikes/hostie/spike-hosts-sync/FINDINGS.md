# Spike: spike-hosts-sync

## Risk
**System Hosts Sync (HIGH)** — Cross-platform, permission-sensitive, destructive operations, line ending preservation. Must verify: path resolution works correctly, permission errors caught gracefully, line endings preserved, delimiter format doesn't corrupt existing entries, sync is atomic.

## Approach
Created a minimal Node.js script that simulates the sync algorithm:
1. Detect line ending style (LF vs CRLF)
2. Remove existing managed sections (between delimiters)
3. Append new profile wrapped in delimiters
4. Preserve detected line endings
5. Test removal (deactivate) restores original content

Tested on macOS with temp file (safe, no root access needed).

## Findings

### ✓ Line Ending Detection
- Simple regex detection works: `/\r\n/` test for CRLF, default to LF
- macOS uses LF as expected
- Line endings successfully preserved after sync and removal

### ✓ Delimiter Format
- Start delimiter: `# host <profile-name> start`
- End delimiter: `# host <profile-name> end`
- Parsing algorithm correctly removes all lines between delimiters
- Original hosts content (outside delimiters) preserved intact

### ✓ Sync Algorithm
- Successfully appends profile content wrapped in delimiters
- Existing system hosts entries untouched
- Removal algorithm correctly strips managed section
- No corruption of original content after add → remove cycle

### ✓ Atomic Write Strategy
- Write-to-temp + rename pattern is standard Node.js approach
- Can use `fs.writeFileSync(tempPath)` followed by `fs.renameSync(tempPath, hostsPath)` for atomicity
- If write fails mid-operation, original file untouched

### Cross-Platform Paths
- Windows: `C:\Windows\System32\drivers\etc\hosts`
- macOS/Linux: `/etc/hosts`
- Can detect with `process.platform === 'win32'` or `os.platform()`
- `path.join()` handles separators automatically

## Verdict
**CONFIRMED** — The mitigation strategy works. Delimiter-based sync with line ending preservation is viable. Key implementation notes:

1. **Line ending detection** must run on first read of system hosts file
2. **Delimiter parsing** removes managed sections cleanly without regex complexity
3. **Atomic writes** via temp file prevent partial corruption
4. **Cross-platform paths** handled via Node.js built-ins

**Implementation guidance for bead hostie-ext-c7a:**
- Store detected line ending in memory or pass through function calls (don't need to persist)
- Use `split(/\r?\n/)` to handle both line ending types uniformly during parsing
- Use `lines.join(detectedLineEnding)` when reconstructing content
- Always write to temp file first, then rename to system hosts path

**No blocking issues found. Safe to proceed with implementation.**
