#!/usr/bin/env node

/**
 * Turn-Taking Lock Tests
 * Tests the turn-taking mechanism with two simulated clients
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

async function setupTestUsers() {
  log('\n🔧 Setting up test users...', 'blue');
  
  // Create Alice
  const aliceAuthResult = await callApi('POST', '/auth/verify-code', { 
    email: 'alice@test.com', 
    code: '123456' 
  });
  
  if (!aliceAuthResult.success) {
    logTest('Alice Authentication', 'FAIL', aliceAuthResult.error);
    return null;
  }
  
  // Create Bob
  const bobAuthResult = await callApi('POST', '/auth/verify-code', { 
    email: 'bob@test.com', 
    code: '123456' 
  });
  
  if (!bobAuthResult.success) {
    logTest('Bob Authentication', 'FAIL', bobAuthResult.error);
    return null;
  }
  
  logTest('Test Users Setup', 'PASS');
  
  return {
    alice: {
      token: aliceAuthResult.data.accessToken,
      headers: { Authorization: `Bearer ${aliceAuthResult.data.accessToken}` }
    },
    bob: {
      token: bobAuthResult.data.accessToken,
      headers: { Authorization: `Bearer ${bobAuthResult.data.accessToken}` }
    }
  };
}

async function setupTestSession(users) {
  log('\n🔧 Setting up test session...', 'blue');
  
  // Alice creates a couple
  const coupleResult = await callApi('POST', '/couples', null, users.alice.headers);
  if (!coupleResult.success) {
    logTest('Couple Creation', 'FAIL', coupleResult.error);
    return null;
  }
  
  // Bob joins the couple (simulate invite acceptance)
  const inviteResult = await callApi('POST', '/invites', null, users.alice.headers);
  if (!inviteResult.success) {
    logTest('Invite Creation', 'FAIL', inviteResult.error);
    return null;
  }
  
  // Bob accepts invite
  const acceptResult = await callApi('POST', `/invites/${inviteResult.data.code}/accept`, null, users.bob.headers);
  if (!acceptResult.success) {
    logTest('Invite Acceptance', 'FAIL', acceptResult.error);
    return null;
  }
  
  // Alice creates a session
  const sessionResult = await callApi('POST', '/sessions', null, users.alice.headers);
  if (!sessionResult.success) {
    logTest('Session Creation', 'FAIL', sessionResult.error);
    return null;
  }
  
  logTest('Test Session Setup', 'PASS');
  return sessionResult.data.sessionId;
}

async function testTurnTaking(users, sessionId) {
  log('\n🎯 Testing Turn-Taking Mechanism...', 'blue');
  
  // Test 1: Alice sends first message (should succeed)
  log('   Test 1: Alice sends first message...', 'yellow');
  const aliceMessage1 = await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: 'Hello Bob, I want to talk about our plans for the weekend.',
    client_message_id: 'alice_msg_1'
  }, users.alice.headers);
  
  if (aliceMessage1.success) {
    logTest('Alice First Message', 'PASS');
  } else {
    logTest('Alice First Message', 'FAIL', aliceMessage1.error);
    return false;
  }
  
  // Test 2: Alice tries to send another message immediately (should fail)
  log('   Test 2: Alice tries to send another message...', 'yellow');
  const aliceMessage2 = await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: 'Actually, let me add something else...',
    client_message_id: 'alice_msg_2'
  }, users.alice.headers);
  
  if (aliceMessage2.status === 409) {
    logTest('Alice Turn Lock', 'PASS', 'Alice correctly blocked from sending consecutive messages');
  } else {
    logTest('Alice Turn Lock', 'FAIL', 'Alice should have been blocked');
    return false;
  }
  
  // Test 3: Bob sends message (should succeed)
  log('   Test 3: Bob responds to Alice...', 'yellow');
  const bobMessage1 = await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: 'Hi Alice! I\'d love to hear your ideas for the weekend.',
    client_message_id: 'bob_msg_1'
  }, users.bob.headers);
  
  if (bobMessage1.success) {
    logTest('Bob Response', 'PASS');
  } else {
    logTest('Bob Response', 'FAIL', bobMessage1.error);
    return false;
  }
  
  // Test 4: Bob tries to send another message (should fail)
  log('   Test 4: Bob tries to send another message...', 'yellow');
  const bobMessage2 = await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: 'Let me add one more thing...',
    client_message_id: 'bob_msg_2'
  }, users.bob.headers);
  
  if (bobMessage2.status === 409) {
    logTest('Bob Turn Lock', 'PASS', 'Bob correctly blocked from sending consecutive messages');
  } else {
    logTest('Bob Turn Lock', 'FAIL', 'Bob should have been blocked');
    return false;
  }
  
  // Test 5: Alice responds (should succeed)
  log('   Test 5: Alice responds to Bob...', 'yellow');
  const aliceMessage3 = await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: 'Great! I was thinking we could go hiking on Saturday.',
    client_message_id: 'alice_msg_3'
  }, users.alice.headers);
  
  if (aliceMessage3.success) {
    logTest('Alice Response', 'PASS');
  } else {
    logTest('Alice Response', 'FAIL', aliceMessage3.error);
    return false;
  }
  
  return true;
}

async function testConcurrentAccess(users, sessionId) {
  log('\n⚡ Testing Concurrent Access...', 'blue');
  
  // Simulate both users trying to send messages simultaneously
  log('   Simulating concurrent message attempts...', 'yellow');
  
  const promises = [
    callApi('POST', `/sessions/${sessionId}/messages`, {
      content: 'Concurrent message from Alice',
      client_message_id: 'alice_concurrent'
    }, users.alice.headers),
    
    callApi('POST', `/sessions/${sessionId}/messages`, {
      content: 'Concurrent message from Bob',
      client_message_id: 'bob_concurrent'
    }, users.bob.headers)
  ];
  
  const results = await Promise.all(promises);
  
  // One should succeed, one should fail
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => r.status === 409).length;
  
  if (successCount === 1 && failCount === 1) {
    logTest('Concurrent Access Control', 'PASS', 'Only one message succeeded, one was blocked');
  } else {
    logTest('Concurrent Access Control', 'FAIL', `Expected 1 success, 1 fail. Got ${successCount} success, ${failCount} fails`);
    return false;
  }
  
  return true;
}

async function testTurnLockExpiration(users, sessionId) {
  log('\n⏰ Testing Turn Lock Expiration...', 'blue');
  
  // This test would require modifying the lock duration for testing
  // For now, we'll just verify the lock mechanism is working
  log('   Turn lock expiration test would require shorter lock duration for testing', 'yellow');
  logTest('Turn Lock Expiration', 'SKIP', 'Requires test configuration');
  
  return true;
}

async function runTurnTakingTests() {
  log('🚀 Starting Turn-Taking Tests...', 'bright');
  log('Testing turn-taking mechanism with two simulated clients', 'cyan');
  
  try {
    // Setup
    const users = await setupTestUsers();
    if (!users) {
      log('❌ Failed to setup test users', 'red');
      return;
    }
    
    const sessionId = await setupTestSession(users);
    if (!sessionId) {
      log('❌ Failed to setup test session', 'red');
      return;
    }
    
    // Run tests
    const turnTakingSuccess = await testTurnTaking(users, sessionId);
    if (!turnTakingSuccess) {
      log('❌ Turn-taking tests failed', 'red');
      return;
    }
    
    const concurrentSuccess = await testConcurrentAccess(users, sessionId);
    if (!concurrentSuccess) {
      log('❌ Concurrent access tests failed', 'red');
      return;
    }
    
    await testTurnLockExpiration(users, sessionId);
    
    log('\n🎉 Turn-Taking Tests Completed Successfully!', 'green');
    log('=====================================', 'green');
    log('✅ Turn-taking mechanism is working correctly', 'cyan');
    log('✅ Concurrent access is properly controlled', 'cyan');
    log('✅ Users cannot send consecutive messages', 'cyan');
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTurnTakingTests();
}

module.exports = {
  runTurnTakingTests,
  testTurnTaking,
  testConcurrentAccess,
  testTurnLockExpiration,
};
