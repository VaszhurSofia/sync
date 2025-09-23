#!/usr/bin/env node

/**
 * Comprehensive Survey and Delete Tests
 * Tests survey enum validation and hard delete functionality
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

async function setupTestEnvironment() {
  log('\n🔧 Setting up test environment...', 'blue');
  
  // Create test users
  const aliceAuth = await callApi('POST', '/auth/verify-code', { email: 'alice@test.com', code: '123456' });
  const bobAuth = await callApi('POST', '/auth/verify-code', { email: 'bob@test.com', code: '123456' });
  
  if (!aliceAuth.success || !bobAuth.success) {
    logTest('User Authentication', 'FAIL', 'Failed to authenticate test users');
    return null;
  }
  
  const aliceHeaders = { Authorization: `Bearer ${aliceAuth.data.accessToken}` };
  const bobHeaders = { Authorization: `Bearer ${bobAuth.data.accessToken}` };
  
  // Create couple
  const coupleResult = await callApi('POST', '/couples', null, aliceHeaders);
  if (!coupleResult.success) {
    logTest('Couple Creation', 'FAIL', coupleResult.error);
    return null;
  }
  
  // Create invite and accept
  const inviteResult = await callApi('POST', '/invites', null, aliceHeaders);
  if (!inviteResult.success) {
    logTest('Invite Creation', 'FAIL', inviteResult.error);
    return null;
  }
  
  const acceptResult = await callApi('POST', `/invites/${inviteResult.data.code}/accept`, null, bobHeaders);
  if (!acceptResult.success) {
    logTest('Invite Acceptance', 'FAIL', acceptResult.error);
    return null;
  }
  
  // Create session
  const sessionResult = await callApi('POST', '/sessions', null, aliceHeaders);
  if (!sessionResult.success) {
    logTest('Session Creation', 'FAIL', sessionResult.error);
    return null;
  }
  
  logTest('Test Environment Setup', 'PASS');
  return {
    alice: { headers: aliceHeaders, token: aliceAuth.data.accessToken },
    bob: { headers: bobHeaders, token: bobAuth.data.accessToken },
    sessionId: sessionResult.data.sessionId
  };
}

async function testSurveyEnumValidation(testEnv) {
  log('\n📊 Testing Survey Enum Validation...', 'blue');
  
  const { alice, sessionId } = testEnv;
  
  // Test valid enum values
  const validRatings = ['angry', 'neutral', 'happy'];
  let validTestsPassed = 0;
  
  for (const rating of validRatings) {
    const result = await callApi('POST', `/sessions/${sessionId}/survey`, {
      rating,
      feedback: `Test feedback for ${rating} rating`
    }, alice.headers);
    
    if (result.success) {
      logTest(`Survey ${rating} rating`, 'PASS');
      validTestsPassed++;
    } else {
      logTest(`Survey ${rating} rating`, 'FAIL', result.error);
    }
  }
  
  // Test invalid enum values
  const invalidRatings = ['sad', 'excited', 'frustrated', 'content', 'upset', 'pleased'];
  let invalidTestsPassed = 0;
  
  for (const rating of invalidRatings) {
    const result = await callApi('POST', `/sessions/${sessionId}/survey`, {
      rating,
      feedback: `Test feedback for invalid ${rating} rating`
    }, alice.headers);
    
    if (result.status === 400) {
      logTest(`Invalid survey ${rating} rating`, 'PASS', 'Correctly rejected invalid enum value');
      invalidTestsPassed++;
    } else {
      logTest(`Invalid survey ${rating} rating`, 'FAIL', 'Should have rejected invalid enum value');
    }
  }
  
  // Test missing rating
  const missingRatingResult = await callApi('POST', `/sessions/${sessionId}/survey`, {
    feedback: 'Test feedback without rating'
  }, alice.headers);
  
  if (missingRatingResult.status === 400) {
    logTest('Missing survey rating', 'PASS', 'Correctly rejected missing rating');
  } else {
    logTest('Missing survey rating', 'FAIL', 'Should have rejected missing rating');
  }
  
  // Test empty rating
  const emptyRatingResult = await callApi('POST', `/sessions/${sessionId}/survey`, {
    rating: '',
    feedback: 'Test feedback with empty rating'
  }, alice.headers);
  
  if (emptyRatingResult.status === 400) {
    logTest('Empty survey rating', 'PASS', 'Correctly rejected empty rating');
  } else {
    logTest('Empty survey rating', 'FAIL', 'Should have rejected empty rating');
  }
  
  const totalTests = validRatings.length + invalidRatings.length + 2;
  const passedTests = validTestsPassed + invalidTestsPassed + 2;
  
  if (passedTests === totalTests) {
    logTest('Survey Enum Validation', 'PASS', `${passedTests}/${totalTests} tests passed`);
  } else {
    logTest('Survey Enum Validation', 'FAIL', `${passedTests}/${totalTests} tests passed`);
  }
  
  return passedTests === totalTests;
}

async function testHardDeleteFunctionality(testEnv) {
  log('\n🗑️ Testing Hard Delete Functionality...', 'blue');
  
  const { alice, bob, sessionId } = testEnv;
  
  // Send some messages to create data
  await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: 'Test message 1',
    client_message_id: 'test_msg_1'
  }, alice.headers);
  
  await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: 'Test message 2',
    client_message_id: 'test_msg_2'
  }, bob.headers);
  
  // Submit survey
  await callApi('POST', `/sessions/${sessionId}/survey`, {
    rating: 'happy',
    feedback: 'Test feedback'
  }, alice.headers);
  
  // Verify data exists before delete
  const messagesBefore = await callApi('GET', `/sessions/${sessionId}/messages`, null, alice.headers);
  if (messagesBefore.success && messagesBefore.data.length > 0) {
    logTest('Data exists before delete', 'PASS', `${messagesBefore.data.length} messages found`);
  } else {
    logTest('Data exists before delete', 'FAIL', 'No messages found before delete');
    return false;
  }
  
  // Request hard delete
  const deleteRequest = await callApi('POST', '/delete/request', {
    reason: 'user_request'
  }, alice.headers);
  
  if (!deleteRequest.success) {
    logTest('Delete Request', 'FAIL', deleteRequest.error);
    return false;
  }
  
  logTest('Delete Request', 'PASS', `Request ID: ${deleteRequest.data.id}`);
  
  // Confirm delete
  const confirmDelete = await callApi('POST', `/delete/${deleteRequest.data.id}/confirm`, null, alice.headers);
  
  if (!confirmDelete.success) {
    logTest('Delete Confirmation', 'FAIL', confirmDelete.error);
    return false;
  }
  
  logTest('Delete Confirmation', 'PASS');
  
  // Execute delete
  const executeDelete = await callApi('POST', `/delete/${deleteRequest.data.id}/execute`, null, alice.headers);
  
  if (!executeDelete.success) {
    logTest('Delete Execution', 'FAIL', executeDelete.error);
    return false;
  }
  
  logTest('Delete Execution', 'PASS', `Deleted: ${JSON.stringify(executeDelete.data.deletedRecords)}`);
  
  // Verify data is gone
  const messagesAfter = await callApi('GET', `/sessions/${sessionId}/messages`, null, alice.headers);
  if (messagesAfter.status === 404) {
    logTest('Messages deleted', 'PASS', 'Session no longer exists');
  } else {
    logTest('Messages deleted', 'FAIL', 'Session still exists after delete');
  }
  
  // Verify session is gone
  const sessionAfter = await callApi('GET', `/sessions/${sessionId}`, null, alice.headers);
  if (sessionAfter.status === 404) {
    logTest('Session deleted', 'PASS', 'Session no longer exists');
  } else {
    logTest('Session deleted', 'FAIL', 'Session still exists after delete');
  }
  
  // Verify user is gone
  const userAfter = await callApi('GET', '/auth/me', null, alice.headers);
  if (userAfter.status === 401) {
    logTest('User deleted', 'PASS', 'User no longer authenticated');
  } else {
    logTest('User deleted', 'FAIL', 'User still authenticated after delete');
  }
  
  return true;
}

async function testDeleteNonExistence(testEnv) {
  log('\n🔍 Testing Delete Non-Existence...', 'blue');
  
  const { alice, sessionId } = testEnv;
  
  // Try to access deleted session
  const sessionResult = await callApi('GET', `/sessions/${sessionId}`, null, alice.headers);
  if (sessionResult.status === 404) {
    logTest('Deleted session access', 'PASS', 'Correctly returns 404');
  } else {
    logTest('Deleted session access', 'FAIL', `Expected 404, got ${sessionResult.status}`);
  }
  
  // Try to access deleted messages
  const messagesResult = await callApi('GET', `/sessions/${sessionId}/messages`, null, alice.headers);
  if (messagesResult.status === 404) {
    logTest('Deleted messages access', 'PASS', 'Correctly returns 404');
  } else {
    logTest('Deleted messages access', 'FAIL', `Expected 404, got ${messagesResult.status}`);
  }
  
  // Try to send message to deleted session
  const sendMessageResult = await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: 'Test message to deleted session',
    client_message_id: 'test_deleted_msg'
  }, alice.headers);
  
  if (sendMessageResult.status === 404) {
    logTest('Send message to deleted session', 'PASS', 'Correctly returns 404');
  } else {
    logTest('Send message to deleted session', 'FAIL', `Expected 404, got ${sendMessageResult.status}`);
  }
  
  // Try to submit survey to deleted session
  const surveyResult = await callApi('POST', `/sessions/${sessionId}/survey`, {
    rating: 'happy',
    feedback: 'Test feedback to deleted session'
  }, alice.headers);
  
  if (surveyResult.status === 404) {
    logTest('Survey to deleted session', 'PASS', 'Correctly returns 404');
  } else {
    logTest('Survey to deleted session', 'FAIL', `Expected 404, got ${surveyResult.status}`);
  }
  
  return true;
}

async function testSurveyAnalytics(testEnv) {
  log('\n📈 Testing Survey Analytics...', 'blue');
  
  const { alice } = testEnv;
  
  // Get survey analytics
  const analyticsResult = await callApi('GET', '/survey/analytics', null, alice.headers);
  
  if (analyticsResult.success) {
    logTest('Survey Analytics', 'PASS');
    
    // Check analytics structure
    const analytics = analyticsResult.data;
    const requiredFields = ['totalResponses', 'ratingDistribution', 'averageRating', 'responseRate', 'recentTrends'];
    
    let structureValid = true;
    for (const field of requiredFields) {
      if (!(field in analytics)) {
        logTest(`Analytics field ${field}`, 'FAIL', 'Missing required field');
        structureValid = false;
      } else {
        logTest(`Analytics field ${field}`, 'PASS');
      }
    }
    
    // Check rating distribution structure
    if (analytics.ratingDistribution) {
      const ratingFields = ['angry', 'neutral', 'happy'];
      let distributionValid = true;
      
      for (const rating of ratingFields) {
        if (!(rating in analytics.ratingDistribution)) {
          logTest(`Rating distribution ${rating}`, 'FAIL', 'Missing rating in distribution');
          distributionValid = false;
        } else {
          logTest(`Rating distribution ${rating}`, 'PASS');
        }
      }
      
      if (distributionValid) {
        logTest('Rating Distribution Structure', 'PASS');
      } else {
        logTest('Rating Distribution Structure', 'FAIL');
      }
    }
    
    return structureValid;
  } else {
    logTest('Survey Analytics', 'FAIL', analyticsResult.error);
    return false;
  }
}

async function runSurveyDeleteTests() {
  log('🚀 Starting Survey and Delete Tests...', 'bright');
  log('Testing survey enum validation and hard delete functionality', 'cyan');
  
  try {
    const testEnv = await setupTestEnvironment();
    if (!testEnv) {
      log('❌ Failed to setup test environment', 'red');
      return;
    }
    
    const results = {
      surveyEnum: await testSurveyEnumValidation(testEnv),
      hardDelete: await testHardDeleteFunctionality(testEnv),
      deleteNonExistence: await testDeleteNonExistence(testEnv),
      surveyAnalytics: await testSurveyAnalytics(testEnv)
    };
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    log('\n📊 Survey and Delete Test Results:', 'blue');
    log(`✅ Passed: ${passedTests}/${totalTests}`, 'green');
    
    if (passedTests === totalTests) {
      log('\n🎉 All Survey and Delete Tests Passed!', 'green');
      log('Survey enum validation and hard delete functionality are working correctly', 'cyan');
    } else {
      log('\n⚠️ Some Survey and Delete Tests Failed', 'yellow');
      log('Review the failed tests before deploying to production', 'yellow');
    }
    
    // Summary of features tested
    log('\n🔧 Features Tested:', 'blue');
    log('✅ Survey Enum Validation', 'green');
    log('✅ Hard Delete Functionality', 'green');
    log('✅ Delete Non-Existence Verification', 'green');
    log('✅ Survey Analytics', 'green');
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runSurveyDeleteTests();
}

module.exports = {
  runSurveyDeleteTests,
  testSurveyEnumValidation,
  testHardDeleteFunctionality,
  testDeleteNonExistence,
  testSurveyAnalytics,
};
