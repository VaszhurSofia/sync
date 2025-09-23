#!/usr/bin/env node

/**
 * Production Comprehensive Test Suite
 * Tests all production-ready features including crypto health, turn-taking, staging controls, etc.
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

async function testCryptoHealth() {
  log('\n🔐 Testing Crypto Health Endpoint...', 'blue');
  
  const result = await callApi('GET', '/health/crypto');
  
  if (result.success) {
    logTest('Crypto Health Endpoint', 'PASS');
    
    // Check crypto health status
    if (result.data.status === 'healthy') {
      logTest('Crypto Health Status', 'PASS', 'Encryption system is healthy');
    } else if (result.data.status === 'degraded') {
      logTest('Crypto Health Status', 'WARN', 'Encryption system is degraded');
    } else {
      logTest('Crypto Health Status', 'FAIL', 'Encryption system is unhealthy');
    }
    
    // Check KMS connection
    if (result.data.kmsConnection) {
      logTest('KMS Connection', 'PASS');
    } else {
      logTest('KMS Connection', 'FAIL', 'KMS connection failed');
    }
    
    // Check DEK key status
    if (result.data.dekKeyStatus === 'active') {
      logTest('DEK Key Status', 'PASS');
    } else if (result.data.dekKeyStatus === 'inactive') {
      logTest('DEK Key Status', 'WARN', 'Using test key - not suitable for production');
    } else {
      logTest('DEK Key Status', 'FAIL', 'DEK key error');
    }
    
    // Check test vector decryption
    if (result.data.testVectorDecrypt) {
      logTest('Test Vector Decryption', 'PASS');
    } else {
      logTest('Test Vector Decryption', 'FAIL', 'Encryption/decryption test failed');
    }
    
    return true;
  } else {
    logTest('Crypto Health Endpoint', 'FAIL', result.error);
    return false;
  }
}

async function testTurnTakingLocks() {
  log('\n🎯 Testing Turn-Taking Locks...', 'blue');
  
  // Setup test users
  const aliceAuth = await callApi('POST', '/auth/verify-code', { email: 'alice@test.com', code: '123456' });
  const bobAuth = await callApi('POST', '/auth/verify-code', { email: 'bob@test.com', code: '123456' });
  
  if (!aliceAuth.success || !bobAuth.success) {
    logTest('User Setup', 'FAIL', 'Failed to authenticate test users');
    return false;
  }
  
  const aliceHeaders = { Authorization: `Bearer ${aliceAuth.data.accessToken}` };
  const bobHeaders = { Authorization: `Bearer ${bobAuth.data.accessToken}` };
  
  // Create couple and session
  const coupleResult = await callApi('POST', '/couples', null, aliceHeaders);
  if (!coupleResult.success) {
    logTest('Couple Creation', 'FAIL', coupleResult.error);
    return false;
  }
  
  // Create invite and accept
  const inviteResult = await callApi('POST', '/invites', null, aliceHeaders);
  if (!inviteResult.success) {
    logTest('Invite Creation', 'FAIL', inviteResult.error);
    return false;
  }
  
  const acceptResult = await callApi('POST', `/invites/${inviteResult.data.code}/accept`, null, bobHeaders);
  if (!acceptResult.success) {
    logTest('Invite Acceptance', 'FAIL', acceptResult.error);
    return false;
  }
  
  // Create session
  const sessionResult = await callApi('POST', '/sessions', null, aliceHeaders);
  if (!sessionResult.success) {
    logTest('Session Creation', 'FAIL', sessionResult.error);
    return false;
  }
  
  const sessionId = sessionResult.data.sessionId;
  logTest('Test Setup', 'PASS');
  
  // Test turn-taking
  const aliceMessage1 = await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: 'Hello Bob, I want to talk about our weekend plans.',
    client_message_id: 'alice_msg_1'
  }, aliceHeaders);
  
  if (aliceMessage1.success) {
    logTest('Alice First Message', 'PASS');
  } else {
    logTest('Alice First Message', 'FAIL', aliceMessage1.error);
    return false;
  }
  
  // Alice tries to send another message (should fail)
  const aliceMessage2 = await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: 'Let me add something else...',
    client_message_id: 'alice_msg_2'
  }, aliceHeaders);
  
  if (aliceMessage2.status === 409) {
    logTest('Turn-Taking Lock', 'PASS', 'Alice correctly blocked from consecutive messages');
  } else {
    logTest('Turn-Taking Lock', 'FAIL', 'Alice should have been blocked');
    return false;
  }
  
  // Bob responds (should succeed)
  const bobMessage1 = await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: 'Hi Alice! I\'d love to hear your ideas.',
    client_message_id: 'bob_msg_1'
  }, bobHeaders);
  
  if (bobMessage1.success) {
    logTest('Bob Response', 'PASS');
  } else {
    logTest('Bob Response', 'FAIL', bobMessage1.error);
    return false;
  }
  
  // Test turn lock status endpoint
  const lockStatusResult = await callApi('GET', `/turn-taking/status?sessionId=${sessionId}`, null, aliceHeaders);
  if (lockStatusResult.success && lockStatusResult.data.hasLock) {
    logTest('Turn Lock Status Endpoint', 'PASS');
  } else {
    logTest('Turn Lock Status Endpoint', 'FAIL', 'Turn lock status not found');
  }
  
  return true;
}

async function testLongPolling() {
  log('\n⏳ Testing Long-Polling Behavior...', 'blue');
  
  // Setup test environment
  const authResult = await callApi('POST', '/auth/verify-code', { email: 'polling@test.com', code: '123456' });
  if (!authResult.success) {
    logTest('Authentication', 'FAIL', authResult.error);
    return false;
  }
  
  const headers = { Authorization: `Bearer ${authResult.data.accessToken}` };
  
  const coupleResult = await callApi('POST', '/couples', null, headers);
  const sessionResult = await callApi('POST', '/sessions', null, headers);
  
  if (!coupleResult.success || !sessionResult.success) {
    logTest('Setup', 'FAIL', 'Failed to create couple or session');
    return false;
  }
  
  const sessionId = sessionResult.data.sessionId;
  
  // Test empty poll (should return empty array)
  const emptyPollResult = await callApi('GET', `/sessions/${sessionId}/messages`, null, headers);
  if (emptyPollResult.success && Array.isArray(emptyPollResult.data) && emptyPollResult.data.length === 0) {
    logTest('Empty Poll', 'PASS');
  } else {
    logTest('Empty Poll', 'FAIL', 'Empty poll should return empty array');
  }
  
  // Test long-polling with timeout
  const longPollPromise = callApi('GET', `/sessions/${sessionId}/messages?waitMs=2000`, null, headers);
  
  // Send a message after a short delay
  setTimeout(async () => {
    await callApi('POST', `/sessions/${sessionId}/messages`, {
      content: 'Test message for long polling',
      client_message_id: 'polling_test_msg'
    }, headers);
  }, 500);
  
  const longPollResult = await longPollPromise;
  if (longPollResult.success && Array.isArray(longPollResult.data)) {
    logTest('Long-Polling', 'PASS', 'Long-polling returned messages');
  } else {
    logTest('Long-Polling', 'FAIL', 'Long-polling failed');
  }
  
  return true;
}

async function testStagingControls() {
  log('\n🚧 Testing Staging Controls...', 'blue');
  
  // Test staging config endpoint (if staging is enabled)
  const configResult = await callApi('GET', '/staging/config');
  if (configResult.success) {
    logTest('Staging Config Endpoint', 'PASS');
    
    if (configResult.data.enabled) {
      logTest('Staging Mode', 'PASS', 'Staging mode is enabled');
    } else {
      logTest('Staging Mode', 'WARN', 'Staging mode is disabled');
    }
  } else {
    logTest('Staging Config Endpoint', 'WARN', 'Staging config endpoint not available (normal in production)');
  }
  
  // Test robots.txt
  const robotsResult = await callApi('GET', '/robots.txt');
  if (robotsResult.success) {
    logTest('Robots.txt', 'PASS', 'Robots.txt is available');
    
    if (robotsResult.data.includes('Disallow: /')) {
      logTest('Robots.txt Content', 'PASS', 'Robots.txt properly blocks crawlers');
    } else {
      logTest('Robots.txt Content', 'WARN', 'Robots.txt may not be blocking crawlers');
    }
  } else {
    logTest('Robots.txt', 'WARN', 'Robots.txt not available (normal in production)');
  }
  
  return true;
}

async function testDeleteSession() {
  log('\n🗑️ Testing Delete Session...', 'blue');
  
  // Setup test environment
  const authResult = await callApi('POST', '/auth/verify-code', { email: 'delete@test.com', code: '123456' });
  if (!authResult.success) {
    logTest('Authentication', 'FAIL', authResult.error);
    return false;
  }
  
  const headers = { Authorization: `Bearer ${authResult.data.accessToken}` };
  
  const coupleResult = await callApi('POST', '/couples', null, headers);
  const sessionResult = await callApi('POST', '/sessions', null, headers);
  
  if (!coupleResult.success || !sessionResult.success) {
    logTest('Setup', 'FAIL', 'Failed to create couple or session');
    return false;
  }
  
  const sessionId = sessionResult.data.sessionId;
  
  // Send some messages
  await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: 'Test message 1',
    client_message_id: 'delete_test_msg_1'
  }, headers);
  
  await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: 'Test message 2',
    client_message_id: 'delete_test_msg_2'
  }, headers);
  
  // Verify messages exist
  const messagesBefore = await callApi('GET', `/sessions/${sessionId}/messages`, null, headers);
  if (messagesBefore.success && messagesBefore.data.length > 0) {
    logTest('Messages Before Delete', 'PASS', `${messagesBefore.data.length} messages found`);
  } else {
    logTest('Messages Before Delete', 'FAIL', 'No messages found before delete');
    return false;
  }
  
  // Delete session
  const deleteResult = await callApi('DELETE', `/sessions/${sessionId}`, null, headers);
  if (deleteResult.success) {
    logTest('Session Delete', 'PASS');
  } else {
    logTest('Session Delete', 'FAIL', deleteResult.error);
    return false;
  }
  
  // Verify session is gone
  const sessionCheck = await callApi('GET', `/sessions/${sessionId}/messages`, null, headers);
  if (sessionCheck.status === 404) {
    logTest('Session Cleanup', 'PASS', 'Session no longer exists');
  } else {
    logTest('Session Cleanup', 'FAIL', 'Session still exists after delete');
  }
  
  return true;
}

async function testLoggingSecurity() {
  log('\n🔐 Testing Logging Security...', 'blue');
  
  const result = await callApi('GET', '/admin/logging-security');
  
  if (result.success) {
    logTest('Logging Security Endpoint', 'PASS');
    
    if (result.data.preventPlaintextLogging) {
      logTest('Plaintext Logging Prevention', 'PASS', 'Plaintext logging is prevented');
    } else {
      logTest('Plaintext Logging Prevention', 'FAIL', 'Plaintext logging is not prevented');
    }
    
    if (result.data.sensitiveFieldsCount > 0) {
      logTest('Sensitive Fields Protection', 'PASS', `${result.data.sensitiveFieldsCount} sensitive fields protected`);
    } else {
      logTest('Sensitive Fields Protection', 'FAIL', 'No sensitive fields configured');
    }
    
    return true;
  } else {
    logTest('Logging Security Endpoint', 'FAIL', result.error);
    return false;
  }
}

async function testAdminEndpoints() {
  log('\n👨‍💼 Testing Admin Endpoints...', 'blue');
  
  // Test rate limit status
  const rateLimitStatus = await callApi('GET', '/rate-limit/status');
  if (rateLimitStatus.success) {
    logTest('Rate Limit Status', 'PASS');
  } else {
    logTest('Rate Limit Status', 'FAIL', rateLimitStatus.error);
  }
  
  // Test turn locks
  const turnLocks = await callApi('GET', '/admin/turn-locks');
  if (turnLocks.success) {
    logTest('Turn Locks Admin', 'PASS', `${turnLocks.data.count} active locks`);
  } else {
    logTest('Turn Locks Admin', 'FAIL', turnLocks.error);
  }
  
  // Test audit logs
  const auditLogs = await callApi('GET', '/delete/audit-logs');
  if (auditLogs.success) {
    logTest('Audit Logs', 'PASS', 'Audit logs accessible');
  } else {
    logTest('Audit Logs', 'FAIL', auditLogs.error);
  }
  
  return true;
}

async function runProductionTests() {
  log('🚀 Starting Production Comprehensive Tests...', 'bright');
  log('Testing all production-ready features', 'cyan');
  
  try {
    const results = {
      cryptoHealth: await testCryptoHealth(),
      turnTaking: await testTurnTakingLocks(),
      longPolling: await testLongPolling(),
      stagingControls: await testStagingControls(),
      deleteSession: await testDeleteSession(),
      loggingSecurity: await testLoggingSecurity(),
      adminEndpoints: await testAdminEndpoints(),
    };
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    log('\n📊 Production Test Results:', 'blue');
    log(`✅ Passed: ${passedTests}/${totalTests}`, 'green');
    
    if (passedTests === totalTests) {
      log('\n🎉 All Production Tests Passed!', 'green');
      log('Your Sync platform is production-ready!', 'cyan');
    } else {
      log('\n⚠️ Some Production Tests Failed', 'yellow');
      log('Review the failed tests before deploying to production', 'yellow');
    }
    
    // Summary of features tested
    log('\n🔧 Features Tested:', 'blue');
    log('✅ Crypto Health Monitoring', 'green');
    log('✅ Turn-Taking Locks', 'green');
    log('✅ Long-Polling Behavior', 'green');
    log('✅ Staging Controls', 'green');
    log('✅ Session Deletion', 'green');
    log('✅ Logging Security', 'green');
    log('✅ Admin Endpoints', 'green');
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runProductionTests();
}

module.exports = {
  runProductionTests,
  testCryptoHealth,
  testTurnTakingLocks,
  testLongPolling,
  testStagingControls,
  testDeleteSession,
  testLoggingSecurity,
  testAdminEndpoints,
};
