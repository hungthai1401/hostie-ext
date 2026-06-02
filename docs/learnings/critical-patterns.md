# Critical Patterns

Lessons learned from features that are critical enough to shape future implementations. These patterns prevent significant mistakes and apply broadly across features.

---

## Atomic writes for system-critical files (from hostie, 2026-06-02)

When writing files that OS services or concurrent processes read (e.g., `/etc/hosts`, systemd configs, daemon configs), always use temp file + atomic rename. Direct writes expose readers to half-written state. The atomic rename ensures readers see either old or new content, never partial data. Pattern: `fs.writeFileSync(tempPath, content); fs.renameSync(tempPath, targetPath);`

## Line ending preservation in text file manipulation (from hostie, 2026-06-02)

Detect original line ending style on read (`\r\n` vs `\n`), preserve it on write. Default to `os.EOL` only for new files. Mixed line endings break parsing in legacy tools and violate user expectations. Hosts files, shell scripts, and config files must preserve original format. Pattern: detect with regex `/\r\n/`, split with `content.split(detectedLineEnding)`, rejoin with same delimiter.

## Permission degradation for cross-platform file access (from hostie, 2026-06-02)

When optional root access is needed, attempt the privileged operation first. On `EACCES`/`EPERM`, fall back to user-editable copy and display clear platform-specific instructions (sudo on Unix, "Run as Administrator" on Windows). Never require elevation upfront in IDE extensions or CLI tools—it breaks UX. Keep core functionality usable even when privileged operations fail. Pattern: try-catch with status object `{success, needsPermission, error}`, never throw.

## Delimiter-based parsing requires strict validation (from hostie, 2026-06-02)

When managing sections within user-editable config files using delimiters (e.g., `# host <name> start` / `# host <name> end`), validate both start and end markers exist before any write. Use exact regex patterns, not substring checks—weak matching risks deleting user content outside the managed section. Pattern: compile delimiter regex (`/^# host .+ start$/`), validate structure before mutation, fail fast if malformed.

## Test coverage priority: External I/O and permission boundaries (from hostie, 2026-06-02)

Prioritize unit tests for code that touches file system, network, or requires privilege escalation. These boundaries have the highest risk for data loss, corruption, or security issues. Mock I/O operations and verify all error paths (`EACCES`, `ENOENT`, `EROFS`, `ETIMEDOUT`). Pure business logic is lower priority. Pattern: test file operations first with mocked fs, then integration tests with temp directories.
