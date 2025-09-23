#!/usr/bin/env node

/**
 * M7 Comprehensive Test Suite
 * Tests all M1-M7 features with improved copy and accessibility
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';
const WEBSITE_BASE = 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  testDelay: 2000, // 2 seconds between major test sections
  requestTimeout: 10000, // 10 seconds timeout for requests
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

function logSection(sectionName) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`🧪 ${sectionName}`, 'bright');
  log(`${'='.repeat(60)}`, 'blue');
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
      timeout: TEST_CONFIG.requestTimeout,
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

async function testM1Authentication() {
  logSection('M1 - Authentication & Couples');
  
  // Test health check
  const healthResult = await callApi('GET', '/health');
  if (healthResult.success) {
    logTest('Health Check', 'PASS', `Features: ${healthResult.data.features?.join(', ')}`);
  } else {
    logTest('Health Check', 'FAIL', healthResult.error);
    return false;
  }
  
  // Test authentication flow
  const requestCodeResult = await callApi('POST', '/auth/request-code', { email: 'alice@example.com' });
  if (requestCodeResult.success) {
    logTest('Request Code', 'PASS');
  } else {
    logTest('Request Code', 'FAIL', requestCodeResult.error);
    return false;
  }
  
  const verifyCodeResult = await callApi('POST', '/auth/verify-code', { email: 'alice@example.com', code: '123456' });
  if (verifyCodeResult.success) {
    logTest('Verify Code', 'PASS');
    return verifyCodeResult.data.accessToken;
  } else {
    logTest('Verify Code', 'FAIL', verifyCodeResult.error);
    return false;
  }
}

async function testM1Couples(token) {
  const headers = { Authorization: `Bearer ${token}` };
  
  // Test couple creation
  const coupleResult = await callApi('POST', '/couples', null, headers);
  if (coupleResult.success) {
    logTest('Create Couple', 'PASS');
    
    // Test invite creation
    const inviteResult = await callApi('POST', '/invites', null, headers);
    if (inviteResult.success) {
      logTest('Create Invite', 'PASS');
      
      // Test couple info retrieval
      const coupleInfoResult = await callApi('GET', '/couples/me', null, headers);
      if (coupleInfoResult.success) {
        logTest('Get Couple Info', 'PASS');
        return coupleResult.data.coupleId;
      } else {
        logTest('Get Couple Info', 'FAIL', coupleInfoResult.error);
      }
    } else {
      logTest('Create Invite', 'FAIL', inviteResult.error);
    }
  } else {
    logTest('Create Couple', 'FAIL', coupleResult.error);
  }
  
  return false;
}

async function testM2Sessions(token, coupleId) {
  logSection('M2 - Sessions & Messages');
  
  const headers = { Authorization: `Bearer ${token}` };
  
  // Test session creation
  const sessionResult = await callApi('POST', '/sessions', null, headers);
  if (sessionResult.success) {
    logTest('Create Session', 'PASS');
    const sessionId = sessionResult.data.sessionId;
    
    // Test message sending
    const messageResult = await callApi('POST', `/sessions/${sessionId}/messages`, {
      content: 'Hello, this is a test message',
      client_message_id: 'test_msg_1'
    }, headers);
    
    if (messageResult.success) {
      logTest('Send Message', 'PASS');
      
      // Test message retrieval
      const getMessagesResult = await callApi('GET', `/sessions/${sessionId}/messages`, null, headers);
      if (getMessagesResult.success) {
        logTest('Get Messages', 'PASS');
        
        // Test session end
        const endSessionResult = await callApi('POST', `/sessions/${sessionId}/end`, null, headers);
        if (endSessionResult.success) {
          logTest('End Session', 'PASS');
          return sessionId;
        } else {
          logTest('End Session', 'FAIL', endSessionResult.error);
        }
      } else {
        logTest('Get Messages', 'FAIL', getMessagesResult.error);
      }
    } else {
      logTest('Send Message', 'FAIL', messageResult.error);
    }
  } else {
    logTest('Create Session', 'FAIL', sessionResult.error);
  }
  
  return false;
}

async function testM3AI(token) {
  logSection('M3 - AI Orchestrator');
  
  const headers = { Authorization: `Bearer ${token}` };
  
  // Create a new session for AI testing
  const sessionResult = await callApi('POST', '/sessions', null, headers);
  if (!sessionResult.success) {
    logTest('AI Session Creation', 'FAIL', sessionResult.error);
    return false;
  }
  
  const sessionId = sessionResult.data.sessionId;
  
  // Send messages from both partners to trigger AI response
  const message1Result = await callApi('POST', `/sessions/${sessionId}/messages`, {
    content: 'I feel like we need to spend more quality time together',
    client_message_id: 'ai_test_msg_1'
  }, headers);
  
  if (message1Result.success) {
    logTest('Partner A Message', 'PASS');
    
    // Wait a moment for turn to switch
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const message2Result = await callApi('POST', `/sessions/${sessionId}/messages`, {
      content: 'I understand, but I\'ve been really busy with work lately',
      client_message_id: 'ai_test_msg_2'
    }, headers);
    
    if (message2Result.success) {
      logTest('Partner B Message', 'PASS');
      
      // Wait for AI response
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check for AI response
      const messagesResult = await callApi('GET', `/sessions/${sessionId}/messages`, null, headers);
      if (messagesResult.success) {
        const aiMessages = messagesResult.data.filter(msg => msg.sender === 'ai');
        if (aiMessages.length > 0) {
          logTest('AI Response Generated', 'PASS');
          
          // Validate AI response structure
          try {
            const aiContent = JSON.parse(aiMessages[0].content);
            if (aiContent.mirror && aiContent.clarify && aiContent.micro_actions) {
              logTest('AI Response Structure', 'PASS');
              return true;
            } else {
              logTest('AI Response Structure', 'FAIL', 'Missing required fields');
            }
          } catch (e) {
            logTest('AI Response Structure', 'FAIL', 'Invalid JSON structure');
          }
        } else {
          logTest('AI Response Generated', 'FAIL', 'No AI response found');
        }
      } else {
        logTest('Get AI Messages', 'FAIL', messagesResult.error);
      }
    } else {
      logTest('Partner B Message', 'FAIL', message2Result.error);
    }
  } else {
    logTest('Partner A Message', 'FAIL', message1Result.error);
  }
  
  return false;
}

async function testM4Safety(token) {
  logSection('M4 - Safety & Boundary Detection');
  
  const headers = { Authorization: `Bearer ${token}` };
  
  // Test safety status endpoint
  const safetyStatusResult = await callApi('GET', '/safety/status', null, headers);
  if (safetyStatusResult.success) {
    logTest('Safety Status Endpoint', 'PASS');
    
    // Test EU resources endpoint
    const euResourcesResult = await callApi('GET', '/safety/eu-resources', null, headers);
    if (euResourcesResult.success) {
      logTest('EU Resources Endpoint', 'PASS');
      
      // Test safety violation detection
      const sessionResult = await callApi('POST', '/sessions', null, headers);
      if (sessionResult.success) {
        const sessionId = sessionResult.data.sessionId;
        
        const unsafeMessageResult = await callApi('POST', `/sessions/${sessionId}/messages`, {
          content: 'I want to hurt myself',
          client_message_id: 'safety_test_msg'
        }, headers);
        
        if (unsafeMessageResult.status === 403 || unsafeMessageResult.status === 422) {
          logTest('Safety Violation Detection', 'PASS');
          
          // Check for improved error message
          if (unsafeMessageResult.error && unsafeMessageResult.error.message) {
            const message = unsafeMessageResult.error.message;
            if (message.includes('concerned') || message.includes('wellbeing') || message.includes('support')) {
              logTest('Improved Safety Message', 'PASS', 'Message is empathetic and supportive');
            } else {
              logTest('Improved Safety Message', 'WARN', 'Message could be more empathetic');
            }
          }
          
          return true;
        } else {
          logTest('Safety Violation Detection', 'FAIL', 'Unsafe message was not blocked');
        }
      } else {
        logTest('Safety Session Creation', 'FAIL', sessionResult.error);
      }
    } else {
      logTest('EU Resources Endpoint', 'FAIL', euResourcesResult.error);
    }
  } else {
    logTest('Safety Status Endpoint', 'FAIL', safetyStatusResult.error);
  }
  
  return false;
}

async function testM5Survey(token) {
  logSection('M5 - Survey & Delete');
  
  const headers = { Authorization: `Bearer ${token}` };
  
  // Test survey submission
  const sessionResult = await callApi('POST', '/sessions', null, headers);
  if (sessionResult.success) {
    const sessionId = sessionResult.data.sessionId;
    
    const surveyResult = await callApi('POST', `/sessions/${sessionId}/survey`, {
      rating: 'happy',
      feedback: 'This was a helpful conversation'
    }, headers);
    
    if (surveyResult.success) {
      logTest('Survey Submission', 'PASS');
      
      // Test survey analytics
      const analyticsResult = await callApi('GET', '/survey/analytics', null, headers);
      if (analyticsResult.success) {
        logTest('Survey Analytics', 'PASS');
        
        // Test delete request
        const deleteRequestResult = await callApi('POST', '/delete/request', {
          reason: 'user_request'
        }, headers);
        
        if (deleteRequestResult.success) {
          logTest('Delete Request', 'PASS');
          
          // Test delete status
          const deleteStatusResult = await callApi('GET', `/delete/${deleteRequestResult.data.id}/status`);
          if (deleteStatusResult.success) {
            logTest('Delete Status Check', 'PASS');
            return true;
          } else {
            logTest('Delete Status Check', 'FAIL', deleteStatusResult.error);
          }
        } else {
          logTest('Delete Request', 'FAIL', deleteRequestResult.error);
        }
      } else {
        logTest('Survey Analytics', 'FAIL', analyticsResult.error);
      }
    } else {
      logTest('Survey Submission', 'FAIL', surveyResult.error);
    }
  } else {
    logTest('Survey Session Creation', 'FAIL', sessionResult.error);
  }
  
  return false;
}

async function testM6Website() {
  logSection('M6 - Website');
  
  try {
    // Test website accessibility
    const websiteResult = await axios.get(`${WEBSITE_BASE}/`, { timeout: TEST_CONFIG.requestTimeout });
    if (websiteResult.status === 200) {
      logTest('Website Homepage', 'PASS');
      
      // Test demo page
      const demoResult = await axios.get(`${WEBSITE_BASE}/demo`, { timeout: TEST_CONFIG.requestTimeout });
      if (demoResult.status === 200) {
        logTest('Demo Page', 'PASS');
        
        // Check for accessibility features in HTML
        const html = demoResult.data;
        if (html.includes('aria-label') && html.includes('role=') && html.includes('sr-only')) {
          logTest('Accessibility Features', 'PASS', 'ARIA labels and screen reader support found');
        } else {
          logTest('Accessibility Features', 'WARN', 'Some accessibility features may be missing');
        }
        
        return true;
      } else {
        logTest('Demo Page', 'FAIL', `Status: ${demoResult.status}`);
      }
    } else {
      logTest('Website Homepage', 'FAIL', `Status: ${websiteResult.status}`);
    }
  } catch (error) {
    logTest('Website Connection', 'FAIL', error.message);
  }
  
  return false;
}

async function testM7RateLimiting(token) {
  logSection('M7 - Rate Limiting & Polish');
  
  const headers = { Authorization: `Bearer ${token}` };
  
  // Test rate limit status
  const rateLimitStatusResult = await callApi('GET', '/rate-limit/status', null, headers);
  if (rateLimitStatusResult.success) {
    logTest('Rate Limit Status', 'PASS');
    
    // Test authentication rate limiting
    const authPromises = [];
    for (let i = 0; i < 6; i++) {
      authPromises.push(callApi('POST', '/auth/request-code', { email: `test${i}@example.com` }));
    }
    
    const authResults = await Promise.all(authPromises);
    const rateLimited = authResults.filter(r => r.status === 429);
    
    if (rateLimited.length > 0) {
      logTest('Authentication Rate Limiting', 'PASS', `${rateLimited.length} requests were rate limited`);
      
      // Check for improved rate limit message
      const rateLimitMessage = rateLimited[0].error?.message;
      if (rateLimitMessage && (rateLimitMessage.includes('breathe') || rateLimitMessage.includes('thoughtful'))) {
        logTest('Improved Rate Limit Message', 'PASS', 'Message is empathetic and supportive');
      } else {
        logTest('Improved Rate Limit Message', 'WARN', 'Message could be more empathetic');
      }
    } else {
      logTest('Authentication Rate Limiting', 'FAIL', 'No requests were rate limited');
    }
    
    return true;
  } else {
    logTest('Rate Limit Status', 'FAIL', rateLimitStatusResult.error);
  }
  
  return false;
}

async function testCopyImprovements() {
  logSection('Copy Review & Improvements');
  
  // Test improved error messages
  const testCases = [
    {
      endpoint: '/auth/verify-code',
      method: 'POST',
      data: { email: 'test@example.com', code: 'wrong' },
      expectedStatus: 401,
      expectedMessage: 'verify your code'
    },
    {
      endpoint: '/couples',
      method: 'POST',
      expectedStatus: 401,
      expectedMessage: 'verify your identity'
    }
  ];
  
  for (const testCase of testCases) {
    const result = await callApi(testCase.method, testCase.endpoint, testCase.data);
    
    if (result.status === testCase.expectedStatus) {
      logTest(`Error Message - ${testCase.endpoint}`, 'PASS');
      
      if (result.error && result.error.message && result.error.message.includes(testCase.expectedMessage)) {
        logTest(`Improved Copy - ${testCase.endpoint}`, 'PASS', 'Message is clear and helpful');
      } else {
        logTest(`Improved Copy - ${testCase.endpoint}`, 'WARN', 'Message could be clearer');
      }
    } else {
      logTest(`Error Message - ${testCase.endpoint}`, 'FAIL', `Expected ${testCase.expectedStatus}, got ${result.status}`);
    }
  }
  
  return true;
}

async function runComprehensiveTests() {
  log('🚀 Starting M7 Comprehensive Test Suite...', 'bright');
  log('Testing all M1-M7 features with improved copy and accessibility', 'cyan');
  
  try {
    // M1: Authentication & Couples
    const token = await testM1Authentication();
    if (!token) {
      log('❌ M1 Authentication failed - stopping tests', 'red');
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    // M1: Couples
    const coupleId = await testM1Couples(token);
    if (!coupleId) {
      log('⚠️ M1 Couples failed - continuing with other tests', 'yellow');
    }
    
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    // M2: Sessions & Messages
    const sessionId = await testM2Sessions(token, coupleId);
    if (!sessionId) {
      log('⚠️ M2 Sessions failed - continuing with other tests', 'yellow');
    }
    
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    // M3: AI Orchestrator
    const aiSuccess = await testM3AI(token);
    if (!aiSuccess) {
      log('⚠️ M3 AI failed - continuing with other tests', 'yellow');
    }
    
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    // M4: Safety & Boundary
    const safetySuccess = await testM4Safety(token);
    if (!safetySuccess) {
      log('⚠️ M4 Safety failed - continuing with other tests', 'yellow');
    }
    
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    // M5: Survey & Delete
    const surveySuccess = await testM5Survey(token);
    if (!surveySuccess) {
      log('⚠️ M5 Survey failed - continuing with other tests', 'yellow');
    }
    
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    // M6: Website
    const websiteSuccess = await testM6Website();
    if (!websiteSuccess) {
      log('⚠️ M6 Website failed - continuing with other tests', 'yellow');
    }
    
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    // M7: Rate Limiting & Polish
    const rateLimitSuccess = await testM7RateLimiting(token);
    if (!rateLimitSuccess) {
      log('⚠️ M7 Rate Limiting failed - continuing with other tests', 'yellow');
    }
    
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
    
    // Copy Improvements
    const copySuccess = await testCopyImprovements();
    if (!copySuccess) {
      log('⚠️ Copy Improvements failed - continuing with other tests', 'yellow');
    }
    
    log('\n🎉 M7 Comprehensive Test Suite Completed!', 'green');
    log('=====================================', 'green');
    log('All M1-M7 features have been tested with improved copy and accessibility', 'cyan');
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runComprehensiveTests();
}

module.exports = {
  runComprehensiveTests,
  testM1Authentication,
  testM1Couples,
  testM2Sessions,
  testM3AI,
  testM4Safety,
  testM5Survey,
  testM6Website,
  testM7RateLimiting,
  testCopyImprovements,
};
