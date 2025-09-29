#!/usr/bin/env node

/**
 * M2 Demo: Long-polling
 * Demonstrates real-time message delivery with HTTP long-polling
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

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

async function longPollMessages(sessionId, after = null, waitMs = 5000) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/sessions/${sessionId}/messages?after=${after || ''}&waitMs=${waitMs}`,
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
}

async function demo() {
  console.log('🚀 M2 Demo: Long-polling\n');

  try {
    // 1. Health check
    console.log('1. Health Check');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}\n`);

    // 2. Create couple session
    console.log('2. Create Couple Session');
    const session = await makeRequest('POST', '/sessions', {
      mode: 'couple',
      coupleId: '123e4567-e89b-12d3-a456-426614174000'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${session.status}`);
    console.log(`   Session: ${JSON.stringify(session.data)}\n`);
    
    const sessionId = session.data.sessionId;

    // 3. Start long-polling in background
    console.log('3. Start Long-polling (5 second wait)');
    const longPollPromise = longPollMessages(sessionId, null, 5000);
    
    // Give long-poll a moment to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // 4. Send message while long-poll is active
    console.log('4. Send Message (should trigger long-poll response)');
    const msgA = await makeRequest('POST', `/sessions/${sessionId}/messages`, {
      sender: 'userA',
      content: 'Hello! This should trigger the long-poll response.',
      clientMessageId: 'msg_A1'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Message Status: ${msgA.status}`);
    if (msgA.status === 202) {
      console.log('   ✅ Message sent successfully\n');
    }

    // 5. Wait for long-poll response
    console.log('5. Wait for Long-poll Response');
    const longPollResult = await longPollPromise;
    console.log(`   Long-poll Status: ${longPollResult.status}`);
    console.log(`   Messages Received: ${JSON.stringify(longPollResult.data, null, 2)}\n`);

    // 6. Test immediate response (no wait)
    console.log('6. Test Immediate Response (no wait)');
    const immediateMessages = await makeRequest('GET', `/sessions/${sessionId}/messages`, null, {
      'Authorization': 'Bearer token_userA'
    });
    
    console.log(`   Status: ${immediateMessages.status}`);
    console.log(`   Messages: ${JSON.stringify(immediateMessages.data, null, 2)}\n`);

    // 7. Test timeout behavior
    console.log('7. Test Long-poll Timeout (2 second wait, no new messages)');
    const timeoutPromise = longPollMessages(sessionId, new Date().toISOString(), 2000);
    
    const startTime = Date.now();
    const timeoutResult = await timeoutPromise;
    const endTime = Date.now();
    
    console.log(`   Status: ${timeoutResult.status}`);
    console.log(`   Duration: ${endTime - startTime}ms`);
    console.log(`   Response: ${JSON.stringify(timeoutResult.data)}\n`);

    // 8. Test real-time updates
    console.log('8. Test Real-time Updates');
    const realtimePromise = longPollMessages(sessionId, null, 3000);
    
    // Send another message after a delay
    setTimeout(async () => {
      console.log('   Sending delayed message...');
      await makeRequest('POST', `/sessions/${sessionId}/messages`, {
        sender: 'userA',
        content: 'This is a delayed message for real-time testing.',
        clientMessageId: 'msg_A2'
      }, { 'Authorization': 'Bearer token_userA' });
    }, 1000);

    const realtimeResult = await realtimePromise;
    console.log(`   Status: ${realtimeResult.status}`);
    console.log(`   Real-time Messages: ${JSON.stringify(realtimeResult.data, null, 2)}\n`);

    console.log('🎉 M2 Demo Complete!');
    console.log('\n✅ Features Demonstrated:');
    console.log('   • Long-polling with configurable wait time');
    console.log('   • Real-time message delivery');
    console.log('   • Timeout handling');
    console.log('   • Immediate vs delayed responses');
    console.log('   • WebSocket-like experience over HTTP');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Start the demo
demo();
