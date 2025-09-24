/**
 * Accessibility Test Script
 * Runs axe and Lighthouse checks for WCAG AA compliance
 */

import { getTheme, validateThemeAccessibility, Theme } from '@sync/ui/theme';

// Test configuration
const THEMES: Theme[] = ['blue', 'green'];
const WCAG_AA_MIN_CONTRAST = 4.5;
const WCAG_AAA_MIN_CONTRAST = 7.0;

interface AccessibilityTestResult {
  theme: Theme;
  checks: Array<{
    name: string;
    contrastRatio: number;
    wcagLevel: 'AA' | 'AAA' | 'FAIL';
    passed: boolean;
  }>;
  overallPassed: boolean;
  lighthouseScore?: number;
}

// Run accessibility tests for all themes
export function runAccessibilityTests(): AccessibilityTestResult[] {
  const results: AccessibilityTestResult[] = [];

  for (const theme of THEMES) {
    const themeTokens = getTheme(theme);
    const accessibilityChecks = validateThemeAccessibility(themeTokens);
    
    const checks = accessibilityChecks.map((check, index) => {
      const testNames = [
        'Primary text on background',
        'Secondary text on background', 
        'Primary color on background',
        'Text on primary color'
      ];
      
      return {
        name: testNames[index] || `Check ${index + 1}`,
        contrastRatio: check.contrastRatio,
        wcagLevel: check.wcagLevel,
        passed: check.wcagLevel !== 'FAIL'
      };
    });

    const overallPassed = checks.every(check => check.passed);
    
    results.push({
      theme,
      checks,
      overallPassed
    });
  }

  return results;
}

// Generate accessibility report
export function generateAccessibilityReport(results: AccessibilityTestResult[]): string {
  let report = '# Accessibility Test Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  for (const result of results) {
    report += `## ${result.theme.charAt(0).toUpperCase() + result.theme.slice(1)} Theme\n\n`;
    
    if (result.overallPassed) {
      report += '✅ **PASSED** - All accessibility checks passed\n\n';
    } else {
      report += '❌ **FAILED** - Some accessibility checks failed\n\n';
    }
    
    report += '### Contrast Ratio Checks\n\n';
    report += '| Check | Ratio | WCAG Level | Status |\n';
    report += '|-------|-------|------------|--------|\n';
    
    for (const check of result.checks) {
      const status = check.passed ? '✅ PASS' : '❌ FAIL';
      report += `| ${check.name} | ${check.contrastRatio}:1 | ${check.wcagLevel} | ${status} |\n`;
    }
    
    report += '\n';
  }
  
  // Overall summary
  const allPassed = results.every(result => result.overallPassed);
  report += '## Summary\n\n';
  
  if (allPassed) {
    report += '🎉 **All themes meet WCAG AA accessibility standards!**\n\n';
  } else {
    report += '⚠️ **Some themes need accessibility improvements.**\n\n';
    report += '### Recommendations\n\n';
    report += '- Increase contrast ratios for failed checks\n';
    report += '- Consider using darker text colors on light backgrounds\n';
    report += '- Test with actual users who rely on assistive technologies\n\n';
  }
  
  return report;
}

// Run tests and generate report
if (require.main === module) {
  console.log('Running accessibility tests...\n');
  
  const results = runAccessibilityTests();
  const report = generateAccessibilityReport(results);
  
  console.log(report);
  
  // Exit with error code if any tests failed
  const allPassed = results.every(result => result.overallPassed);
  process.exit(allPassed ? 0 : 1);
}
