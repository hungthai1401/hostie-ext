import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { HostsSync } from '../services/hostsSync';

async function runHostsSyncTests() {
  let testDir: string | undefined;
  let hostsSync: HostsSync;
  let passed = 0;
  let failed = 0;

  console.log('Running HostsSync Tests...\n');

  try {
    // Setup
    testDir = path.join(os.tmpdir(), `hostie-hostsync-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    hostsSync = new HostsSync();

    // Test: removeAllManagedSections removes single section
    try {
      const content = [
        '127.0.0.1 localhost',
        '# host dev start',
        '192.168.1.10 dev.local',
        '# host dev end',
        '::1 localhost'
      ].join('\n');
      
      // Access private method via any cast (testing only)
      const result = (hostsSync as any).removeAllManagedSections(content, '\n');
      
      assert.strictEqual(result, '127.0.0.1 localhost\n::1 localhost', 'Should remove managed section');
      console.log('✓ removeAllManagedSections removes single section');
      passed++;
    } catch (e: any) {
      console.log('✗ removeAllManagedSections single section failed:', e.message);
      failed++;
    }

    // Test: removeAllManagedSections handles multiple sections
    try {
      const content = [
        '127.0.0.1 localhost',
        '# host dev start',
        '192.168.1.10 dev.local',
        '# host dev end',
        '10.0.0.1 original',
        '# host staging start',
        '192.168.2.20 staging.local',
        '# host staging end',
        '::1 localhost'
      ].join('\n');
      
      const result = (hostsSync as any).removeAllManagedSections(content, '\n');
      
      assert.strictEqual(result, '127.0.0.1 localhost\n10.0.0.1 original\n::1 localhost', 'Should remove all managed sections');
      console.log('✓ removeAllManagedSections handles multiple sections');
      passed++;
    } catch (e: any) {
      console.log('✗ removeAllManagedSections multiple sections failed:', e.message);
      failed++;
    }

    // Test: removeAllManagedSections handles unclosed start delimiter
    try {
      const content = [
        '127.0.0.1 localhost',
        '# host dev start',
        '192.168.1.10 dev.local',
        '::1 localhost'
      ].join('\n');
      
      const result = (hostsSync as any).removeAllManagedSections(content, '\n');
      
      // Should remove everything after unclosed start
      assert.strictEqual(result, '127.0.0.1 localhost', 'Should handle unclosed delimiter');
      console.log('✓ removeAllManagedSections handles unclosed start delimiter');
      passed++;
    } catch (e: any) {
      console.log('✗ removeAllManagedSections unclosed delimiter failed:', e.message);
      failed++;
    }

    // Test: removeAllManagedSections preserves line endings (CRLF)
    try {
      const content = [
        '127.0.0.1 localhost',
        '# host dev start',
        '192.168.1.10 dev.local',
        '# host dev end',
        '::1 localhost'
      ].join('\r\n');
      
      const result = (hostsSync as any).removeAllManagedSections(content, '\r\n');
      
      assert.strictEqual(result, '127.0.0.1 localhost\r\n::1 localhost', 'Should preserve CRLF');
      console.log('✓ removeAllManagedSections preserves CRLF line endings');
      passed++;
    } catch (e: any) {
      console.log('✗ removeAllManagedSections CRLF failed:', e.message);
      failed++;
    }

    // Test: isValidProfileContent rejects delimiter injection
    try {
      const maliciousContent = '192.168.1.1 evil.com\n# host injected start';
      const result = (hostsSync as any).isValidProfileContent(maliciousContent);
      
      assert.strictEqual(result, false, 'Should reject delimiter injection');
      console.log('✓ isValidProfileContent rejects delimiter injection (start)');
      passed++;
    } catch (e: any) {
      console.log('✗ isValidProfileContent delimiter injection failed:', e.message);
      failed++;
    }

    // Test: isValidProfileContent rejects end delimiter
    try {
      const maliciousContent = '192.168.1.1 evil.com\n# host injected end';
      const result = (hostsSync as any).isValidProfileContent(maliciousContent);
      
      assert.strictEqual(result, false, 'Should reject end delimiter');
      console.log('✓ isValidProfileContent rejects delimiter injection (end)');
      passed++;
    } catch (e: any) {
      console.log('✗ isValidProfileContent end delimiter failed:', e.message);
      failed++;
    }

    // Test: isValidProfileContent allows valid content
    try {
      const validContent = '192.168.1.1 dev.local\n10.0.0.1 api.dev';
      const result = (hostsSync as any).isValidProfileContent(validContent);
      
      assert.strictEqual(result, true, 'Should allow valid content');
      console.log('✓ isValidProfileContent allows valid hosts content');
      passed++;
    } catch (e: any) {
      console.log('✗ isValidProfileContent valid content failed:', e.message);
      failed++;
    }

    // Test: isValidProfileContent allows empty content
    try {
      const emptyContent = '';
      const result = (hostsSync as any).isValidProfileContent(emptyContent);
      
      assert.strictEqual(result, true, 'Should allow empty content');
      console.log('✓ isValidProfileContent allows empty content');
      passed++;
    } catch (e: any) {
      console.log('✗ isValidProfileContent empty content failed:', e.message);
      failed++;
    }

    // Test: wrapInDelimiters creates correct format
    try {
      const content = '192.168.1.10 dev.local';
      const result = (hostsSync as any).wrapInDelimiters('dev', content, '\n');
      
      const expected = '# host dev start\n192.168.1.10 dev.local\n# host dev end';
      assert.strictEqual(result, expected, 'Should wrap with correct delimiters');
      console.log('✓ wrapInDelimiters creates correct format');
      passed++;
    } catch (e: any) {
      console.log('✗ wrapInDelimiters failed:', e.message);
      failed++;
    }

    // Test: wrapInDelimiters preserves CRLF
    try {
      const content = '192.168.1.10 dev.local';
      const result = (hostsSync as any).wrapInDelimiters('dev', content, '\r\n');
      
      const expected = '# host dev start\r\n192.168.1.10 dev.local\r\n# host dev end';
      assert.strictEqual(result, expected, 'Should use CRLF throughout');
      console.log('✓ wrapInDelimiters preserves CRLF line endings');
      passed++;
    } catch (e: any) {
      console.log('✗ wrapInDelimiters CRLF failed:', e.message);
      failed++;
    }

    // Test: checkPermissions handles read/write detection
    try {
      const result = await hostsSync.checkPermissions();
      
      // On most dev machines, read should work but write might not
      assert.strictEqual(typeof result.canRead, 'boolean', 'Should return boolean for canRead');
      assert.strictEqual(typeof result.canWrite, 'boolean', 'Should return boolean for canWrite');
      console.log('✓ checkPermissions returns correct structure');
      passed++;
    } catch (e: any) {
      console.log('✗ checkPermissions failed:', e.message);
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

runHostsSyncTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
