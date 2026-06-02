import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { detectLineEnding, readFilePreservingLineEndings, writeFilePreservingLineEndings, ensureDirectoryExists } from '../../utils/fileSystem';

suite('FileSystem Utils Test Suite', () => {
  let testDir: string;

  setup(async () => {
    testDir = path.join(os.tmpdir(), `hostie-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  teardown(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  suite('detectLineEnding', () => {
    test('detects LF in pure LF content', () => {
      const content = 'line1\nline2\nline3';
      assert.strictEqual(detectLineEnding(content), '\n');
    });

    test('detects CRLF in pure CRLF content', () => {
      const content = 'line1\r\nline2\r\nline3';
      assert.strictEqual(detectLineEnding(content), '\r\n');
    });

    test('detects CRLF in mixed line ending content (CRLF takes precedence)', () => {
      const content = 'line1\nline2\r\nline3';
      assert.strictEqual(detectLineEnding(content), '\r\n');
    });

    test('defaults to LF for content without line endings', () => {
      const content = 'single line';
      assert.strictEqual(detectLineEnding(content), '\n');
    });
  });

  suite('readFilePreservingLineEndings', () => {
    test('returns empty content with platform default for ENOENT', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.txt');
      const result = await readFilePreservingLineEndings(nonExistentPath);
      
      assert.strictEqual(result.content, '');
      assert.strictEqual(result.lineEnding, os.EOL);
    });

    test('reads file and detects LF line endings', async () => {
      const testFile = path.join(testDir, 'test-lf.txt');
      await fs.writeFile(testFile, 'line1\nline2\nline3', 'utf8');
      
      const result = await readFilePreservingLineEndings(testFile);
      
      assert.strictEqual(result.content, 'line1\nline2\nline3');
      assert.strictEqual(result.lineEnding, '\n');
    });

    test('reads file and detects CRLF line endings', async () => {
      const testFile = path.join(testDir, 'test-crlf.txt');
      await fs.writeFile(testFile, 'line1\r\nline2\r\nline3', 'utf8');
      
      const result = await readFilePreservingLineEndings(testFile);
      
      assert.strictEqual(result.content, 'line1\r\nline2\r\nline3');
      assert.strictEqual(result.lineEnding, '\r\n');
    });
  });

  suite('writeFilePreservingLineEndings', () => {
    test('writes file with specified line endings (LF)', async () => {
      const testFile = path.join(testDir, 'write-lf.txt');
      const content = 'line1\nline2\nline3';
      
      await writeFilePreservingLineEndings(testFile, content, '\n');
      
      const written = await fs.readFile(testFile, 'utf8');
      assert.strictEqual(written, 'line1\nline2\nline3');
    });

    test('writes file with specified line endings (CRLF)', async () => {
      const testFile = path.join(testDir, 'write-crlf.txt');
      const content = 'line1\nline2\nline3';
      
      await writeFilePreservingLineEndings(testFile, content, '\r\n');
      
      const written = await fs.readFile(testFile, 'utf8');
      assert.strictEqual(written, 'line1\r\nline2\r\nline3');
    });

    test('normalizes mixed line endings to target format', async () => {
      const testFile = path.join(testDir, 'normalize.txt');
      const content = 'line1\nline2\r\nline3';
      
      await writeFilePreservingLineEndings(testFile, content, '\n');
      
      const written = await fs.readFile(testFile, 'utf8');
      assert.strictEqual(written, 'line1\nline2\nline3');
    });
  });

  suite('ensureDirectoryExists', () => {
    test('creates directory if it does not exist', async () => {
      const newDir = path.join(testDir, 'new-directory');
      
      await ensureDirectoryExists(newDir);
      
      const stats = await fs.stat(newDir);
      assert.strictEqual(stats.isDirectory(), true);
    });

    test('succeeds silently if directory already exists', async () => {
      const existingDir = path.join(testDir, 'existing');
      await fs.mkdir(existingDir);
      
      // Should not throw
      await ensureDirectoryExists(existingDir);
      
      const stats = await fs.stat(existingDir);
      assert.strictEqual(stats.isDirectory(), true);
    });

    test('creates nested directories recursively', async () => {
      const nestedDir = path.join(testDir, 'parent', 'child', 'grandchild');
      
      await ensureDirectoryExists(nestedDir);
      
      const stats = await fs.stat(nestedDir);
      assert.strictEqual(stats.isDirectory(), true);
    });
  });
});
