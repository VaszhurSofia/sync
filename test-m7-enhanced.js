#!/usr/bin/env node

/**
 * M7 Enhanced API Test Script
 * Tests accessibility, rate limiting, and improved copy
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// Test configuration
const TEST_CONFIG = {
  maxConcurrentRequests: 10,
  rateLimitTestRequests: 15,
  testDelay: 1000, // 1 second between tests
};

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

async function testHealthCheck() {
  log('\n🔍 Testing Health Check...', 'blue');
  
  const result = await callApi('GET', '/health');
  
  if (result.success) {
    logTest('Health Check', 'PASS', `Features: ${result.data.features?.join(', ')}`);
    
    // Check for M7 features
    if (result.data.rateLimiting === 'enabled') {
      logTest('Rate Limiting Feature', 'PASS');
    } else {
      logTest('Rate Limiting Feature', 'FAIL', 'Rate limiting not enabled');
    }
    
    if (result.data.accessibility === 'enabled') {
      logTest('Accessibility Feature', 'PASS');
    } else {
      logTest('Accessibility Feature', 'FAIL', 'Accessibility not enabled');
    }
  } else {
    logTest('Health Check', 'FAIL', result.error);
  }
}

async function testRateLimitStatus() {
  log('\n⚡ Testing Rate Limit Status...', 'blue');
  
  const result = await callApi('GET', '/rate-limit/status');
  
  if (result.success) {
    logTest('Rate Limit Status Endpoint', 'PASS');
    
    // Check rate limit configurations
    const configs = Object.keys(result.data);
    logTest('Rate Limit Configurations', 'PASS', `Found ${configs.length} rate limit types: ${configs.join(', ')}`);
    
    // Display rate limit info
    for (const [type, config] of Object.entries(result.data)) {
      log(`   ${type}: ${config.remaining}/${config.limit} remaining`, 'cyan');
    }
  } else {
    logTest('Rate Limit Status Endpoint', 'FAIL', result.error);
  }
}

async function testAuthenticationRateLimit() {
  log('\n🔐 Testing Authentication Rate Limiting...', 'blue');
  
  // Test normal authentication
  const authResult = await callApi('POST', '/auth/request-code', { email: 'test@example.com' });
  if (authResult.success) {
    logTest('Normal Authentication', 'PASS');
  } else {
    logTest('Normal Authentication', 'FAIL', authResult.error);
  }
  
  // Test rate limiting by making multiple requests
  log('   Testing rate limit by making multiple auth requests...', 'yellow');
  const promises = [];
  for (let i = 0; i < 6; i++) { // Exceed the 5 request limit
    promises.push(callApi('POST', '/auth/request-code', { email: `test${i}@example.com` }));
  }
  
  const results = await Promise.all(promises);
  const rateLimited = results.filter(r => r.status === 429);
  
  if (rateLimited.length > 0) {
    logTest('Authentication Rate Limiting', 'PASS', `${rateLimited.length} requests were rate limited`);
    
    // Check rate limit headers
    const rateLimitHeaders = rateLimited[0].headers;
    if (rateLimitHeaders['x-ratelimit-limit']) {
      logTest('Rate Limit Headers', 'PASS', `Limit: ${rateLimitHeaders['x-ratelimit-limit']}, Remaining: ${rateLimitHeaders['x-ratelimit-remaining']}`);
    } else {
      logTest('Rate Limit Headers', 'FAIL', 'Rate limit headers not found');
    }
  } else {
    logTest('Authentication Rate Limiting', 'FAIL', 'No requests were rate limited');
  }
}

async function testMessageRateLimit() {
  log('\n💬 Testing Message Rate Limiting...', 'blue');
  
  // First, authenticate and create a session
  const authResult = await callApi('POST', '/auth/verify-code', { email: 'alice@example.com', code: '123456' });
  if (!authResult.success) {
    logTest('Authentication for Message Test', 'FAIL', authResult.error);
    return;
  }
  
  const token = authResult.data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  
  // Create a couple and session
  const coupleResult = await callApi('POST', '/couples', null, headers);
  if (!coupleResult.success) {
    logTest('Couple Creation for Message Test', 'FAIL', coupleResult.error);
    return;
  }
  
  const sessionResult = await callApi('POST', '/sessions', null, headers);
  if (!sessionResult.success) {
    logTest('Session Creation for Message Test', 'FAIL', sessionResult.error);
    return;
  }
  
  const sessionId = sessionResult.data.sessionId;
  logTest('Setup for Message Rate Limit Test', 'PASS');
  
  // Test message rate limiting
  log('   Testing message rate limit by sending multiple messages...', 'yellow');
  const messagePromises = [];
  for (let i = 0; i < 12; i++) { // Exceed the 10 message limit
    messagePromises.push(
      callApi('POST', `/sessions/${sessionId}/messages`, {
        content: `Test message ${i}`,
        client_message_id: `msg_${i}`
      }, headers)
    );
  }
  
  const messageResults = await Promise.all(messagePromises);
  const rateLimitedMessages = messageResults.filter(r => r.status === 429);
  
  if (rateLimitedMessages.length > 0) {
    logTest('Message Rate Limiting', 'PASS', `${rateLimitedMessages.length} messages were rate limited`);
  } else {
    logTest('Message Rate Limiting', 'FAIL', 'No messages were rate limited');
  }
}

async function testDynamicRateLimit() {
  log('\n🎯 Testing Dynamic Rate Limiting...', 'blue');
  
  // Test with a user who has safety violations
  const authResult = await callApi('POST', '/auth/verify-code', { email: 'violator@example.com', code: '123456' });
  if (!authResult.success) {
    logTest('Authentication for Dynamic Rate Limit Test', 'FAIL', authResult.error);
    return;
  }
  
  const token = authResult.data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  
  // Create a couple and session
  const coupleResult = await callApi('POST', '/couples', null, headers);
  if (!coupleResult.success) {
    logTest('Couple Creation for Dynamic Rate Limit Test', 'FAIL', coupleResult.error);
    return;
  }
  
  const sessionResult = await callApi('POST', '/sessions', null, headers);
  if (!sessionResult.success) {
    logTest('Session Creation for Dynamic Rate Limit Test', 'FAIL', sessionResult.error);
    return;
  }
  
  const sessionId = sessionResult.data.sessionId;
  
  // Send messages with safety violations to trigger dynamic rate limiting
  log('   Triggering safety violations to test dynamic rate limiting...', 'yellow');
  
  const violationPromises = [];
  for (let i = 0; i < 6; i++) {
    violationPromises.push(
      callApi('POST', `/sessions/${sessionId}/messages`, {
        content: 'I want to hurt myself', // This should trigger safety violation
        client_message_id: `violation_${i}`
      }, headers)
    );
  }
  
  const violationResults = await Promise.all(violationPromises);
  const violations = violationResults.filter(r => r.status === 403 || r.status === 422);
  
  if (violations.length > 0) {
    logTest('Safety Violation Detection', 'PASS', `${violations.length} safety violations detected`);
    
    // Now test if dynamic rate limiting is applied
    const normalMessageResult = await callApi('POST', `/sessions/${sessionId}/messages`, {
      content: 'This is a normal message',
      client_message_id: 'normal_msg'
    }, headers);
    
    if (normalMessageResult.status === 429) {
      logTest('Dynamic Rate Limiting', 'PASS', 'Rate limits adjusted based on safety violations');
    } else {
      logTest('Dynamic Rate Limiting', 'WARN', 'Dynamic rate limiting may not be working as expected');
    }
  } else {
    logTest('Safety Violation Detection', 'FAIL', 'No safety violations detected');
  }
}

async function testSurveyRateLimit() {
  log('\n📊 Testing Survey Rate Limiting...', 'blue');
  
  const authResult = await callApi('POST', '/auth/verify-code', { email: 'survey@example.com', code: '123456' });
  if (!authResult.success) {
    logTest('Authentication for Survey Rate Limit Test', 'FAIL', authResult.error);
    return;
  }
  
  const token = authResult.data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  
  // Create a couple and session
  const coupleResult = await callApi('POST', '/couples', null, headers);
  if (!coupleResult.success) {
    logTest('Couple Creation for Survey Rate Limit Test', 'FAIL', coupleResult.error);
    return;
  }
  
  const sessionResult = await callApi('POST', '/sessions', null, headers);
  if (!sessionResult.success) {
    logTest('Session Creation for Survey Rate Limit Test', 'FAIL', sessionResult.error);
    return;
  }
  
  const sessionId = sessionResult.data.sessionId;
  
  // Test survey rate limiting
  log('   Testing survey rate limit by submitting multiple surveys...', 'yellow');
  const surveyPromises = [];
  for (let i = 0; i < 6; i++) { // Exceed the 5 survey limit
    surveyPromises.push(
      callApi('POST', `/sessions/${sessionId}/survey`, {
        rating: 'happy',
        feedback: `Test feedback ${i}`
      }, headers)
    );
  }
  
  const surveyResults = await Promise.all(surveyPromises);
  const rateLimitedSurveys = surveyResults.filter(r => r.status === 429);
  
  if (rateLimitedSurveys.length > 0) {
    logTest('Survey Rate Limiting', 'PASS', `${rateLimitedSurveys.length} surveys were rate limited`);
  } else {
    logTest('Survey Rate Limiting', 'FAIL', 'No surveys were rate limited');
  }
}

async function testDeleteRateLimit() {
  log('\n🗑️ Testing Delete Rate Limiting...', 'blue');
  
  const authResult = await callApi('POST', '/auth/verify-code', { email: 'delete@example.com', code: '123456' });
  if (!authResult.success) {
    logTest('Authentication for Delete Rate Limit Test', 'FAIL', authResult.error);
    return;
  }
  
  const token = authResult.data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  
  // Test delete rate limiting
  log('   Testing delete rate limit by making multiple delete requests...', 'yellow');
  const deletePromises = [];
  for (let i = 0; i < 4; i++) { // Exceed the 3 delete limit
    deletePromises.push(
      callApi('POST', '/delete/request', {
        reason: 'user_request'
      }, headers)
    );
  }
  
  const deleteResults = await Promise.all(deletePromises);
  const rateLimitedDeletes = deleteResults.filter(r => r.status === 429);
  
  if (rateLimitedDeletes.length > 0) {
    logTest('Delete Rate Limiting', 'PASS', `${rateLimitedDeletes.length} delete requests were rate limited`);
  } else {
    logTest('Delete Rate Limiting', 'FAIL', 'No delete requests were rate limited');
  }
}

async function testRateLimitReset() {
  log('\n🔄 Testing Rate Limit Reset...', 'blue');
  
  const authResult = await callApi('POST', '/auth/verify-code', { email: 'reset@example.com', code: '123456' });
  if (!authResult.success) {
    logTest('Authentication for Rate Limit Reset Test', 'FAIL', authResult.error);
    return;
  }
  
  const token = authResult.data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  
  // Get user ID for reset
  const userResult = await callApi('GET', '/auth/me', null, headers);
  if (!userResult.success) {
    logTest('Get User Info for Reset Test', 'FAIL', userResult.error);
    return;
  }
  
  const userId = userResult.data.id;
  
  // Test rate limit reset
  const resetResult = await callApi('POST', '/admin/rate-limit/reset', {
    clientId: `user:${userId}`
  });
  
  if (resetResult.success) {
    logTest('Rate Limit Reset', 'PASS', resetResult.data.message);
  } else {
    logTest('Rate Limit Reset', 'FAIL', resetResult.error);
  }
}

async function testAccessibilityFeatures() {
  log('\n♿ Testing Accessibility Features...', 'blue');
  
  // Test that all endpoints return proper error messages
  const testCases = [
    { endpoint: '/auth/verify-code', method: 'POST', data: { email: 'test@example.com' }, expectedStatus: 401 },
    { endpoint: '/couples', method: 'POST', expectedStatus: 401 },
    { endpoint: '/sessions', method: 'POST', expectedStatus: 401 },
  ];
  
  for (const testCase of testCases) {
    const result = await callApi(testCase.method, testCase.endpoint, testCase.data);
    
    if (result.status === testCase.expectedStatus) {
      logTest(`Accessibility - ${testCase.endpoint}`, 'PASS', 'Proper error response');
      
      // Check for clear error messages
      if (result.error && result.error.error) {
        logTest(`Clear Error Message - ${testCase.endpoint}`, 'PASS', result.error.error);
      } else {
        logTest(`Clear Error Message - ${testCase.endpoint}`, 'WARN', 'Error message could be clearer');
      }
    } else {
      logTest(`Accessibility - ${testCase.endpoint}`, 'FAIL', `Expected ${testCase.expectedStatus}, got ${result.status}`);
    }
  }
}

async function runAllTests() {
  log('🚀 Starting M7 Enhanced API Tests...', 'bright');
  log('=====================================', 'bright');
  
  try {
    await testHealthCheck();
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    await testRateLimitStatus();
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    await testAuthenticationRateLimit();
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    await testMessageRateLimit();
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    await testDynamicRateLimit();
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    await testSurveyRateLimit();
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    await testDeleteRateLimit();
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    await testRateLimitReset();
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    await testAccessibilityFeatures();
    
    log('\n🎉 M7 Enhanced API Tests Completed!', 'green');
    log('=====================================', 'green');
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testHealthCheck,
  testRateLimitStatus,
  testAuthenticationRateLimit,
  testMessageRateLimit,
  testDynamicRateLimit,
  testSurveyRateLimit,
  testDeleteRateLimit,
  testRateLimitReset,
  testAccessibilityFeatures,
};
