/**
 * Log Scan Test
 * CI test that fails build on plaintext sensitive data in logs
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface LogScanResult {
  passed: boolean;
  violations: Array<{
    file: string;
    line: number;
    content: string;
    reason: string;
  }>;
  summary: {
    totalFiles: number;
    violationsFound: number;
    sensitivePatterns: string[];
  };
}

// Sensitive patterns that should never appear in logs
const SENSITIVE_PATTERNS = [
  // Authentication tokens
  /token["\s]*[:=]["\s]*[a-zA-Z0-9\-_]+/gi,
  /bearer["\s]+[a-zA-Z0-9\-_]+/gi,
  /jwt["\s]*[:=]["\s]*[a-zA-Z0-9\-_\.]+/gi,
  
  // API keys
  /api[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9\-_]+/gi,
  /secret["\s]*[:=]["\s]*[a-zA-Z0-9\-_]+/gi,
  
  // Personal information
  /email["\s]*[:=]["\s]*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  /password["\s]*[:=]["\s]*[^"\s]+/gi,
  
  // Message content
  /content["\s]*[:=]["\s]*["'][^"']{10,}["']/gi,
  /message["\s]*[:=]["\s]*["'][^"']{10,}["']/gi,
  
  // Encrypted fields
  /contentEnc["\s]*[:=]["\s]*[a-zA-Z0-9+/=]+/gi,
  /displayNameEnc["\s]*[:=]["\s]*[a-zA-Z0-9+/=]+/gi,
  /summaryTextEnc["\s]*[:=]["\s]*[a-zA-Z0-9+/=]+/gi,
  
  // Database fields
  /user_id["\s]*[:=]["\s]*[a-zA-Z0-9\-_]+/gi,
  /session_id["\s]*[:=]["\s]*[a-zA-Z0-9\-_]+/gi,
  
  // Direct console.log of sensitive data
  /console\.log\([^)]*content[^)]*\)/gi,
  /console\.log\([^)]*message[^)]*\)/gi,
  /console\.log\([^)]*token[^)]*\)/gi,
  /console\.log\([^)]*password[^)]*\)/gi,
  /console\.log\([^)]*email[^)]*\)/gi,
];

// Files and directories to scan
const SCAN_PATHS = [
  'services/api/src',
  'services/ai/src',
  'website/src',
  'app-mobile/src'
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Files to exclude from scanning
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\./,
  /\.spec\./,
  /__tests__/,
  /dist/,
  /build/,
  /\.d\.ts$/
];

/**
 * Scan a single file for sensitive data
 */
function scanFile(filePath: string): Array<{
  line: number;
  content: string;
  reason: string;
}> {
  const violations: Array<{
    line: number;
    content: string;
    reason: string;
  }> = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Skip comments and test files
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }

      SENSITIVE_PATTERNS.forEach((pattern, patternIndex) => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            violations.push({
              line: lineNumber,
              content: line.trim(),
              reason: `Sensitive pattern detected: ${pattern.source}`
            });
          });
        }
      });
    });

  } catch (error) {
    console.warn(`Warning: Could not scan file ${filePath}:`, error);
  }

  return violations;
}

/**
 * Get all files to scan
 */
function getFilesToScan(): string[] {
  const files: string[] = [];

  function scanDirectory(dirPath: string) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (!EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath))) {
            scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          // Check if file should be scanned
          const shouldScan = SCAN_EXTENSIONS.some(ext => fullPath.endsWith(ext)) &&
                           !EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath));
          
          if (shouldScan) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dirPath}:`, error);
    }
  }

  SCAN_PATHS.forEach(scanPath => {
    if (fs.existsSync(scanPath)) {
      scanDirectory(scanPath);
    }
  });

  return files;
}

/**
 * Run the log scan
 */
export function runLogScan(): LogScanResult {
  console.log('🔍 Starting log scan for sensitive data...');
  
  const files = getFilesToScan();
  const violations: Array<{
    file: string;
    line: number;
    content: string;
    reason: string;
  }> = [];

  console.log(`📁 Scanning ${files.length} files...`);

  files.forEach(file => {
    const fileViolations = scanFile(file);
    fileViolations.forEach(violation => {
      violations.push({
        file,
        ...violation
      });
    });
  });

  const result: LogScanResult = {
    passed: violations.length === 0,
    violations,
    summary: {
      totalFiles: files.length,
      violationsFound: violations.length,
      sensitivePatterns: SENSITIVE_PATTERNS.map(p => p.source)
    }
  };

  if (result.passed) {
    console.log('✅ Log scan passed - no sensitive data found');
  } else {
    console.log(`❌ Log scan failed - ${violations.length} violations found`);
    console.log('\n🚨 Violations:');
    violations.forEach(violation => {
      console.log(`  ${violation.file}:${violation.line}`);
      console.log(`    ${violation.content}`);
      console.log(`    Reason: ${violation.reason}`);
      console.log('');
    });
  }

  return result;
}

/**
 * Generate a detailed report
 */
export function generateLogScanReport(result: LogScanResult): string {
  let report = '# Log Scan Security Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  report += `## Summary\n\n`;
  report += `- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
  report += `- **Files Scanned**: ${result.summary.totalFiles}\n`;
  report += `- **Violations Found**: ${result.summary.violationsFound}\n\n`;

  if (!result.passed) {
    report += `## Violations\n\n`;
    result.violations.forEach((violation, index) => {
      report += `### Violation ${index + 1}\n\n`;
      report += `- **File**: \`${violation.file}\`\n`;
      report += `- **Line**: ${violation.line}\n`;
      report += `- **Content**: \`${violation.content}\`\n`;
      report += `- **Reason**: ${violation.reason}\n\n`;
    });

    report += `## Recommendations\n\n`;
    report += `1. Use the secure logger: \`import { logger } from './logger'\`\n`;
    report += `2. Use \`scrubForLogging()\` for sensitive data\n`;
    report += `3. Avoid direct \`console.log()\` with sensitive data\n`;
    report += `4. Use structured logging with redaction\n\n`;
  }

  return report;
}

// Run the scan if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('log-scan.test.ts')) {
  const result = runLogScan();
  const report = generateLogScanReport(result);
  
  // Write report to file
  fs.writeFileSync('log-scan-report.md', report);
  console.log('📄 Report written to log-scan-report.md');
  
  // Exit with error code if violations found
  process.exit(result.passed ? 0 : 1);
}
