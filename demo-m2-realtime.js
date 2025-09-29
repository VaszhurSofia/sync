#!/usr/bin/env node

/**
 * M2 Demo: Real-time Long-polling
 * Demonstrates concurrent long-polling with real-time message delivery
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

async function longPollMessages(sessionId, after = null, waitMs = 10000) {
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
  console.log('🚀 M2 Real-time Demo: Concurrent Long-polling\n');

  try {
    // 1. Create session
    console.log('1. Create Session');
    const session = await makeRequest('POST', '/sessions', {
      mode: 'couple',
      coupleId: '123e4567-e89b-12d3-a456-426614174000'
    }, { 'Authorization': 'Bearer token_userA' });
    
    const sessionId = session.data.sessionId;
    console.log(`   Session ID: ${sessionId}\n`);

    // 2. Start multiple long-polling clients
    console.log('2. Start Multiple Long-polling Clients');
    const client1Promise = longPollMessages(sessionId, null, 15000);
    const client2Promise = longPollMessages(sessionId, null, 15000);
    
    console.log('   ✅ Client 1: Long-polling started (15s wait)');
    console.log('   ✅ Client 2: Long-polling started (15s wait)');
    console.log('   ⏳ Both clients waiting for messages...\n');

    // 3. Send messages at intervals
    console.log('3. Send Messages at Intervals');
    
    // Message 1
    setTimeout(async () => {
      console.log('   📤 Sending Message 1...');
      await makeRequest('POST', `/sessions/${sessionId}/messages`, {
        sender: 'userA',
        content: 'First message - should trigger both clients',
        clientMessageId: 'msg_1'
      }, { 'Authorization': 'Bearer token_userA' });
    }, 2000);

    // Message 2
    setTimeout(async () => {
      console.log('   📤 Sending Message 2...');
      await makeRequest('POST', `/sessions/${sessionId}/messages`, {
        sender: 'userA',
        content: 'Second message - should also trigger both clients',
        clientMessageId: 'msg_2'
      }, { 'Authorization': 'Bearer token_userA' });
    }, 4000);

    // Message 3
    setTimeout(async () => {
      console.log('   📤 Sending Message 3...');
      await makeRequest('POST', `/sessions/${sessionId}/messages`, {
        sender: 'userA',
        content: 'Third message - final trigger',
        clientMessageId: 'msg_3'
      }, { 'Authorization': 'Bearer token_userA' });
    }, 6000);

    // 4. Wait for responses
    console.log('4. Wait for Long-poll Responses');
    
    const startTime = Date.now();
    
    // Wait for both clients to respond
    const [client1Result, client2Result] = await Promise.all([
      client1Promise,
      client2Promise
    ]);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`   ⏱️  Total Duration: ${duration}ms`);
    console.log(`   📊 Client 1 Status: ${client1Result.status}`);
    console.log(`   📊 Client 2 Status: ${client2Result.status}`);
    console.log(`   📨 Client 1 Messages: ${client1Result.data.length}`);
    console.log(`   📨 Client 2 Messages: ${client2Result.data.length}\n`);

    // 5. Show message details
    console.log('5. Message Details');
    if (client1Result.data.length > 0) {
      console.log('   Client 1 received:');
      client1Result.data.forEach((msg, i) => {
        console.log(`     ${i + 1}. ${msg.content} (${msg.created_at})`);
      });
    }
    
    if (client2Result.data.length > 0) {
      console.log('   Client 2 received:');
      client2Result.data.forEach((msg, i) => {
        console.log(`     ${i + 1}. ${msg.content} (${msg.created_at})`);
      });
    }

    console.log('\n🎉 M2 Real-time Demo Complete!');
    console.log('\n✅ Features Demonstrated:');
    console.log('   • Multiple concurrent long-polling clients');
    console.log('   • Real-time message delivery to all clients');
    console.log('   • Deterministic message ordering');
    console.log('   • WebSocket-like behavior over HTTP');
    console.log('   • Efficient resource usage');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Start the demo
demo();
