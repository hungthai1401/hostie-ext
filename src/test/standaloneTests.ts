import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Import the functions to test
import { detectLineEnding, readFilePreservingLineEndings, writeFilePreservingLineEndings, ensureDirectoryExists } from '../utils/fileSystem';

async function runTests() {
  let testDir: string | undefined;
  let passed = 0;
  let failed = 0;

  console.log('Running FileSystem Tests...\n');

  try {
    // Setup
    testDir = path.join(os.tmpdir(), `hostie-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Test: detectLineEnding with LF
    try {
      const content = 'line1\nline2\nline3';
      const result = detectLineEnding(content);
      assert.strictEqual(result, '\n', 'Should detect LF');
      console.log('✓ detectLineEnding detects LF');
      passed++;
    } catch (e: any) {
      console.log('✗ detectLineEnding LF failed:', e.message);
      failed++;
    }

    // Test: detectLineEnding with CRLF
    try {
      const content = 'line1\r\nline2\r\nline3';
      const result = detectLineEnding(content);
      assert.strictEqual(result, '\r\n', 'Should detect CRLF');
      console.log('✓ detectLineEnding detects CRLF');
      passed++;
    } catch (e: any) {
      console.log('✗ detectLineEnding CRLF failed:', e.message);
      failed++;
    }

    // Test: detectLineEnding with mixed (CRLF precedence)
    try {
      const content = 'line1\nline2\r\nline3';
      const result = detectLineEnding(content);
      assert.strictEqual(result, '\r\n', 'Should detect CRLF in mixed content');
      console.log('✓ detectLineEnding handles mixed line endings');
      passed++;
    } catch (e: any) {
      console.log('✗ detectLineEnding mixed failed:', e.message);
      failed++;
    }

    // Test: readFilePreservingLineEndings with ENOENT
    try {
      const nonExistentPath = path.join(testDir, 'does-not-exist.txt');
      const result = await readFilePreservingLineEndings(nonExistentPath);
      assert.strictEqual(result.content, '', 'Should return empty content');
      assert.strictEqual(result.lineEnding, os.EOL, 'Should return platform default');
      console.log('✓ readFilePreservingLineEndings handles ENOENT');
      passed++;
    } catch (e: any) {
      console.log('✗ readFilePreservingLineEndings ENOENT failed:', e.message);
      failed++;
    }

    // Test: readFilePreservingLineEndings with LF file
    try {
      const testFile = path.join(testDir, 'test-lf.txt');
      await fs.writeFile(testFile, 'line1\nline2\nline3', 'utf8');
      const result = await readFilePreservingLineEndings(testFile);
      assert.strictEqual(result.content, 'line1\nline2\nline3', 'Should read content');
      assert.strictEqual(result.lineEnding, '\n', 'Should detect LF');
      console.log('✓ readFilePreservingLineEndings reads LF file');
      passed++;
    } catch (e: any) {
      console.log('✗ readFilePreservingLineEndings LF file failed:', e.message);
      failed++;
    }

    // Test: writeFilePreservingLineEndings with LF
    try {
      const testFile = path.join(testDir, 'write-lf.txt');
      const content = 'line1\nline2\nline3';
      await writeFilePreservingLineEndings(testFile, content, '\n');
      const written = await fs.readFile(testFile, 'utf8');
      assert.strictEqual(written, 'line1\nline2\nline3', 'Should write with LF');
      console.log('✓ writeFilePreservingLineEndings writes LF');
      passed++;
    } catch (e: any) {
      console.log('✗ writeFilePreservingLineEndings LF failed:', e.message);
      failed++;
    }

    // Test: writeFilePreservingLineEndings with CRLF
    try {
      const testFile = path.join(testDir, 'write-crlf.txt');
      const content = 'line1\nline2\nline3';
      await writeFilePreservingLineEndings(testFile, content, '\r\n');
      const written = await fs.readFile(testFile, 'utf8');
      assert.strictEqual(written, 'line1\r\nline2\r\nline3', 'Should write with CRLF');
      console.log('✓ writeFilePreservingLineEndings writes CRLF');
      passed++;
    } catch (e: any) {
      console.log('✗ writeFilePreservingLineEndings CRLF failed:', e.message);
      failed++;
    }

    // Test: ensureDirectoryExists creates new directory
    try {
      const newDir = path.join(testDir, 'new-directory');
      await ensureDirectoryExists(newDir);
      const stats = await fs.stat(newDir);
      assert.strictEqual(stats.isDirectory(), true, 'Should create directory');
      console.log('✓ ensureDirectoryExists creates new directory');
      passed++;
    } catch (e: any) {
      console.log('✗ ensureDirectoryExists create failed:', e.message);
      failed++;
    }

    // Test: ensureDirectoryExists with existing directory
    try {
      const existingDir = path.join(testDir, 'existing');
      await fs.mkdir(existingDir);
      await ensureDirectoryExists(existingDir);
      const stats = await fs.stat(existingDir);
      assert.strictEqual(stats.isDirectory(), true, 'Should handle existing directory');
      console.log('✓ ensureDirectoryExists handles existing directory');
      passed++;
    } catch (e: any) {
      console.log('✗ ensureDirectoryExists existing failed:', e.message);
      failed++;
    }

    // Test: ensureDirectoryExists creates nested directories
    try {
      const nestedDir = path.join(testDir, 'parent', 'child', 'grandchild');
      await ensureDirectoryExists(nestedDir);
      const stats = await fs.stat(nestedDir);
      assert.strictEqual(stats.isDirectory(), true, 'Should create nested directories');
      console.log('✓ ensureDirectoryExists creates nested directories');
      passed++;
    } catch (e: any) {
      console.log('✗ ensureDirectoryExists nested failed:', e.message);
      failed++;
    }

  } finally {
    // Cleanup
    if (testDir) {
      try {
        await fs.rm(testDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
