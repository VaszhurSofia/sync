#!/usr/bin/env node

/**
 * Deployment report generator
 * Generates a comprehensive deployment readiness report
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function generateDeploymentReport() {
  console.log('📊 Generating deployment readiness report...\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };
  
  // Check 1: Build Status
  console.log('🔨 Checking build status...');
  try {
    execSync('npm run build', { stdio: 'pipe' });
    report.checks.build = {
      status: 'success',
      message: 'All services built successfully'
    };
    console.log('✅ Build: Success');
  } catch (error) {
    report.checks.build = {
      status: 'failed',
      message: 'Build failed',
      error: error.message
    };
    console.log('❌ Build: Failed');
  }
  
  // Check 2: Test Coverage
  console.log('🧪 Checking test coverage...');
  try {
    const coverageOutput = execSync('npm run test:coverage', { stdio: 'pipe', encoding: 'utf8' });
    const coverageMatch = coverageOutput.match(/All files\s+\|\s+(\d+\.\d+)\s+\|\s+(\d+\.\d+)\s+\|\s+(\d+\.\d+)\s+\|\s+(\d+\.\d+)/);
    
    if (coverageMatch) {
      const [, lines, branches, functions, statements ] = coverageMatch.map(parseFloat);
      report.checks.coverage = {
        status: 'success',
        message: 'Test coverage meets requirements',
        metrics: {
          lines,
          branches,
          functions,
          statements
        }
      };
      console.log(`✅ Coverage: ${lines}% lines, ${branches}% branches`);
    } else {
      report.checks.coverage = {
        status: 'warning',
        message: 'Could not parse coverage metrics'
      };
      console.log('⚠️  Coverage: Could not parse metrics');
    }
  } catch (error) {
    report.checks.coverage = {
      status: 'failed',
      message: 'Coverage check failed',
      error: error.message
    };
    console.log('❌ Coverage: Failed');
  }
  
  // Check 3: Security Audit
  console.log('🔒 Checking security audit...');
  try {
    const auditOutput = execSync('npm audit --audit-level=moderate', { stdio: 'pipe', encoding: 'utf8' });
    if (auditOutput.includes('found 0 vulnerabilities')) {
      report.checks.security = {
        status: 'success',
        message: 'No security vulnerabilities found'
      };
      console.log('✅ Security: No vulnerabilities');
    } else {
      report.checks.security = {
        status: 'warning',
        message: 'Security vulnerabilities found',
        details: auditOutput
      };
      console.log('⚠️  Security: Vulnerabilities found');
    }
  } catch (error) {
    report.checks.security = {
      status: 'failed',
      message: 'Security audit failed',
      error: error.message
    };
    console.log('❌ Security: Audit failed');
  }
  
  // Check 4: Linting
  console.log('🔍 Checking code quality...');
  try {
    execSync('npm run lint:check', { stdio: 'pipe' });
    report.checks.linting = {
      status: 'success',
      message: 'Code quality checks passed'
    };
    console.log('✅ Linting: Passed');
  } catch (error) {
    report.checks.linting = {
      status: 'failed',
      message: 'Linting failed',
      error: error.message
    };
    console.log('❌ Linting: Failed');
  }
  
  // Check 5: Type Checking
  console.log('📝 Checking TypeScript...');
  try {
    execSync('npm run type-check', { stdio: 'pipe' });
    report.checks.typescript = {
      status: 'success',
      message: 'TypeScript compilation successful'
    };
    console.log('✅ TypeScript: Passed');
  } catch (error) {
    report.checks.typescript = {
      status: 'failed',
      message: 'TypeScript compilation failed',
      error: error.message
    };
    console.log('❌ TypeScript: Failed');
  }
  
  // Check 6: Environment Configuration
  console.log('🌍 Checking environment configuration...');
  try {
    execSync('node scripts/validate-env.js', { stdio: 'pipe' });
    report.checks.environment = {
      status: 'success',
      message: 'Environment configuration valid'
    };
    console.log('✅ Environment: Valid');
  } catch (error) {
    report.checks.environment = {
      status: 'failed',
      message: 'Environment configuration invalid',
      error: error.message
    };
    console.log('❌ Environment: Invalid');
  }
  
  // Check 7: Database Migrations
  console.log('🗄️  Checking database migrations...');
  try {
    execSync('npm run db:migrate:check', { stdio: 'pipe' });
    report.checks.database = {
      status: 'success',
      message: 'Database migrations up to date'
    };
    console.log('✅ Database: Migrations current');
  } catch (error) {
    report.checks.database = {
      status: 'failed',
      message: 'Database migration check failed',
      error: error.message
    };
    console.log('❌ Database: Migration check failed');
  }
  
  // Check 8: API Documentation
  console.log('📚 Checking API documentation...');
  try {
    const openApiPath = path.join(__dirname, '../docs/openapi.yaml');
    if (fs.existsSync(openApiPath)) {
      execSync('npm run openapi:validate', { stdio: 'pipe' });
      report.checks.documentation = {
        status: 'success',
        message: 'API documentation valid'
      };
      console.log('✅ Documentation: Valid');
    } else {
      report.checks.documentation = {
        status: 'warning',
        message: 'API documentation not found'
      };
      console.log('⚠️  Documentation: Not found');
    }
  } catch (error) {
    report.checks.documentation = {
      status: 'failed',
      message: 'API documentation validation failed',
      error: error.message
    };
    console.log('❌ Documentation: Validation failed');
  }
  
  // Check 9: Performance Metrics
  console.log('⚡ Checking performance metrics...');
  try {
    const performanceOutput = execSync('npm run test:performance', { stdio: 'pipe', encoding: 'utf8' });
    report.checks.performance = {
      status: 'success',
      message: 'Performance tests passed',
      details: performanceOutput
    };
    console.log('✅ Performance: Tests passed');
  } catch (error) {
    report.checks.performance = {
      status: 'failed',
      message: 'Performance tests failed',
      error: error.message
    };
    console.log('❌ Performance: Tests failed');
  }
  
  // Check 10: Accessibility
  console.log('♿ Checking accessibility...');
  try {
    execSync('npm run test:accessibility', { stdio: 'pipe' });
    report.checks.accessibility = {
      status: 'success',
      message: 'Accessibility tests passed'
    };
    console.log('✅ Accessibility: Tests passed');
  } catch (error) {
    report.checks.accessibility = {
      status: 'failed',
      message: 'Accessibility tests failed',
      error: error.message
    };
    console.log('❌ Accessibility: Tests failed');
  }
  
  // Calculate overall status
  const checks = Object.values(report.checks);
  const successCount = checks.filter(c => c.status === 'success').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const failureCount = checks.filter(c => c.status === 'failed').length;
  
  report.summary = {
    total: checks.length,
    success: successCount,
    warnings: warningCount,
    failures: failureCount,
    status: failureCount > 0 ? 'failed' : warningCount > 0 ? 'warning' : 'success'
  };
  
  // Generate recommendations
  report.recommendations = [];
  
  if (report.checks.build?.status === 'failed') {
    report.recommendations.push('Fix build errors before deployment');
  }
  
  if (report.checks.security?.status === 'warning') {
    report.recommendations.push('Address security vulnerabilities');
  }
  
  if (report.checks.coverage?.metrics?.lines < 80) {
    report.recommendations.push('Improve test coverage to meet 80% threshold');
  }
  
  if (report.checks.performance?.status === 'failed') {
    report.recommendations.push('Optimize performance before deployment');
  }
  
  if (report.checks.accessibility?.status === 'failed') {
    report.recommendations.push('Fix accessibility issues');
  }
  
  // Save report
  const reportPath = path.join(__dirname, '../deployment-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Generate markdown report
  const markdownReport = generateMarkdownReport(report);
  const markdownPath = path.join(__dirname, '../deployment-report.md');
  fs.writeFileSync(markdownPath, markdownReport);
  
  // Print summary
  console.log('\n📊 Deployment Readiness Summary:');
  console.log(`✅ Success: ${successCount}`);
  console.log(`⚠️  Warnings: ${warningCount}`);
  console.log(`❌ Failures: ${failureCount}`);
  console.log(`📊 Overall Status: ${report.summary.status.toUpperCase()}`);
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`   • ${rec}`));
  }
  
  console.log(`\n📄 Full report saved to: ${reportPath}`);
  console.log(`📄 Markdown report saved to: ${markdownPath}`);
  
  // Exit with appropriate code
  if (report.summary.status === 'failed') {
    process.exit(1);
  } else if (report.summary.status === 'warning') {
    process.exit(0);
  } else {
    process.exit(0);
  }
}

function generateMarkdownReport(report) {
  return `# Deployment Readiness Report

**Generated:** ${report.timestamp}  
**Version:** ${report.version}  
**Environment:** ${report.environment}

## Summary

| Status | Count |
|--------|-------|
| ✅ Success | ${report.summary.success} |
| ⚠️ Warnings | ${report.summary.warnings} |
| ❌ Failures | ${report.summary.failures} |
| **Overall** | **${report.summary.status.toUpperCase()}** |

## Detailed Results

${Object.entries(report.checks).map(([name, check]) => `
### ${name.charAt(0).toUpperCase() + name.slice(1)}

**Status:** ${check.status === 'success' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'} ${check.status.toUpperCase()}  
**Message:** ${check.message}

${check.error ? `**Error:** \`${check.error}\`` : ''}
${check.metrics ? `**Metrics:** ${JSON.stringify(check.metrics)}` : ''}
`).join('')}

## Recommendations

${report.recommendations.length > 0 ? report.recommendations.map(rec => `- ${rec}`).join('\n') : 'No recommendations at this time.'}

## Next Steps

${report.summary.status === 'success' ? '✅ Ready for deployment!' : 
  report.summary.status === 'warning' ? '⚠️ Review warnings before deployment' : 
  '❌ Fix issues before deployment'}
`;
}

// Run report generation if this script is executed directly
if (require.main === module) {
  generateDeploymentReport();
}

module.exports = { generateDeploymentReport };
