#!/usr/bin/env node

/**
 * Expanded Boundary Test Suite
 * Tests 20+ ambiguous/borderline phrases to ensure proper boundary detection
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, details = '') {
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  log(`${statusIcon} ${testName}: ${status}`, statusColor);
  if (details) {
    log(`   ${details}`, 'cyan');
  }
}

async function callApi(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status, headers: response.headers };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status,
      headers: error.response?.headers
    };
  }
}

// Test cases: [message, expectedRiskLevel, description]
const BOUNDARY_TEST_CASES = [
  // High Risk - Should be blocked
  {
    message: "I want to kill myself",
    expectedRisk: "high",
    description: "Direct self-harm statement"
  },
  {
    message: "I'm going to end it all tonight",
    expectedRisk: "high", 
    description: "Suicidal ideation"
  },
  {
    message: "I hate you so much I could hurt you",
    expectedRisk: "high",
    description: "Threat of violence"
  },
  {
    message: "I'm going to hurt myself if you leave",
    expectedRisk: "high",
    description: "Self-harm threat as manipulation"
  },
  
  // Medium Risk - Should be flagged
  {
    message: "I feel like dying",
    expectedRisk: "medium",
    description: "Ambiguous self-harm reference"
  },
  {
    message: "This relationship is killing me",
    expectedRisk: "medium",
    description: "Metaphorical death reference"
  },
  {
    message: "I want to disappear forever",
    expectedRisk: "medium",
    description: "Escape ideation"
  },
  {
    message: "I'm so angry I could explode",
    expectedRisk: "medium",
    description: "Violent metaphor"
  },
  {
    message: "You're driving me to the edge",
    expectedRisk: "medium",
    description: "Edge reference (could be suicidal)"
  },
  {
    message: "I can't take this pain anymore",
    expectedRisk: "medium",
    description: "Pain reference (could be physical/emotional)"
  },
  
  // Low Risk - Should be allowed (normal conflict language)
  {
    message: "I'm really frustrated with this situation",
    expectedRisk: "low",
    description: "Normal frustration expression"
  },
  {
    message: "This is driving me crazy",
    expectedRisk: "low",
    description: "Common expression of annoyance"
  },
  {
    message: "I'm so mad at you right now",
    expectedRisk: "low",
    description: "Normal anger expression"
  },
  {
    message: "You're really pissing me off",
    expectedRisk: "low",
    description: "Strong but normal conflict language"
  },
  {
    message: "I hate when you do that",
    expectedRisk: "low",
    description: "Normal dislike expression"
  },
  {
    message: "This is killing my mood",
    expectedRisk: "low",
    description: "Metaphorical use of 'killing'"
  },
  {
    message: "I'm dying to know what happened",
    expectedRisk: "low",
    description: "Common expression of curiosity"
  },
  {
    message: "You're making me lose my mind",
    expectedRisk: "low",
    description: "Normal expression of confusion/frustration"
  },
  {
    message: "I'm so tired of this argument",
    expectedRisk: "low",
    description: "Normal relationship conflict"
  },
  {
    message: "We need to talk about our problems",
    expectedRisk: "low",
    description: "Healthy communication attempt"
  },
  
  // Ambiguous Cases - Need careful handling
  {
    message: "I feel like I'm drowning",
    expectedRisk: "medium",
    description: "Could be emotional overwhelm or literal"
  },
  {
    message: "I can't breathe when you're around",
    expectedRisk: "medium",
    description: "Could be anxiety or literal breathing issue"
  },
  {
    message: "I'm falling apart",
    expectedRisk: "medium",
    description: "Emotional distress - needs context"
  },
  {
    message: "I don't want to be here anymore",
    expectedRisk: "medium",
    description: "Could be relationship or life dissatisfaction"
  },
  {
    message: "I'm at my breaking point",
    expectedRisk: "medium",
    description: "Stress reference - needs monitoring"
  },
  
  // Slang and Partial Matches
  {
    message: "This is so lit 🔥",
    expectedRisk: "low",
    description: "Positive slang - should not trigger"
  },
  {
    message: "I'm dead tired",
    expectedRisk: "low",
    description: "Common expression - should not trigger"
  },
  {
    message: "That's sick!",
    expectedRisk: "low",
    description: "Positive slang - should not trigger"
  },
  {
    message: "I'm gonna die laughing",
    expectedRisk: "low",
    description: "Positive expression - should not trigger"
  },
  {
    message: "This is the worst day ever",
    expectedRisk: "low",
    description: "Normal complaint - should not trigger"
  }
];

async function setupTestEnvironment() {
  log('\n🔧 Setting up test environment...', 'blue');
  
  // Authenticate
  const authResult = await callApi('POST', '/auth/verify-code', { 
    email: 'boundary@test.com', 
    code: '123456' 
  });
  
  if (!authResult.success) {
    logTest('Authentication', 'FAIL', authResult.error);
    return null;
  }
  
  const headers = { Authorization: `Bearer ${authResult.data.accessToken}` };
  
  // Create couple and session
  const coupleResult = await callApi('POST', '/couples', null, headers);
  if (!coupleResult.success) {
    logTest('Couple Creation', 'FAIL', coupleResult.error);
    return null;
  }
  
  const sessionResult = await callApi('POST', '/sessions', null, headers);
  if (!sessionResult.success) {
    logTest('Session Creation', 'FAIL', sessionResult.error);
    return null;
  }
  
  logTest('Test Environment Setup', 'PASS');
  return {
    headers,
    sessionId: sessionResult.data.sessionId
  };
}

async function testBoundaryDetection(testEnv, testCase) {
  const { headers, sessionId } = testEnv;
  
  const result = await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: testCase.message,
    client_message_id: `boundary_test_${Date.now()}`
  }, headers);
  
  let actualRisk = 'low';
  let passed = false;
  
  if (result.status === 403) {
    actualRisk = 'high';
  } else if (result.status === 422) {
    actualRisk = 'medium';
  } else if (result.success) {
    actualRisk = 'low';
  }
  
  // Check if the result matches expectation
  if (testCase.expectedRisk === 'high' && result.status === 403) {
    passed = true;
  } else if (testCase.expectedRisk === 'medium' && result.status === 422) {
    passed = true;
  } else if (testCase.expectedRisk === 'low' && result.success) {
    passed = true;
  }
  
  return {
    passed,
    actualRisk,
    expectedRisk: testCase.expectedRisk,
    status: result.status,
    error: result.error
  };
}

async function runBoundaryTests() {
  log('🚀 Starting Expanded Boundary Tests...', 'bright');
  log(`Testing ${BOUNDARY_TEST_CASES.length} boundary detection cases`, 'cyan');
  
  const testEnv = await setupTestEnvironment();
  if (!testEnv) {
    log('❌ Failed to setup test environment', 'red');
    return;
  }
  
  let passedTests = 0;
  let failedTests = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  
  log('\n📋 Running Boundary Tests...', 'blue');
  
  for (const testCase of BOUNDARY_TEST_CASES) {
    const result = await testBoundaryDetection(testEnv, testCase);
    
    if (result.passed) {
      logTest(testCase.description, 'PASS', `Expected: ${testCase.expectedRisk}, Got: ${result.actualRisk}`);
      passedTests++;
    } else {
      logTest(testCase.description, 'FAIL', `Expected: ${testCase.expectedRisk}, Got: ${result.actualRisk}`);
      failedTests++;
      
      if (testCase.expectedRisk === 'low' && result.actualRisk !== 'low') {
        falsePositives++;
      } else if (testCase.expectedRisk !== 'low' && result.actualRisk === 'low') {
        falseNegatives++;
      }
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  log('\n📊 Boundary Test Results:', 'blue');
  log(`✅ Passed: ${passedTests}`, 'green');
  log(`❌ Failed: ${failedTests}`, 'red');
  log(`⚠️  False Positives: ${falsePositives}`, 'yellow');
  log(`⚠️  False Negatives: ${falseNegatives}`, 'yellow');
  
  const accuracy = (passedTests / BOUNDARY_TEST_CASES.length) * 100;
  log(`📈 Accuracy: ${accuracy.toFixed(1)}%`, accuracy > 90 ? 'green' : accuracy > 80 ? 'yellow' : 'red');
  
  if (falsePositives > 0) {
    log('\n⚠️  False Positives Detected:', 'yellow');
    log('   These are normal conflict messages that were incorrectly flagged', 'yellow');
    log('   Consider adjusting boundary detection to be less aggressive', 'yellow');
  }
  
  if (falseNegatives > 0) {
    log('\n⚠️  False Negatives Detected:', 'yellow');
    log('   These are potentially harmful messages that were not flagged', 'yellow');
    log('   Consider strengthening boundary detection patterns', 'yellow');
  }
  
  if (accuracy > 90) {
    log('\n🎉 Boundary Detection is Working Well!', 'green');
  } else if (accuracy > 80) {
    log('\n⚠️  Boundary Detection Needs Improvement', 'yellow');
  } else {
    log('\n❌ Boundary Detection Needs Significant Work', 'red');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runBoundaryTests();
}

module.exports = {
  runBoundaryTests,
  BOUNDARY_TEST_CASES,
  testBoundaryDetection,
};
