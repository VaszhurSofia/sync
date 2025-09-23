#!/usr/bin/env node

/**
 * Simple test for M1 - Auth + Couples (Simplified Version)
 * This tests the basic authentication and couple management flow
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

async function testM1Simple() {
  console.log('🧪 Testing M1 Simple - Auth + Couples Flow\n');

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

    // Step 3: Get Alice's user info
    console.log('\n3️⃣ Getting Alice\'s user info...');
    const aliceInfo = await makeRequest('/auth/me', {
      headers: {
        'Authorization': `Bearer ${aliceAuth.accessToken}`,
      },
    });
    console.log('✅ Alice info:', aliceInfo);

    // Step 4: Create couple as Alice
    console.log('\n4️⃣ Creating couple as Alice...');
    const couple = await makeRequest('/couples', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aliceAuth.accessToken}`,
      },
    });
    console.log('✅ Couple created:', couple.coupleId);

    // Step 5: Create invite as Alice
    console.log('\n5️⃣ Creating invite as Alice...');
    const invite = await makeRequest('/invites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aliceAuth.accessToken}`,
      },
    });
    console.log('✅ Invite created:', invite.code, invite.link);

    // Step 6: Request verification code for Bob
    console.log('\n6️⃣ Requesting verification code for Bob...');
    await makeRequest('/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email: 'bob@example.com' }),
    });
    console.log('✅ Verification code requested for Bob');

    // Step 7: Verify code and get token for Bob
    console.log('\n7️⃣ Verifying code for Bob...');
    const bobAuth = await makeRequest('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'bob@example.com', 
        code: '123456' // Use the code from server logs
      }),
    });
    console.log('✅ Bob authenticated, token received');

    // Step 8: Bob accepts the invite
    console.log('\n8️⃣ Bob accepting the invite...');
    await makeRequest(`/invites/${invite.code}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bobAuth.accessToken}`,
      },
    });
    console.log('✅ Bob accepted the invite');

    // Step 9: Get Bob's updated info
    console.log('\n9️⃣ Getting Bob\'s updated info...');
    const bobInfo = await makeRequest('/auth/me', {
      headers: {
        'Authorization': `Bearer ${bobAuth.accessToken}`,
      },
    });
    console.log('✅ Bob info:', bobInfo);

    // Step 10: Get couple info as Alice
    console.log('\n🔟 Getting couple info as Alice...');
    const coupleInfo = await makeRequest('/couples/me', {
      headers: {
        'Authorization': `Bearer ${aliceAuth.accessToken}`,
      },
    });
    console.log('✅ Couple info:', coupleInfo);

    console.log('\n🎉 Complete M1 Simple flow tested successfully!');
    console.log('\n📋 Flow Summary:');
    console.log('   ✅ Email-based authentication with verification codes');
    console.log('   ✅ User creation and JWT token generation');
    console.log('   ✅ Couple creation and management');
    console.log('   ✅ Invite system with codes and links');
    console.log('   ✅ Invite acceptance and couple joining');
    console.log('   ✅ Basic data storage and retrieval');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('\n💡 Make sure the simple API server is running:');
    console.log('   cd services/api && npx tsx src/simple-server.ts');
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
testM1Simple();
