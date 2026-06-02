import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Detect the line ending style used in content
 * @param content File content to analyze
 * @returns '\r\n' for CRLF (Windows) or '\n' for LF (Unix)
 */
export function detectLineEnding(content: string): '\r\n' | '\n' {
  // Check for CRLF first (Windows)
  if (content.includes('\r\n')) {
    return '\r\n';
  }
  // Default to LF (Unix/macOS)
  return '\n';
}

/**
 * Read a file and detect its line ending style
 * @param filePath Path to the file
 * @returns Object containing file content and detected line ending
 */
export async function readFilePreservingLineEndings(
  filePath: string
): Promise<{ content: string; lineEnding: '\r\n' | '\n' }> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lineEnding = detectLineEnding(content);
    return { content, lineEnding };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist - return empty content with platform default
      const defaultLineEnding = process.platform === 'win32' ? '\r\n' : '\n';
      return { content: '', lineEnding: defaultLineEnding };
    }
    // Re-throw other errors (EACCES, etc.)
    throw error;
  }
}

/**
 * Write content to a file using the specified line ending style
 * @param filePath Path to the file
 * @param content Content to write
 * @param lineEnding Line ending style to use
 */
export async function writeFilePreservingLineEndings(
  filePath: string,
  content: string,
  lineEnding: '\r\n' | '\n'
): Promise<void> {
  // Normalize content to use the specified line ending
  const normalizedContent = content.replace(/\r?\n/g, lineEnding);
  
  try {
    await fs.writeFile(filePath, normalizedContent, 'utf8');
  } catch (error: any) {
    // Provide more helpful error messages
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      throw new Error(`Permission denied writing to ${filePath}. ${
        process.platform === 'win32' 
          ? 'Run VS Code as administrator.' 
          : 'Try running with sudo or check file permissions.'
      }`);
    }
    throw error;
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param dirPath Path to the directory
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    // Ignore error if directory already exists
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}
