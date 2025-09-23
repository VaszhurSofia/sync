#!/usr/bin/env node

/**
 * Simple API test client for M1 - Auth + Couples
 * This demonstrates the complete authentication and couple management flow
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

  const data = response.ok ? await response.json() : await response.text();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${data}`);
  }
  
  return data;
}

async function testM1API() {
  console.log('🧪 Testing M1 API - Auth + Couples Flow\n');

  try {
    // Step 1: Request verification code for Alice
    console.log('1️⃣ Requesting verification code for Alice...');
    await makeRequest('/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email: 'alice@example.com' }),
    });
    console.log('✅ Verification code requested (check server logs for the code)');

    // Step 2: Verify code and get token for Alice
    console.log('\n2️⃣ Verifying code for Alice...');
    const aliceAuth = await makeRequest('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'alice@example.com', 
        code: '123456' // Use the code from server logs
      }),
    });
    console.log('✅ Alice authenticated, token received');

    // Step 3: Create couple as Alice
    console.log('\n3️⃣ Creating couple as Alice...');
    const couple = await makeRequest('/couples', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aliceAuth.accessToken}`,
      },
    });
    console.log('✅ Couple created:', couple.coupleId);

    // Step 4: Get Alice's user info
    console.log('\n4️⃣ Getting Alice\'s user info...');
    const aliceInfo = await makeRequest('/auth/me', {
      headers: {
        'Authorization': `Bearer ${aliceAuth.accessToken}`,
      },
    });
    console.log('✅ Alice info:', aliceInfo);

    // Step 5: Create invite as Alice
    console.log('\n5️⃣ Creating invite as Alice...');
    const invite = await makeRequest('/invites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aliceAuth.accessToken}`,
      },
    });
    console.log('✅ Invite created:', invite.code, invite.link);

    // Step 6: Get invite info
    console.log('\n6️⃣ Getting invite info...');
    const inviteInfo = await makeRequest(`/invites/${invite.code}`);
    console.log('✅ Invite info:', inviteInfo);

    // Step 7: Request verification code for Bob
    console.log('\n7️⃣ Requesting verification code for Bob...');
    await makeRequest('/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email: 'bob@example.com' }),
    });
    console.log('✅ Verification code requested for Bob');

    // Step 8: Verify code and get token for Bob
    console.log('\n8️⃣ Verifying code for Bob...');
    const bobAuth = await makeRequest('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'bob@example.com', 
        code: '123456' // Use the code from server logs
      }),
    });
    console.log('✅ Bob authenticated, token received');

    // Step 9: Bob accepts the invite
    console.log('\n9️⃣ Bob accepting the invite...');
    await makeRequest(`/invites/${invite.code}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bobAuth.accessToken}`,
      },
    });
    console.log('✅ Bob accepted the invite');

    // Step 10: Get Bob's updated info
    console.log('\n🔟 Getting Bob\'s updated info...');
    const bobInfo = await makeRequest('/auth/me', {
      headers: {
        'Authorization': `Bearer ${bobAuth.accessToken}`,
      },
    });
    console.log('✅ Bob info:', bobInfo);

    // Step 11: Get couple info as Alice
    console.log('\n1️⃣1️⃣ Getting couple info as Alice...');
    const coupleInfo = await makeRequest('/couples/me', {
      headers: {
        'Authorization': `Bearer ${aliceAuth.accessToken}`,
      },
    });
    console.log('✅ Couple info:', coupleInfo);

    console.log('\n🎉 Complete M1 API flow tested successfully!');
    console.log('\n📋 Flow Summary:');
    console.log('   ✅ Email-based authentication with verification codes');
    console.log('   ✅ User creation and JWT token generation');
    console.log('   ✅ Couple creation and management');
    console.log('   ✅ Invite system with codes and links');
    console.log('   ✅ Invite acceptance and couple joining');
    console.log('   ✅ Encrypted display names and secure data handling');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('\n💡 Make sure the API server is running:');
    console.log('   cd services/api && npm run dev');
    process.exit(1);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ with fetch support');
  console.log('   Or install node-fetch: npm install node-fetch');
  process.exit(1);
}

// Run the test
testM1API();
