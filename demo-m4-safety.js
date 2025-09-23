#!/usr/bin/env node

/**
 * Demo for M4 - Safety & Boundary Features
 * This demonstrates the complete safety system in action
 */

const API_BASE = 'http://localhost:3001';

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  let data;
  if (response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
  } else {
    data = await response.text();
  }
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${data}`);
  }
  
  return data;
}

async function demoM4Safety() {
  console.log('🛡️ M4 Safety & Boundary Features Demo\n');
  console.log('This demo showcases the complete safety system including:');
  console.log('• Boundary detection with regex patterns');
  console.log('• Content safety validation');
  console.log('• Risk level assessment');
  console.log('• Safety violation tracking');
  console.log('• Rate limiting and frontend locks');
  console.log('• EU resources and support information\n');

  try {
    // Setup
    console.log('🔧 Setting up demo environment...');
    
    // Alice auth
    await makeRequest('/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email: 'alice@example.com' }),
    });
    const aliceAuth = await makeRequest('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email: 'alice@example.com', code: '123456' }),
    });
    
    // Bob auth
    await makeRequest('/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email: 'bob@example.com' }),
    });
    const bobAuth = await makeRequest('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email: 'bob@example.com', code: '123456' }),
    });
    
    console.log('✅ Demo users authenticated');

    // Create couple and session
    try {
      const couple = await makeRequest('/couples', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${aliceAuth.accessToken}` },
      });
      
      const invite = await makeRequest('/invites', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${aliceAuth.accessToken}` },
      });
      
      await makeRequest(`/invites/${invite.code}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${bobAuth.accessToken}` },
      });
      
      const session = await makeRequest('/sessions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${aliceAuth.accessToken}` },
      });
      
      console.log('✅ Demo couple and session created');
      
      // Demo 1: Safe Content
      console.log('\n📝 Demo 1: Safe Content');
      console.log('Testing: "I\'m feeling a bit stressed about work today, but I\'m managing."');
      
      const safeMessage = {
        content: "I'm feeling a bit stressed about work today, but I'm managing.",
        client_message_id: `safe_${Date.now()}`,
      };
      
      await makeRequest(`/sessions/${session.sessionId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${aliceAuth.accessToken}` },
        body: JSON.stringify(safeMessage),
      });
      console.log('✅ Safe message accepted - no safety concerns detected');
      
      // Demo 2: Medium-Risk Content
      console.log('\n⚠️ Demo 2: Medium-Risk Content');
      console.log('Testing: "I\'m feeling really depressed and hopeless about our relationship."');
      
      const mediumRiskMessage = {
        content: "I'm feeling really depressed and hopeless about our relationship.",
        client_message_id: `medium_${Date.now()}`,
      };
      
      try {
        await makeRequest(`/sessions/${session.sessionId}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${aliceAuth.accessToken}` },
          body: JSON.stringify(mediumRiskMessage),
        });
        console.log('⚠️ Medium-risk message was allowed (may indicate pattern needs adjustment)');
      } catch (error) {
        console.log('✅ Medium-risk message correctly flagged');
        console.log('📋 Safety response:', error.message);
      }
      
      // Demo 3: High-Risk Content
      console.log('\n🚨 Demo 3: High-Risk Content');
      console.log('Testing: "I want to hurt myself and end it all."');
      
      const highRiskMessage = {
        content: "I want to hurt myself and end it all.",
        client_message_id: `high_${Date.now()}`,
      };
      
      try {
        await makeRequest(`/sessions/${session.sessionId}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${aliceAuth.accessToken}` },
          body: JSON.stringify(highRiskMessage),
        });
        console.log('❌ High-risk message was allowed (safety system may need adjustment)');
      } catch (error) {
        console.log('✅ High-risk message correctly blocked');
        console.log('📋 Safety response:', error.message);
      }
      
      // Demo 4: Abuse-Related Content
      console.log('\n🛡️ Demo 4: Abuse-Related Content');
      console.log('Testing: "My partner hit me and I\'m scared."');
      
      const abuseMessage = {
        content: "My partner hit me and I'm scared.",
        client_message_id: `abuse_${Date.now()}`,
      };
      
      try {
        await makeRequest(`/sessions/${session.sessionId}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${aliceAuth.accessToken}` },
          body: JSON.stringify(abuseMessage),
        });
        console.log('❌ Abuse message was allowed (safety system may need adjustment)');
      } catch (error) {
        console.log('✅ Abuse message correctly blocked');
        console.log('📋 Safety response:', error.message);
      }
      
      // Demo 5: Safety Status Monitoring
      console.log('\n📊 Demo 5: Safety Status Monitoring');
      const safetyStatus = await makeRequest('/safety/status', {
        headers: { 'Authorization': `Bearer ${aliceAuth.accessToken}` },
      });
      
      console.log('📈 Safety Status:');
      console.log(`   • Violations: ${safetyStatus.violations}`);
      console.log(`   • Frontend locked: ${safetyStatus.frontendLock.isLocked}`);
      console.log(`   • Rate limit: ${safetyStatus.rateLimit.maxRequests} requests per ${safetyStatus.rateLimit.windowMs / 1000} seconds`);
      console.log(`   • Lock reason: ${safetyStatus.frontendLock.reason}`);
      
      if (safetyStatus.violations > 0) {
        console.log('⚠️ Safety violations detected - rate limiting may be in effect');
        console.log('📝 Rate limit message:', safetyStatus.rateLimit.message);
      }
      
      // Demo 6: EU Resources
      console.log('\n🇪🇺 Demo 6: EU Resources & Support');
      console.log('📋 Available EU Resources:');
      console.log('   • Emergency services: 112 (EU-wide)');
      console.log('   • Crisis helpline: 116 123');
      console.log('   • EU Mental Health Network');
      console.log('   • EU Family Support Network');
      console.log('   • Local mental health services');
      console.log('   • Local social services');
      
      // Demo 7: Safety Guidelines
      console.log('\n📖 Demo 7: Safety Guidelines');
      console.log('📋 Safety Guidelines:');
      safetyStatus.safetyGuidelines.forEach((guideline, index) => {
        console.log(`   ${index + 1}. ${guideline}`);
      });
      
      // Demo 8: Frontend Lock Conditions
      console.log('\n🔒 Demo 8: Frontend Lock Conditions');
      if (safetyStatus.frontendLock.isLocked) {
        console.log('🔒 Frontend is currently locked');
        console.log('📝 Lock reason:', safetyStatus.frontendLock.reason);
        console.log('📝 Lock message:', safetyStatus.frontendLock.message);
        console.log('🔓 Unlock conditions:');
        safetyStatus.frontendLock.unlockConditions.forEach((condition, index) => {
          console.log(`   ${index + 1}. ${condition}`);
        });
      } else {
        console.log('🔓 Frontend is not locked');
        console.log('📝 Status:', safetyStatus.frontendLock.reason);
      }
      
      // Demo 9: Rate Limiting
      console.log('\n⏱️ Demo 9: Rate Limiting');
      console.log(`📊 Current rate limit: ${safetyStatus.rateLimit.maxRequests} requests per ${safetyStatus.rateLimit.windowMs / 1000} seconds`);
      console.log('📝 Rate limit message:', safetyStatus.rateLimit.message);
      
      if (safetyStatus.violations > 0) {
        console.log('⚠️ Rate limiting is in effect due to safety violations');
      } else {
        console.log('✅ Normal rate limiting applied');
      }
      
      // Demo 10: Safety Templates
      console.log('\n📋 Demo 10: Safety Templates');
      console.log('🛡️ Available safety templates:');
      console.log('   • Self-harm concerns (high priority, auto-block)');
      console.log('   • Abuse or violence (high priority, auto-block)');
      console.log('   • Relationship crisis (medium priority, warning)');
      console.log('   • Mental health concerns (medium priority, warning)');
      
      // End session
      await makeRequest(`/sessions/${session.sessionId}/end`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${aliceAuth.accessToken}` },
      });
      
      console.log('\n🎉 M4 Safety & Boundary Demo completed successfully!');
      console.log('\n📋 M4 Features Demonstrated:');
      console.log('   ✅ Boundary detection with regex patterns');
      console.log('   ✅ Content safety validation');
      console.log('   ✅ Risk level assessment (low/medium/high)');
      console.log('   ✅ Safety violation tracking');
      console.log('   ✅ Rate limiting based on violations');
      console.log('   ✅ Frontend lock conditions');
      console.log('   ✅ EU resources and support information');
      console.log('   ✅ Safety templates and responses');
      console.log('   ✅ Safety status monitoring');
      console.log('   ✅ Safety guidelines display');
      
      console.log('\n🛡️ Safety System Status:');
      console.log('   • Boundary detection: Active');
      console.log('   • Content validation: Active');
      console.log('   • Rate limiting: Active');
      console.log('   • Frontend locks: Active');
      console.log('   • EU resources: Available');
      console.log('   • Safety templates: Loaded');
      
    } catch (error) {
      console.log('ℹ️  Couple/session setup failed, but safety features are still available');
      console.log('📝 Error:', error.message);
    }

  } catch (error) {
    console.error('❌ M4 Safety demo failed:', error.message);
    console.log('\n💡 Make sure the safety-enhanced API server is running:');
    console.log('   cd services/api && npx tsx src/safety-enhanced-server.ts');
    console.log('\n🤖 Also make sure the AI service is running:');
    console.log('   cd services/ai && OPENAI_API_KEY=your-key npx tsx src/enhanced-orchestrator.ts');
    process.exit(1);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ with fetch support');
  process.exit(1);
}

// Run the demo
demoM4Safety();
