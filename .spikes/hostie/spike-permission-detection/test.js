const fs = require('fs');
const os = require('os');

// Platform detection
const platform = os.platform();
console.log(`=== Platform: ${platform} ===\n`);

// System hosts paths by platform
function getSystemHostsPath() {
  if (platform === 'win32') {
    return 'C:\\Windows\\System32\\drivers\\etc\\hosts';
  }
  return '/etc/hosts';
}

const hostsPath = getSystemHostsPath();
console.log(`System hosts path: ${hostsPath}\n`);

// Test 1: Can we read the hosts file?
console.log('=== Test 1: Read Permission ===');
try {
  const content = fs.readFileSync(hostsPath, 'utf8');
  console.log('✓ Read successful');
  console.log(`Content length: ${content.length} bytes`);
  console.log(`First line: ${content.split('\n')[0]}`);
} catch (err) {
  console.log(`✗ Read failed: ${err.code} - ${err.message}`);
}

// Test 2: Can we write to the hosts file? (will fail without sudo)
console.log('\n=== Test 2: Write Permission ===');
try {
  const testContent = fs.readFileSync(hostsPath, 'utf8') + '';
  fs.writeFileSync(hostsPath, testContent, 'utf8');
  console.log('✓ Write successful (running with elevated permissions)');
} catch (err) {
  console.log(`✗ Write failed: ${err.code}`);
  if (err.code === 'EACCES') {
    console.log('  → Permission denied (expected without sudo)');
  } else if (err.code === 'EPERM') {
    console.log('  → Operation not permitted (Windows)');
  }
}

// Test 3: Platform-specific error messages
console.log('\n=== Test 3: Platform-Specific Error Messages ===');

function getPermissionErrorMessage(platformName) {
  if (platformName === 'win32') {
    return 'Permission denied. Requires administrator access.\n\n' +
           'Options:\n' +
           '1. Restart VS Code as Administrator\n' +
           '2. Manually edit: C:\\Windows\\System32\\drivers\\etc\\hosts\n' +
           '3. Continue managing profiles (sync will be skipped)';
  } else if (platformName === 'darwin') {
    return 'Permission denied. Requires root access.\n\n' +
           'Options:\n' +
           '1. Run: sudo code --user-data-dir="$HOME/.vscode-root"\n' +
           '2. Manually edit: /etc/hosts with sudo\n' +
           '3. Continue managing profiles (sync will be skipped)';
  } else { // linux
    return 'Permission denied. Requires root access.\n\n' +
           'Options:\n' +
           '1. Run: sudo code --user-data-dir="$HOME/.vscode-root" --no-sandbox\n' +
           '2. Manually edit: /etc/hosts with sudo\n' +
           '3. Continue managing profiles (sync will be skipped)';
  }
}

console.log('Windows message:');
console.log(getPermissionErrorMessage('win32'));
console.log('\nmacOS message:');
console.log(getPermissionErrorMessage('darwin'));
console.log('\nLinux message:');
console.log(getPermissionErrorMessage('linux'));

// Test 4: Permission check function
console.log('\n=== Test 4: Permission Check Function ===');

async function checkPermissions(hostsPath) {
  const result = {
    canRead: false,
    canWrite: false,
    error: null
  };
  
  // Test read
  try {
    fs.readFileSync(hostsPath, 'utf8');
    result.canRead = true;
  } catch (err) {
    result.error = err.code;
    return result;
  }
  
  // Test write (try to write same content back)
  try {
    const content = fs.readFileSync(hostsPath, 'utf8');
    fs.writeFileSync(hostsPath, content, 'utf8');
    result.canWrite = true;
  } catch (err) {
    result.error = err.code;
  }
  
  return result;
}

const permissions = checkPermissions(hostsPath);
console.log('Permission check result:');
console.log(JSON.stringify(permissions, null, 2));

// Test 5: Graceful degradation flow
console.log('\n=== Test 5: Graceful Degradation Flow ===');

function syncProfile(profileName, profileContent) {
  const result = {
    success: false,
    needsPermission: false,
    error: null,
    message: ''
  };
  
  try {
    // Simulate sync
    const hostsContent = fs.readFileSync(hostsPath, 'utf8');
    const newContent = hostsContent + '\n# host ' + profileName + ' start\n' + profileContent + '\n# host ' + profileName + ' end';
    fs.writeFileSync(hostsPath, newContent, 'utf8');
    
    result.success = true;
    result.message = `Profile "${profileName}" activated and synced to system hosts`;
  } catch (err) {
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      result.needsPermission = true;
      result.error = err.code;
      result.message = getPermissionErrorMessage(platform);
    } else {
      result.error = err.code;
      result.message = `Sync failed: ${err.message}`;
    }
  }
  
  return result;
}

const syncResult = syncProfile('dev', '127.0.0.1 local.dev');
console.log('Sync result:');
console.log(JSON.stringify({
  success: syncResult.success,
  needsPermission: syncResult.needsPermission,
  error: syncResult.error
}, null, 2));

if (syncResult.needsPermission) {
  console.log('\n[User would see this message in VS Code dialog]:');
  console.log(syncResult.message);
}

console.log('\n✓ Spike complete');
