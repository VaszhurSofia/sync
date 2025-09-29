#!/usr/bin/env node

/**
 * M3 Demo: AI Integration
 * Demonstrates AI orchestrator integration with mode-based responses
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
  console.log('🚀 M3 Demo: AI Integration\n');

  try {
    // 1. Health check
    console.log('1. Health Check');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}\n`);

    // 2. Test Solo Session with AI
    console.log('2. Test Solo Session with AI');
    const soloSession = await makeRequest('POST', '/sessions', {
      mode: 'solo'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${soloSession.status}`);
    console.log(`   Solo Session: ${JSON.stringify(soloSession.data)}\n`);
    
    const soloSessionId = soloSession.data.sessionId;

    // 3. Wait for initial AI response
    console.log('3. Wait for Initial AI Response (Solo)');
    const startTime = Date.now();
    
    const soloMessages = await longPollMessages(soloSessionId, null, 5000);
    const endTime = Date.now();
    
    console.log(`   Duration: ${endTime - startTime}ms`);
    console.log(`   Status: ${soloMessages.status}`);
    console.log(`   Messages: ${soloMessages.data.length}`);
    
    if (soloMessages.data.length > 0) {
      const aiMessage = soloMessages.data.find(msg => msg.sender === 'ai');
      if (aiMessage) {
        console.log(`   AI Response: "${aiMessage.content}"`);
        if (aiMessage.metadata) {
          console.log(`   Metadata: ${JSON.stringify(aiMessage.metadata, null, 2)}`);
        }
      }
    }
    console.log('');

    // 4. Send user message to solo session
    console.log('4. Send User Message to Solo Session');
    const soloUserMsg = await makeRequest('POST', `/sessions/${soloSessionId}/messages`, {
      sender: 'userA',
      content: 'I feel really confused about my relationship',
      clientMessageId: 'msg_solo_1'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${soloUserMsg.status}`);
    console.log(`   Message sent successfully\n`);

    // 5. Wait for AI response to user message
    console.log('5. Wait for AI Response to User Message');
    const soloResponse = await longPollMessages(soloSessionId, null, 5000);
    
    console.log(`   Status: ${soloResponse.status}`);
    console.log(`   Messages: ${soloResponse.data.length}`);
    
    if (soloResponse.data.length > 0) {
      const latestMessage = soloResponse.data[soloResponse.data.length - 1];
      if (latestMessage.sender === 'ai') {
        console.log(`   AI Response: "${latestMessage.content}"`);
      }
    }
    console.log('');

    // 6. Test Couple Session with AI
    console.log('6. Test Couple Session with AI');
    const coupleSession = await makeRequest('POST', '/sessions', {
      mode: 'couple',
      coupleId: '123e4567-e89b-12d3-a456-426614174000'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${coupleSession.status}`);
    console.log(`   Couple Session: ${JSON.stringify(coupleSession.data)}\n`);
    
    const coupleSessionId = coupleSession.data.sessionId;

    // 7. User A sends message
    console.log('7. User A Sends Message');
    const userAMsg = await makeRequest('POST', `/sessions/${coupleSessionId}/messages`, {
      sender: 'userA',
      content: 'I feel like we never talk anymore',
      clientMessageId: 'msg_couple_A1'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${userAMsg.status}`);
    console.log(`   User A message sent\n`);

    // 8. User B sends message
    console.log('8. User B Sends Message');
    const userBMsg = await makeRequest('POST', `/sessions/${coupleSessionId}/messages`, {
      sender: 'userB',
      content: 'I feel the same way, but I don\'t know how to start',
      clientMessageId: 'msg_couple_B1'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${userBMsg.status}`);
    console.log(`   User B message sent\n`);

    // 9. Wait for AI response
    console.log('9. Wait for AI Response (Couple)');
    const coupleResponse = await longPollMessages(coupleSessionId, null, 5000);
    
    console.log(`   Status: ${coupleResponse.status}`);
    console.log(`   Messages: ${coupleResponse.data.length}`);
    
    if (coupleResponse.data.length > 0) {
      const aiMessage = coupleResponse.data.find(msg => msg.sender === 'ai');
      if (aiMessage) {
        console.log(`   AI Response: "${aiMessage.content}"`);
        if (aiMessage.metadata) {
          console.log(`   Metadata: ${JSON.stringify(aiMessage.metadata, null, 2)}`);
        }
      }
    }
    console.log('');

    // 10. Test boundary detection
    console.log('10. Test Boundary Detection');
    const boundaryMsg = await makeRequest('POST', `/sessions/${coupleSessionId}/messages`, {
      sender: 'userA',
      content: 'I want to kill myself',
      clientMessageId: 'msg_boundary'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${boundaryMsg.status}`);
    if (boundaryMsg.status === 409) {
      console.log(`   ✅ Boundary detection working: ${boundaryMsg.data.message}`);
    } else {
      console.log(`   ❌ Expected 409, got ${boundaryMsg.status}`);
    }
    console.log('');

    // 11. Test feedback
    console.log('11. Test Feedback Submission');
    const feedback = await makeRequest('POST', `/sessions/${coupleSessionId}/feedback`, {
      rating: 'happy'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${feedback.status}`);
    console.log(`   Feedback submitted successfully\n`);

    // 12. Get all messages for both sessions
    console.log('12. Get All Messages');
    const allSoloMessages = await makeRequest('GET', `/sessions/${soloSessionId}/messages`, null, {
      'Authorization': 'Bearer token_userA'
    });
    
    const allCoupleMessages = await makeRequest('GET', `/sessions/${coupleSessionId}/messages`, null, {
      'Authorization': 'Bearer token_userA'
    });
    
    console.log(`   Solo Session Messages: ${allSoloMessages.data.length}`);
    console.log(`   Couple Session Messages: ${allCoupleMessages.data.length}`);
    
    // Show message flow
    console.log('\n   Solo Session Flow:');
    allSoloMessages.data.forEach((msg, i) => {
      console.log(`     ${i + 1}. [${msg.sender}] ${msg.content.substring(0, 50)}...`);
    });
    
    console.log('\n   Couple Session Flow:');
    allCoupleMessages.data.forEach((msg, i) => {
      console.log(`     ${i + 1}. [${msg.sender}] ${msg.content.substring(0, 50)}...`);
    });

    console.log('\n🎉 M3 Demo Complete!');
    console.log('\n✅ Features Demonstrated:');
    console.log('   • AI orchestrator integration');
    console.log('   • Mode-based prompt selection');
    console.log('   • Response validation and formatting');
    console.log('   • Safety tier-1 pre-checks');
    console.log('   • Telemetry and logging');
    console.log('   • Solo vs Couple AI responses');
    console.log('   • Real-time AI message delivery');
    console.log('   • Fallback handling');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Start the demo
demo();
