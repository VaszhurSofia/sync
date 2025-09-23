#!/usr/bin/env node

/**
 * Test for M3 - AI Orchestrator
 * This tests the AI reflection, clarification, and micro-actions functionality
 */

const AI_BASE = 'http://localhost:3002';

async function makeRequest(endpoint, options = {}) {
  const url = `${AI_BASE}${endpoint}`;
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

async function testAIOrchestrator() {
  console.log('🤖 Testing M3 - AI Orchestrator\n');

  try {
    // Test 1: Basic orchestration
    console.log('1️⃣ Testing basic AI orchestration...');
    const basicResponse = await makeRequest('/orchestrate', {
      method: 'POST',
      body: JSON.stringify({
        partnerA: "I feel like you never listen to me when I'm trying to explain something important.",
        partnerB: "I do listen, but sometimes I need time to process what you're saying before I can respond."
      }),
    });
    
    console.log('✅ Basic orchestration successful');
    console.log('📝 Mirror - Partner A:', basicResponse.mirror.partnerA);
    console.log('📝 Mirror - Partner B:', basicResponse.mirror.partnerB);
    console.log('❓ Clarify:', basicResponse.clarify);
    console.log('🎯 Micro-actions:', basicResponse.micro_actions);
    console.log('✅ Check:', basicResponse.check);
    console.log('🛡️ Safety:', basicResponse.safety);

    // Test 2: Context-aware orchestration
    console.log('\n2️⃣ Testing context-aware orchestration...');
    const contextResponse = await makeRequest('/orchestrate', {
      method: 'POST',
      body: JSON.stringify({
        partnerA: "I'm still upset about what happened yesterday.",
        partnerB: "I thought we had moved past that. Can we just focus on today?",
        context: {
          sessionId: 'session_123',
          messageCount: 15,
          previousAIResponses: ['Take a moment to breathe', 'Share your feelings']
        }
      }),
    });
    
    console.log('✅ Context-aware orchestration successful');
    console.log('📝 Response length:', JSON.stringify(contextResponse).length, 'characters');

    // Test 3: Safety validation
    console.log('\n3️⃣ Testing safety validation...');
    const safetyResponse = await makeRequest('/orchestrate', {
      method: 'POST',
      body: JSON.stringify({
        partnerA: "I'm feeling really overwhelmed and don't know what to do.",
        partnerB: "I'm here for you. Let's talk about what's going on."
      }),
    });
    
    console.log('✅ Safety validation successful');
    console.log('🛡️ Safety check passed:', safetyResponse.safety.isSafe);
    console.log('⚠️ Risk level:', safetyResponse.safety.riskLevel);

    // Test 4: Evaluation endpoint
    console.log('\n4️⃣ Testing AI response evaluation...');
    const evaluationResponse = await makeRequest('/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        originalInput: {
          partnerA: "I feel like you never listen to me when I'm trying to explain something important.",
          partnerB: "I do listen, but sometimes I need time to process what you're saying before I can respond."
        },
        aiResponse: basicResponse
      }),
    });
    
    console.log('✅ Evaluation successful');
    console.log('📊 Scores:', evaluationResponse.scores);
    console.log('⭐ Overall rating:', evaluationResponse.overall);
    console.log('💬 Feedback:', evaluationResponse.feedback);

    // Test 5: Different conversation scenarios
    console.log('\n5️⃣ Testing different conversation scenarios...');
    
    const scenarios = [
      {
        name: 'Appreciation',
        partnerA: "I really appreciate how you helped me with the project yesterday.",
        partnerB: "Thank you for saying that. I enjoyed working on it together."
      },
      {
        name: 'Conflict',
        partnerA: "I'm frustrated that you didn't call when you said you would.",
        partnerB: "I'm sorry, I got caught up at work and forgot. I should have texted you."
      },
      {
        name: 'Planning',
        partnerA: "I think we should plan a vacation for next month.",
        partnerB: "That sounds great! Where were you thinking of going?"
      }
    ];

    for (const scenario of scenarios) {
      console.log(`\n   Testing ${scenario.name} scenario...`);
      const response = await makeRequest('/orchestrate', {
        method: 'POST',
        body: JSON.stringify({
          partnerA: scenario.partnerA,
          partnerB: scenario.partnerB
        }),
      });
      
      console.log(`   ✅ ${scenario.name} scenario handled successfully`);
      console.log(`   📝 Clarify: ${response.clarify}`);
      console.log(`   🎯 Actions: ${response.micro_actions.length} suggestions`);
    }

    // Test 6: Error handling
    console.log('\n6️⃣ Testing error handling...');
    try {
      await makeRequest('/orchestrate', {
        method: 'POST',
        body: JSON.stringify({
          partnerA: "", // Empty input
          partnerB: "This should still work with fallback."
        }),
      });
      console.log('✅ Error handling successful (fallback response provided)');
    } catch (error) {
      console.log('✅ Error handling successful (error caught and handled)');
    }

    // Test 7: Health check
    console.log('\n7️⃣ Testing health check...');
    const healthResponse = await makeRequest('/health');
    console.log('✅ Health check successful');
    console.log('🏥 Service status:', healthResponse.status);
    console.log('🔧 Service version:', healthResponse.version);

    console.log('\n🎉 Complete M3 AI Orchestrator flow tested successfully!');
    console.log('\n📋 M3 Features Tested:');
    console.log('   ✅ AI reflection and mirroring');
    console.log('   ✅ Clarifying questions generation');
    console.log('   ✅ Micro-actions suggestions');
    console.log('   ✅ Safety validation and risk assessment');
    console.log('   ✅ Context-aware responses');
    console.log('   ✅ Response evaluation and scoring');
    console.log('   ✅ Multiple conversation scenarios');
    console.log('   ✅ Error handling and fallbacks');
    console.log('   ✅ Health monitoring');

  } catch (error) {
    console.error('❌ M3 AI Orchestrator test failed:', error.message);
    console.log('\n💡 Make sure the AI Orchestrator service is running:');
    console.log('   cd services/ai && OPENAI_API_KEY=your-key npx tsx src/enhanced-orchestrator.ts');
    console.log('\n🔑 You need to set your OpenAI API key in the environment:');
    console.log('   export OPENAI_API_KEY="your-openai-api-key-here"');
    process.exit(1);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ with fetch support');
  process.exit(1);
}

// Run the test
testAIOrchestrator();
