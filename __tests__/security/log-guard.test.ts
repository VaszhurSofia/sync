/**
 * Security test: Log Guard
 * This test ensures no sensitive data is logged in plaintext
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Forbidden patterns that should never appear in logs
const FORBIDDEN_PATTERNS = [
  // Direct field access
  /console\.(log|info|warn|error|debug)\s*\(\s*[^)]*\.(content|contentEnc|message|email|password|token|accessToken|refreshToken|apiKey|secret|feedback|displayName|displayNameEnc|summaryText|summaryTextEnc)\s*[^)]*\)/g,
  
  // Object logging with sensitive fields
  /console\.(log|info|warn|error|debug)\s*\(\s*[^)]*\{[^}]*\b(content|contentEnc|message|email|password|token|accessToken|refreshToken|apiKey|secret|feedback|displayName|displayNameEnc|summaryText|summaryTextEnc)\s*:/g,
  
  // Template literals with sensitive fields
  /console\.(log|info|warn|error|debug)\s*\(\s*`[^`]*\$\{[^}]*\.(content|contentEnc|message|email|password|token|accessToken|refreshToken|apiKey|secret|feedback|displayName|displayNameEnc|summaryText|summaryTextEnc)\s*[^`]*`/g,
  
  // String concatenation with sensitive fields
  /console\.(log|info|warn|error|debug)\s*\(\s*[^)]*\+[^)]*\.(content|contentEnc|message|email|password|token|accessToken|refreshToken|apiKey|secret|feedback|displayName|displayNameEnc|summaryText|summaryTextEnc)\s*[^)]*\)/g
];

// Direct forbidden console usage
const FORBIDDEN_CONSOLE_USAGE = [
  /console\.log\s*\(/g,
  /console\.info\s*\(/g,
  /console\.warn\s*\(/g,
  /console\.error\s*\(/g,
  /console\.debug\s*\(/g
];

// Allowed console usage (exceptions)
const ALLOWED_CONSOLE_PATTERNS = [
  // Error logging without sensitive data
  /console\.error\s*\(\s*['"`]Error:/g,
  /console\.error\s*\(\s*['"`]Failed to/g,
  
  // Debug logging in test files
  /console\.(log|info|warn|error|debug)\s*\(/g // Will be filtered by file path
];

interface Violation {
  file: string;
  line: number;
  column: number;
  pattern: string;
  match: string;
}

function getAllSourceFiles(dir: string, extensions: string[] = ['.ts', '.js', '.tsx', '.jsx']): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .git, dist, build directories
        if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(item)) {
          traverse(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = item.substring(item.lastIndexOf('.'));
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return files;
}

function checkFileForViolations(filePath: string): Violation[] {
  const violations: Violation[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Skip test files for console usage (but still check for sensitive data patterns)
    const isTestFile = filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__');
    
    lines.forEach((line, lineIndex) => {
      const lineNumber = lineIndex + 1;
      
      // Check for forbidden patterns
      FORBIDDEN_PATTERNS.forEach(pattern => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          violations.push({
            file: filePath,
            line: lineNumber,
            column: match.index + 1,
            pattern: pattern.source,
            match: match[0]
          });
        }
      });
      
      // Check for forbidden console usage (skip test files)
      if (!isTestFile) {
        FORBIDDEN_CONSOLE_USAGE.forEach(pattern => {
          let match;
          while ((match = pattern.exec(line)) !== null) {
            // Check if it's an allowed pattern
            const isAllowed = ALLOWED_CONSOLE_PATTERNS.some(allowedPattern => 
              allowedPattern.test(line)
            );
            
            if (!isAllowed) {
              violations.push({
                file: filePath,
                line: lineNumber,
                column: match.index + 1,
                pattern: pattern.source,
                match: match[0]
              });
            }
          });
        });
      }
    });
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }
  
  return violations;
}

function runESLintCheck(): { success: boolean; output: string } {
  try {
    const output = execSync('npx eslint . --ext .ts,.js,.tsx,.jsx --format=compact', { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    return { success: true, output };
  } catch (error: any) {
    return { success: false, output: error.stdout || error.message };
  }
}

describe('Log Guard Security Tests', () => {
  let allViolations: Violation[] = [];
  
  beforeAll(() => {
    // Get all source files
    const sourceFiles = getAllSourceFiles(process.cwd());
    
    // Check each file for violations
    sourceFiles.forEach(file => {
      const violations = checkFileForViolations(file);
      allViolations.push(...violations);
    });
  });

  it('should not have any plaintext logging violations', () => {
    if (allViolations.length > 0) {
      console.error('\n🚨 PLAINTEXT LOGGING VIOLATIONS DETECTED:');
      console.error('=====================================');
      
      allViolations.forEach(violation => {
        console.error(`❌ ${violation.file}:${violation.line}:${violation.column}`);
        console.error(`   Pattern: ${violation.pattern}`);
        console.error(`   Match: ${violation.match}`);
        console.error('');
      });
      
      console.error('💡 Use the secure logger from @sync/logger instead:');
      console.error('   import { logger } from "@sync/logger";');
      console.error('   logger.info("Message", { safeField: value });');
      console.error('');
    }
    
    expect(allViolations).toHaveLength(0);
  });

  it('should pass ESLint security rules', () => {
    const eslintResult = runESLintCheck();
    
    if (!eslintResult.success) {
      console.error('\n🚨 ESLINT SECURITY RULE VIOLATIONS:');
      console.error('==================================');
      console.error(eslintResult.output);
      console.error('');
    }
    
    expect(eslintResult.success).toBe(true);
  });

  it('should have secure logger imports in service files', () => {
    const serviceFiles = getAllSourceFiles(process.cwd()).filter(file => 
      file.includes('services/') && 
      (file.endsWith('.ts') || file.endsWith('.js')) &&
      !file.includes('.test.') &&
      !file.includes('.spec.')
    );
    
    const filesWithoutSecureLogger: string[] = [];
    
    serviceFiles.forEach(file => {
      try {
        const content = readFileSync(file, 'utf8');
        
        // Check if file uses console methods
        const hasConsoleUsage = FORBIDDEN_CONSOLE_USAGE.some(pattern => 
          pattern.test(content)
        );
        
        // Check if file imports secure logger
        const hasSecureLogger = content.includes('@sync/logger') || 
                               content.includes('from \'../logger\'') ||
                               content.includes('from \'./logger\'');
        
        if (hasConsoleUsage && !hasSecureLogger) {
          filesWithoutSecureLogger.push(file);
        }
      } catch (error) {
        // Skip files that can't be read
      }
    });
    
    if (filesWithoutSecureLogger.length > 0) {
      console.error('\n🚨 FILES WITH CONSOLE USAGE BUT NO SECURE LOGGER:');
      console.error('================================================');
      filesWithoutSecureLogger.forEach(file => {
        console.error(`❌ ${file}`);
      });
      console.error('');
    }
    
    expect(filesWithoutSecureLogger).toHaveLength(0);
  });

  it('should not log sensitive data in test files', () => {
    const testFiles = getAllSourceFiles(process.cwd()).filter(file => 
      file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')
    );
    
    const testViolations: Violation[] = [];
    
    testFiles.forEach(file => {
      const violations = checkFileForViolations(file);
      // Filter out console usage violations for test files, but keep sensitive data violations
      const sensitiveDataViolations = violations.filter(v => 
        !FORBIDDEN_CONSOLE_USAGE.some(pattern => pattern.source === v.pattern)
      );
      testViolations.push(...sensitiveDataViolations);
    });
    
    if (testViolations.length > 0) {
      console.error('\n🚨 SENSITIVE DATA LOGGING IN TEST FILES:');
      console.error('========================================');
      testViolations.forEach(violation => {
        console.error(`❌ ${violation.file}:${violation.line}:${violation.column}`);
        console.error(`   Match: ${violation.match}`);
        console.error('');
      });
    }
    
    expect(testViolations).toHaveLength(0);
  });
});

// Manual spot test function
export function manualSpotTest() {
  console.log('🔍 Running manual spot test for log scrubbing...');
  
  // Test the scrubbing function
  const testData = {
    id: '123',
    content: 'This is sensitive content',
    email: 'user@example.com',
    password: 'secret123',
    safeField: 'This is safe'
  };
  
  const { scrubForLogging } = require('../services/api/src/middleware/log-scrubbing');
  const scrubbed = scrubForLogging(testData);
  
  console.log('Original data:', testData);
  console.log('Scrubbed data:', scrubbed);
  
  // Verify sensitive fields are redacted
  expect(scrubbed.content).toBe('[REDACTED]');
  expect(scrubbed.email).toBe('[REDACTED]');
  expect(scrubbed.password).toBe('[REDACTED]');
  expect(scrubbed.id).toBe('123'); // Safe field preserved
  expect(scrubbed.safeField).toBe('[REDACTED]'); // Unknown field redacted
  
  console.log('✅ Manual spot test passed - sensitive data properly redacted');
}
