/**
 * Simple Log Scan Test
 * Focuses only on actual security violations in console.log statements
 */

import * as fs from 'fs';
import * as path from 'path';

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
  };
}

// Only check for actual console.log security violations
const SECURITY_PATTERNS = [
  // Console.log with sensitive data
  /console\.log\([^)]*email[^)]*\)/gi,
  /console\.log\([^)]*password[^)]*\)/gi,
  /console\.log\([^)]*token[^)]*\)/gi,
  /console\.log\([^)]*secret[^)]*\)/gi,
  /console\.log\([^)]*api[_-]?key[^)]*\)/gi,
  /console\.log\([^)]*process\.env\.[A-Z_]+[^)]*\)/gi,
  /console\.log\([^)]*content_enc[^)]*\)/gi,
  /console\.log\([^)]*display_name_enc[^)]*\)/gi,
  /console\.log\([^)]*summary_text_enc[^)]*\)/gi,
  /console\.log\([^)]*userMessage[^)]*\)/gi,
  /console\.log\([^)]*userBMessage[^)]*\)/gi,
  /console\.log\([^)]*authorization[^)]*\)/gi,
  /console\.log\([^)]*bearer[^)]*\)/gi,
  /console\.log\([^)]*jwt[^)]*\)/gi
];

function scanFile(filePath: string): Array<{ line: number; content: string; reason: string }> {
  const violations: Array<{ line: number; content: string; reason: string }> = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Only check console.log statements
      if (line.includes('console.log')) {
        SECURITY_PATTERNS.forEach(pattern => {
          if (pattern.test(line)) {
            violations.push({
              line: index + 1,
              content: line.trim(),
              reason: 'Console.log with sensitive data detected'
            });
          }
        });
      }
    });
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return violations;
}

function scanDirectory(dirPath: string): LogScanResult {
  const violations: Array<{ file: string; line: number; content: string; reason: string }> = [];
  let totalFiles = 0;
  
  function scanRecursive(currentPath: string) {
    try {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other irrelevant directories
          if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
            scanRecursive(fullPath);
          }
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
          totalFiles++;
          const fileViolations = scanFile(fullPath);
          fileViolations.forEach(violation => {
            violations.push({
              file: fullPath,
              line: violation.line,
              content: violation.content,
              reason: violation.reason
            });
          });
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${currentPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  scanRecursive(dirPath);
  
  return {
    passed: violations.length === 0,
    violations,
    summary: {
      totalFiles,
      violationsFound: violations.length
    }
  };
}

function generateReport(result: LogScanResult): string {
  let report = '# Log Security Scan Report\n\n';
  
  if (result.passed) {
    report += '✅ **PASSED** - No security violations found in console.log statements\n\n';
  } else {
    report += `❌ **FAILED** - ${result.violations.length} security violations found\n\n`;
    
    report += '## Violations:\n\n';
    result.violations.forEach((violation, index) => {
      report += `${index + 1}. **${violation.file}:${violation.line}**\n`;
      report += `   \`${violation.content}\`\n`;
      report += `   Reason: ${violation.reason}\n\n`;
    });
  }
  
  report += `## Summary\n`;
  report += `- Total files scanned: ${result.summary.totalFiles}\n`;
  report += `- Violations found: ${result.summary.violationsFound}\n`;
  report += `- Status: ${result.passed ? 'PASSED' : 'FAILED'}\n\n`;
  
  if (!result.passed) {
    report += `## Recommendations\n`;
    report += `1. Remove or redact sensitive data from console.log statements\n`;
    report += `2. Use structured logging with redaction\n`;
    report += `3. Never log passwords, tokens, or API keys\n`;
    report += `4. Use environment variables for configuration, not hardcoded values\n`;
  }
  
  return report;
}

export function runLogScan(): LogScanResult {
  console.log('🔍 Starting log security scan...');
  
  const result = scanDirectory('services');
  
  console.log(`📁 Scanned ${result.summary.totalFiles} files`);
  
  if (result.passed) {
    console.log('✅ Log scan passed - no security violations found');
  } else {
    console.log(`❌ Log scan failed - ${result.violations.length} violations found`);
    console.log('\n🚨 Violations:');
    result.violations.forEach((violation, index) => {
      console.log(`  ${index + 1}. ${violation.file}:${violation.line}`);
      console.log(`     ${violation.content}`);
      console.log(`     Reason: ${violation.reason}\n`);
    });
  }
  
  return result;
}

// Run the scan if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('log-scan-simple.test.ts')) {
  const result = runLogScan();
  const report = generateReport(result);
  
  // Write report to file
  fs.writeFileSync('log-scan-report.md', report);
  console.log('📄 Report written to log-scan-report.md');
  
  // Exit with error code if violations found
  process.exit(result.passed ? 0 : 1);
}
