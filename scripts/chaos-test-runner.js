#!/usr/bin/env node

/**
 * Chaos Test Runner
 * Executes chaos tests for long-poll functionality
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ChaosTestRunner {
  constructor() {
    this.results = [];
    this.config = {
      testDuration: 300000, // 5 minutes
      clientCount: 50,
      messageRate: 10, // messages per second
      disconnectProbability: 0.1,
      reconnectDelay: 1000,
      stormIntensity: 0.05
    };
  }

  /**
   * Run chaos tests with different scenarios
   */
  async runChaosTests() {
    console.log('🧪 Starting Chaos Tests for Long-Poll...\n');

    const scenarios = [
      {
        name: 'Normal Operation',
        config: {
          ...this.config,
          disconnectProbability: 0,
          stormIntensity: 0
        }
      },
      {
        name: 'Moderate Chaos',
        config: {
          ...this.config,
          disconnectProbability: 0.1,
          stormIntensity: 0.05
        }
      },
      {
        name: 'High Chaos',
        config: {
          ...this.config,
          disconnectProbability: 0.3,
          stormIntensity: 0.2
        }
      },
      {
        name: 'Extreme Chaos',
        config: {
          ...this.config,
          disconnectProbability: 0.5,
          stormIntensity: 0.4
        }
      }
    ];

    for (const scenario of scenarios) {
      console.log(`\n🔥 Running scenario: ${scenario.name}`);
      const result = await this.runScenario(scenario);
      this.results.push(result);
    }

    this.generateReport();
  }

  /**
   * Run a single chaos test scenario
   */
  async runScenario(scenario) {
    const startTime = Date.now();
    const testFile = path.join(__dirname, '../__tests__/chaos/longpoll-chaos.test.ts');
    
    return new Promise((resolve) => {
      const jest = spawn('npx', ['jest', testFile, '--verbose', '--detectOpenHandles'], {
        env: {
          ...process.env,
          CHAOS_CONFIG: JSON.stringify(scenario.config)
        }
      });

      let output = '';
      let errorOutput = '';

      jest.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });

      jest.stderr.on('data', (data) => {
        errorOutput += data.toString();
        process.stderr.write(data);
      });

      jest.on('close', (code) => {
        const duration = Date.now() - startTime;
        const result = {
          scenario: scenario.name,
          config: scenario.config,
          duration,
          exitCode: code,
          output,
          errorOutput,
          success: code === 0
        };
        
        resolve(result);
      });
    });
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('\n📊 Chaos Test Report');
    console.log('='.repeat(50));

    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;

    console.log(`\n📈 Summary:`);
    console.log(`  Total Scenarios: ${totalTests}`);
    console.log(`  Successful: ${successfulTests}`);
    console.log(`  Failed: ${failedTests}`);
    console.log(`  Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);

    console.log(`\n🔍 Detailed Results:`);
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(1);
      console.log(`  ${index + 1}. ${result.scenario} ${status} (${duration}s)`);
      
      if (!result.success) {
        console.log(`     Exit Code: ${result.exitCode}`);
        if (result.errorOutput) {
          console.log(`     Error: ${result.errorOutput.substring(0, 100)}...`);
        }
      }
    });

    // Save detailed report
    const reportPath = path.join(__dirname, '../chaos-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Generate recommendations
    this.generateRecommendations();
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    console.log(`\n💡 Recommendations:`);

    const failedTests = this.results.filter(r => !r.success);
    
    if (failedTests.length === 0) {
      console.log(`  🎉 All chaos tests passed! Your long-poll implementation is robust.`);
      return;
    }

    console.log(`  ⚠️  ${failedTests.length} scenario(s) failed. Consider:`);
    
    failedTests.forEach(result => {
      console.log(`    - ${result.scenario}: Review error handling and recovery mechanisms`);
    });

    console.log(`\n🔧 Suggested Improvements:`);
    console.log(`  - Implement exponential backoff for reconnections`);
    console.log(`  - Add circuit breaker pattern for failed connections`);
    console.log(`  - Implement message queuing for offline clients`);
    console.log(`  - Add monitoring and alerting for connection health`);
    console.log(`  - Consider implementing message deduplication`);
  }
}

// Run chaos tests if called directly
if (require.main === module) {
  const runner = new ChaosTestRunner();
  runner.runChaosTests().catch(console.error);
}

module.exports = ChaosTestRunner;
