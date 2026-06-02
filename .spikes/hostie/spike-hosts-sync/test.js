const fs = require('fs');
const os = require('os');
const path = require('path');

// Simulate system hosts path (using temp file for safety)
const tempDir = os.tmpdir();
const testHostsPath = path.join(tempDir, 'hosts-spike-test');
const testProfilePath = path.join(tempDir, 'dev.host');

// Create test hosts file with existing content
const existingContent = `# Existing system hosts
127.0.0.1 localhost
::1 localhost`;

fs.writeFileSync(testHostsPath, existingContent, 'utf8');

// Create test profile
const profileContent = `127.0.0.1 local.dev
127.0.0.1 api.local.dev`;

fs.writeFileSync(testProfilePath, profileContent, 'utf8');

console.log('=== Initial State ===');
console.log('Hosts file content:');
console.log(fs.readFileSync(testHostsPath, 'utf8'));
console.log('\nProfile content:');
console.log(fs.readFileSync(testProfilePath, 'utf8'));

// Detect line ending
function detectLineEnding(content) {
  if (content.includes('\r\n')) return '\r\n';
  return '\n';
}

// Sync profile to hosts file
function syncProfileToHosts(profileName, profileContent, hostsPath) {
  let hostsContent = fs.readFileSync(hostsPath, 'utf8');
  const lineEnding = detectLineEnding(hostsContent);
  
  console.log(`\n=== Detected line ending: ${lineEnding === '\n' ? 'LF' : 'CRLF'} ===`);
  
  // Remove existing sections for this profile
  const startDelimiter = `# host ${profileName} start`;
  const endDelimiter = `# host ${profileName} end`;
  
  const lines = hostsContent.split(/\r?\n/);
  const filteredLines = [];
  let inManagedSection = false;
  
  for (const line of lines) {
    if (line.trim() === startDelimiter) {
      inManagedSection = true;
      continue;
    }
    if (line.trim() === endDelimiter) {
      inManagedSection = false;
      continue;
    }
    if (!inManagedSection) {
      filteredLines.push(line);
    }
  }
  
  // Append new section
  if (filteredLines[filteredLines.length - 1] !== '') {
    filteredLines.push('');
  }
  filteredLines.push(startDelimiter);
  filteredLines.push(profileContent);
  filteredLines.push(endDelimiter);
  
  // Write with preserved line ending
  const newContent = filteredLines.join(lineEnding);
  fs.writeFileSync(hostsPath, newContent, 'utf8');
  
  return newContent;
}

// Test sync
const result = syncProfileToHosts('dev', profileContent, testHostsPath);

console.log('\n=== After Sync ===');
console.log(result);

// Test removing profile
function removeProfileFromHosts(profileName, hostsPath) {
  let hostsContent = fs.readFileSync(hostsPath, 'utf8');
  const lineEnding = detectLineEnding(hostsContent);
  
  const startDelimiter = `# host ${profileName} start`;
  const endDelimiter = `# host ${profileName} end`;
  
  const lines = hostsContent.split(/\r?\n/);
  const filteredLines = [];
  let inManagedSection = false;
  
  for (const line of lines) {
    if (line.trim() === startDelimiter) {
      inManagedSection = true;
      continue;
    }
    if (line.trim() === endDelimiter) {
      inManagedSection = false;
      continue;
    }
    if (!inManagedSection) {
      filteredLines.push(line);
    }
  }
  
  // Remove trailing empty lines
  while (filteredLines.length > 0 && filteredLines[filteredLines.length - 1] === '') {
    filteredLines.pop();
  }
  
  const newContent = filteredLines.join(lineEnding);
  fs.writeFileSync(hostsPath, newContent, 'utf8');
  
  return newContent;
}

const resultAfterRemove = removeProfileFromHosts('dev', testHostsPath);

console.log('\n=== After Remove ===');
console.log(resultAfterRemove);

// Verify original content preserved
console.log('\n=== Verification ===');
console.log('Original preserved?', resultAfterRemove.includes('127.0.0.1 localhost'));
console.log('Profile removed?', !resultAfterRemove.includes('local.dev'));

// Cleanup
fs.unlinkSync(testHostsPath);
fs.unlinkSync(testProfilePath);

console.log('\n✓ Spike complete');
