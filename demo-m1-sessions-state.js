#!/usr/bin/env node

/**
 * M1 Demo: Sessions & State
 * Demonstrates turn-taking enforcement and boundary detection
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

async function demo() {
  console.log('🚀 M1 Demo: Sessions & State\n');

  try {
    // 1. Health check
    console.log('1. Health Check');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${JSON.stringify(health.data)}\n`);

    // 2. Create couple session
    console.log('2. Create Couple Session');
    const session = await makeRequest('POST', '/sessions', {
      mode: 'couple',
      coupleId: '123e4567-e89b-12d3-a456-426614174000'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${session.status}`);
    console.log(`   Session: ${JSON.stringify(session.data)}\n`);
    
    const sessionId = session.data.sessionId;

    // 3. User A sends message (should work)
    console.log('3. User A sends message (should work)');
    const msgA = await makeRequest('POST', `/sessions/${sessionId}/messages`, {
      sender: 'userA',
      content: 'I feel like we need to talk about our communication',
      clientMessageId: 'msg_A1'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${msgA.status}`);
    if (msgA.status === 202) {
      console.log('   ✅ Message accepted\n');
    } else {
      console.log(`   ❌ Error: ${JSON.stringify(msgA.data)}\n`);
    }

    // 4. User B tries to send (should fail - wrong turn)
    console.log('4. User B tries to send (should fail - wrong turn)');
    const msgB = await makeRequest('POST', `/sessions/${sessionId}/messages`, {
      sender: 'userB',
      content: 'I want to respond',
      clientMessageId: 'msg_B1'
    }, { 'Authorization': 'Bearer token_userB' });
    
    console.log(`   Status: ${msgB.status}`);
    if (msgB.status === 409) {
      console.log('   ✅ Turn-taking enforced correctly');
      console.log(`   Error: ${msgB.data.message}\n`);
    } else {
      console.log(`   ❌ Expected 409, got ${msgB.status}: ${JSON.stringify(msgB.data)}\n`);
    }

    // 5. Test boundary detection
    console.log('5. Test Boundary Detection');
    const boundaryMsg = await makeRequest('POST', `/sessions/${sessionId}/messages`, {
      sender: 'userA',
      content: 'I want to kill myself',
      clientMessageId: 'msg_boundary'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${boundaryMsg.status}`);
    if (boundaryMsg.status === 409) {
      console.log('   ✅ Boundary detection working');
      console.log(`   Error: ${boundaryMsg.data.message}\n`);
    } else {
      console.log(`   ❌ Expected 409, got ${boundaryMsg.status}: ${JSON.stringify(boundaryMsg.data)}\n`);
    }

    // 6. Get messages
    console.log('6. Get Messages');
    const messages = await makeRequest('GET', `/sessions/${sessionId}/messages`, null, {
      'Authorization': 'Bearer token_userA'
    });
    
    console.log(`   Status: ${messages.status}`);
    console.log(`   Messages: ${JSON.stringify(messages.data, null, 2)}\n`);

    // 7. Test solo session
    console.log('7. Create Solo Session');
    const soloSession = await makeRequest('POST', '/sessions', {
      mode: 'solo'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${soloSession.status}`);
    console.log(`   Solo Session: ${JSON.stringify(soloSession.data)}\n`);

    console.log('🎉 M1 Demo Complete!');
    console.log('\n✅ Features Demonstrated:');
    console.log('   • Session creation with mode support');
    console.log('   • Turn-taking enforcement (409 TURN_LOCKED)');
    console.log('   • Boundary detection (409 BOUNDARY_LOCKED)');
    console.log('   • Solo vs Couple session modes');
    console.log('   • Message retrieval');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Start the demo
demo();
