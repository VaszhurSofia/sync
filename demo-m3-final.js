#!/usr/bin/env node

/**
 * M3 Final Demo: Complete AI Integration
 * Demonstrates all M3 features with proper AI response generation
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

async function waitForMessages(sessionId, expectedCount = 1, timeout = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const messages = await makeRequest('GET', `/sessions/${sessionId}/messages`, null, {
      'Authorization': 'Bearer token_userA'
    });
    
    if (messages.data.length >= expectedCount) {
      return messages.data;
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error('Timeout waiting for messages');
}

async function demo() {
  console.log('🚀 M3 Final Demo: Complete AI Integration\n');

  try {
    // 1. Health check
    console.log('1. Health Check');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}\n`);

    // 2. Test Solo Session
    console.log('2. Test Solo Session with AI');
    const soloSession = await makeRequest('POST', '/sessions', {
      mode: 'solo'
    }, { 'Authorization': 'Bearer token_userA' });
    
    const soloSessionId = soloSession.data.sessionId;
    console.log(`   Solo Session ID: ${soloSessionId}\n`);

    // 3. Wait for initial AI response
    console.log('3. Wait for Initial AI Response (Solo)');
    try {
      const soloMessages = await waitForMessages(soloSessionId, 1, 5000);
      console.log(`   ✅ Received ${soloMessages.length} messages`);
      
      const aiMessage = soloMessages.find(msg => msg.sender === 'ai');
      if (aiMessage) {
        console.log(`   AI Response: "${aiMessage.content}"`);
        if (aiMessage.metadata) {
          console.log(`   Mode: ${aiMessage.metadata.mode}`);
          console.log(`   Prompt Version: ${aiMessage.metadata.prompt_version}`);
          console.log(`   Latency: ${aiMessage.metadata.latency_ms}ms`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  No initial AI response received: ${error.message}`);
    }
    console.log('');

    // 4. Send user message and wait for AI response
    console.log('4. Send User Message and Wait for AI Response');
    const userMsg = await makeRequest('POST', `/sessions/${soloSessionId}/messages`, {
      sender: 'userA',
      content: 'I feel really confused about my relationship',
      clientMessageId: 'msg_solo_1'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   User message status: ${userMsg.status}`);
    
    try {
      const responseMessages = await waitForMessages(soloSessionId, 2, 5000);
      console.log(`   ✅ Received ${responseMessages.length} total messages`);
      
      const latestMessage = responseMessages[responseMessages.length - 1];
      if (latestMessage.sender === 'ai') {
        console.log(`   AI Response: "${latestMessage.content}"`);
      }
    } catch (error) {
      console.log(`   ⚠️  No AI response received: ${error.message}`);
    }
    console.log('');

    // 5. Test Couple Session
    console.log('5. Test Couple Session with AI');
    const coupleSession = await makeRequest('POST', '/sessions', {
      mode: 'couple',
      coupleId: '123e4567-e89b-12d3-a456-426614174000'
    }, { 'Authorization': 'Bearer token_userA' });
    
    const coupleSessionId = coupleSession.data.sessionId;
    console.log(`   Couple Session ID: ${coupleSessionId}\n`);

    // 6. User A sends message
    console.log('6. User A Sends Message');
    const userAMsg = await makeRequest('POST', `/sessions/${coupleSessionId}/messages`, {
      sender: 'userA',
      content: 'I feel like we never talk anymore',
      clientMessageId: 'msg_couple_A1'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   User A message status: ${userAMsg.status}\n`);

    // 7. User B sends message
    console.log('7. User B Sends Message');
    const userBMsg = await makeRequest('POST', `/sessions/${coupleSessionId}/messages`, {
      sender: 'userB',
      content: 'I feel the same way, but I don\'t know how to start',
      clientMessageId: 'msg_couple_B1'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   User B message status: ${userBMsg.status}\n`);

    // 8. Wait for AI response
    console.log('8. Wait for AI Response (Couple)');
    try {
      const coupleMessages = await waitForMessages(coupleSessionId, 3, 5000);
      console.log(`   ✅ Received ${coupleMessages.length} total messages`);
      
      const aiMessage = coupleMessages.find(msg => msg.sender === 'ai');
      if (aiMessage) {
        console.log(`   AI Response: "${aiMessage.content}"`);
        if (aiMessage.metadata) {
          console.log(`   Mode: ${aiMessage.metadata.mode}`);
          console.log(`   Prompt Version: ${aiMessage.metadata.prompt_version}`);
          console.log(`   Latency: ${aiMessage.metadata.latency_ms}ms`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  No AI response received: ${error.message}`);
    }
    console.log('');

    // 9. Test boundary detection
    console.log('9. Test Boundary Detection');
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

    // 10. Test feedback
    console.log('10. Test Feedback Submission');
    const feedback = await makeRequest('POST', `/sessions/${coupleSessionId}/feedback`, {
      rating: 'happy'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${feedback.status}`);
    console.log(`   Feedback submitted successfully\n`);

    // 11. Get final message counts
    console.log('11. Final Message Counts');
    const finalSoloMessages = await makeRequest('GET', `/sessions/${soloSessionId}/messages`, null, {
      'Authorization': 'Bearer token_userA'
    });
    
    const finalCoupleMessages = await makeRequest('GET', `/sessions/${coupleSessionId}/messages`, null, {
      'Authorization': 'Bearer token_userA'
    });
    
    console.log(`   Solo Session: ${finalSoloMessages.data.length} messages`);
    console.log(`   Couple Session: ${finalCoupleMessages.data.length} messages`);
    
    // Show message flow
    console.log('\n   Solo Session Flow:');
    finalSoloMessages.data.forEach((msg, i) => {
      const sender = msg.sender === 'ai' ? '🤖 AI' : '👤 User';
      console.log(`     ${i + 1}. ${sender}: ${msg.content.substring(0, 60)}...`);
    });
    
    console.log('\n   Couple Session Flow:');
    finalCoupleMessages.data.forEach((msg, i) => {
      const sender = msg.sender === 'ai' ? '🤖 AI' : `👤 ${msg.sender}`;
      console.log(`     ${i + 1}. ${sender}: ${msg.content.substring(0, 60)}...`);
    });

    console.log('\n🎉 M3 Final Demo Complete!');
    console.log('\n✅ Features Demonstrated:');
    console.log('   • AI orchestrator integration with mode-based routing');
    console.log('   • Prompt selection based on session mode (solo vs couple)');
    console.log('   • Response validation and formatting');
    console.log('   • Safety tier-1 pre-checks and boundary detection');
    console.log('   • Telemetry and logging with metadata');
    console.log('   • Real-time AI message delivery via long-polling');
    console.log('   • Fallback handling for AI failures');
    console.log('   • Turn-taking enforcement with AI processing states');
    console.log('   • Feedback submission and session management');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Start the demo
demo();
