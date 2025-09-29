#!/usr/bin/env node

/**
 * M6 Comprehensive Test Runner
 * Runs all test suites and generates comprehensive reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runTestSuite(testName, command, description) {
  console.log(`\n🧪 Running ${testName}...`);
  console.log(`📝 ${description}`);
  
  try {
    const startTime = Date.now();
    execSync(command, { stdio: 'inherit' });
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ ${testName} completed in ${duration}ms`);
    return { status: 'success', duration };
  } catch (error) {
    console.log(`❌ ${testName} failed: ${error.message}`);
    return { status: 'failed', error: error.message };
  }
}

function generateTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length
    },
    results
  };
  
  // Save JSON report
  const reportPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Generate markdown report
  const markdownReport = `# M6 Comprehensive Test Report

**Generated:** ${report.timestamp}

## Summary

| Status | Count |
|--------|-------|
| ✅ Success | ${report.summary.success} |
| ❌ Failed | ${report.summary.failed} |
| **Total** | **${report.summary.total}** |

## Detailed Results

${results.map(result => `
### ${result.name}

**Status:** ${result.status === 'success' ? '✅' : '❌'} ${result.status.toUpperCase()}  
**Duration:** ${result.duration ? `${result.duration}ms` : 'N/A'}  
**Description:** ${result.description}

${result.error ? `**Error:** \`${result.error}\`` : ''}
`).join('')}

## Recommendations

${report.summary.failed > 0 ? 
  '❌ Some tests failed. Please review the errors above and fix them before proceeding.' :
  '✅ All tests passed! The system is ready for deployment.'}
`;
  
  const markdownPath = path.join(__dirname, 'test-results.md');
  fs.writeFileSync(markdownPath, markdownReport);
  
  console.log(`\n📄 Test report saved to: ${reportPath}`);
  console.log(`📄 Markdown report saved to: ${markdownPath}`);
  
  return report;
}

function main() {
  console.log('🚀 M6 Comprehensive Test Runner');
  console.log('================================\n');
  
  const results = [];
  
  // Test 1: Unit Tests
  results.push(runTestSuite(
    'Unit Tests',
    'npm run test:unit',
    'Testing individual components and functions'
  ));
  
  // Test 2: Integration Tests
  results.push(runTestSuite(
    'Integration Tests',
    'npm run test:integration',
    'Testing API endpoints and service interactions'
  ));
  
  // Test 3: Performance Tests
  results.push(runTestSuite(
    'Performance Tests',
    'npm run test:performance',
    'Testing system performance and load handling'
  ));
  
  // Test 4: Security Tests
  results.push(runTestSuite(
    'Security Tests',
    'npm run test:security',
    'Testing security vulnerabilities and access controls'
  ));
  
  // Test 5: E2E Tests
  results.push(runTestSuite(
    'End-to-End Tests',
    'npm run test:e2e',
    'Testing complete user journeys and workflows'
  ));
  
  // Test 6: Accessibility Tests
  results.push(runTestSuite(
    'Accessibility Tests',
    'npm run test:accessibility',
    'Testing website accessibility compliance'
  ));
  
  // Test 7: API Contract Tests
  results.push(runTestSuite(
    'API Contract Tests',
    'npm run test:api-contract',
    'Testing API contract compliance and OpenAPI validation'
  ));
  
  // Test 8: Load Tests
  results.push(runTestSuite(
    'Load Tests',
    'npm run test:load',
    'Testing system performance under load'
  ));
  
  // Test 9: Stress Tests
  results.push(runTestSuite(
    'Stress Tests',
    'npm run test:stress',
    'Testing system behavior under extreme conditions'
  ));
  
  // Test 10: Code Quality
  results.push(runTestSuite(
    'Code Quality',
    'npm run lint:check && npm run format:check',
    'Testing code quality and formatting standards'
  ));
  
  // Test 11: Type Safety
  results.push(runTestSuite(
    'Type Safety',
    'npm run type-check',
    'Testing TypeScript compilation and type safety'
  ));
  
  // Test 12: Security Audit
  results.push(runTestSuite(
    'Security Audit',
    'npm audit --audit-level=moderate',
    'Testing for security vulnerabilities in dependencies'
  ));
  
  // Test 13: Environment Validation
  results.push(runTestSuite(
    'Environment Validation',
    'node scripts/validate-env.js',
    'Validating environment configuration and required variables'
  ));
  
  // Test 14: Database Migration Check
  results.push(runTestSuite(
    'Database Migration Check',
    'npm run db:migrate:check',
    'Checking database migration status'
  ));
  
  // Test 15: OpenAPI Validation
  results.push(runTestSuite(
    'OpenAPI Validation',
    'npm run openapi:validate',
    'Validating API documentation and OpenAPI specification'
  ));
  
  // Generate comprehensive report
  const report = generateTestReport(results);
  
  // Print final summary
  console.log('\n🎯 M6 Test Summary');
  console.log('==================');
  console.log(`✅ Successful: ${report.summary.success}`);
  console.log(`❌ Failed: ${report.summary.failed}`);
  console.log(`📊 Total: ${report.summary.total}`);
  console.log(`🎯 Success Rate: ${((report.summary.success / report.summary.total) * 100).toFixed(1)}%`);
  
  if (report.summary.failed > 0) {
    console.log('\n❌ Some tests failed. Please review the errors above.');
    console.log('💡 Check the test-results.md file for detailed information.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! The system is ready for deployment.');
    console.log('✅ M6 Testing & Quality milestone completed successfully!');
    process.exit(0);
  }
}

// Run the comprehensive test suite
if (require.main === module) {
  main();
}

module.exports = { main };
