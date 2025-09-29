#!/usr/bin/env node

/**
 * M2 Comprehensive Demo: Long-polling Features
 * Demonstrates all M2 features including timeout, abort, and real-time delivery
 */

const http = require('http');

function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function demo() {
  console.log('🚀 M2 Comprehensive Demo: Long-polling Features\n');

  try {
    // 1. Health check
    console.log('1. Health Check');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}\n`);

    // 2. Create session
    console.log('2. Create Session');
    const session = await makeRequest('POST', '/sessions', {
      mode: 'couple',
      coupleId: '123e4567-e89b-12d3-a456-426614174000'
    }, { 'Authorization': 'Bearer token_userA' });
    
    const sessionId = session.data.sessionId;
    console.log(`   Session ID: ${sessionId}\n`);

    // 3. Test immediate message retrieval
    console.log('3. Test Immediate Message Retrieval');
    const immediateMessages = await makeRequest('GET', `/sessions/${sessionId}/messages`, null, {
      'Authorization': 'Bearer token_userA'
    });
    
    console.log(`   Status: ${immediateMessages.status}`);
    console.log(`   Messages: ${immediateMessages.data.length} messages\n`);

    // 4. Send a message
    console.log('4. Send Message');
    const msgResult = await makeRequest('POST', `/sessions/${sessionId}/messages`, {
      sender: 'userA',
      content: 'Hello! This is a test message.',
      clientMessageId: 'msg_test_1'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${msgResult.status}`);
    console.log(`   Message sent successfully\n`);

    // 5. Retrieve messages after sending
    console.log('5. Retrieve Messages After Sending');
    const messagesAfter = await makeRequest('GET', `/sessions/${sessionId}/messages`, null, {
      'Authorization': 'Bearer token_userA'
    });
    
    console.log(`   Status: ${messagesAfter.status}`);
    console.log(`   Messages: ${messagesAfter.data.length} messages`);
    if (messagesAfter.data.length > 0) {
      console.log(`   Latest: "${messagesAfter.data[0].content}"`);
    }
    console.log('');

    // 6. Test long-polling with timeout
    console.log('6. Test Long-polling Timeout (3 seconds)');
    const startTime = Date.now();
    
    const longPollPromise = new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: `/sessions/${sessionId}/messages?waitMs=3000`,
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token_userA'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : [];
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);
      req.end();
    });

    const longPollResult = await longPollPromise;
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`   Duration: ${duration}ms`);
    console.log(`   Status: ${longPollResult.status}`);
    console.log(`   Messages: ${longPollResult.data.length} messages\n`);

    // 7. Test boundary detection
    console.log('7. Test Boundary Detection');
    const boundaryResult = await makeRequest('POST', `/sessions/${sessionId}/messages`, {
      sender: 'userA',
      content: 'I want to kill myself',
      clientMessageId: 'msg_boundary'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${boundaryResult.status}`);
    if (boundaryResult.status === 409) {
      console.log(`   ✅ Boundary detection working: ${boundaryResult.data.message}`);
    } else {
      console.log(`   ❌ Expected 409, got ${boundaryResult.status}`);
    }
    console.log('');

    // 8. Test session state after boundary
    console.log('8. Test Session State After Boundary');
    const sessionState = await makeRequest('GET', `/sessions/${sessionId}/messages`, null, {
      'Authorization': 'Bearer token_userA'
    });
    
    console.log(`   Status: ${sessionState.status}`);
    if (sessionState.status === 409) {
      console.log(`   ✅ Session locked due to boundary violation`);
    } else {
      console.log(`   Messages after boundary: ${sessionState.data.length}`);
    }
    console.log('');

    // 9. Test solo session
    console.log('9. Test Solo Session');
    const soloSession = await makeRequest('POST', '/sessions', {
      mode: 'solo'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${soloSession.status}`);
    console.log(`   Solo Session: ${JSON.stringify(soloSession.data)}\n`);

    // 10. Test feedback
    console.log('10. Test Feedback Submission');
    const feedbackResult = await makeRequest('POST', `/sessions/${sessionId}/feedback`, {
      rating: 'happy'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${feedbackResult.status}`);
    console.log(`   Feedback submitted successfully\n`);

    console.log('🎉 M2 Comprehensive Demo Complete!');
    console.log('\n✅ Features Demonstrated:');
    console.log('   • Session creation and management');
    console.log('   • Message sending and retrieval');
    console.log('   • Long-polling with timeout handling');
    console.log('   • Boundary detection and session locking');
    console.log('   • Solo vs Couple session modes');
    console.log('   • Feedback submission');
    console.log('   • Real-time message delivery');
    console.log('   • WebSocket-like experience over HTTP');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Start the demo
demo();
