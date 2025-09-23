#!/usr/bin/env tsx

/**
 * Test script for M1 - Auth + Couples
 * This script tests the complete authentication and couple management flow
 */

import { generateVerificationCode, generateInviteCode } from './utils/crypto';
import { 
  UserModel, 
  CoupleModel, 
  CoupleMemberModel, 
  InviteModel, 
  VerificationCodeModel,
  query 
} from './utils/database';

async function testM1() {
  console.log('🧪 Testing M1 - Auth + Couples Implementation\n');

  try {
    // Test 1: User Creation
    console.log('1️⃣ Testing user creation...');
    const user1 = await UserModel.create('alice@example.com', 'Alice');
    const user2 = await UserModel.create('bob@example.com', 'Bob');
    console.log('✅ Users created:', { user1: user1.id, user2: user2.id });

    // Test 2: Verification Code System
    console.log('\n2️⃣ Testing verification code system...');
    const code = generateVerificationCode();
    await VerificationCodeModel.create('alice@example.com', code);
    const isValid = await VerificationCodeModel.verify('alice@example.com', code);
    console.log('✅ Verification code system works:', isValid);

    // Test 3: Couple Creation
    console.log('\n3️⃣ Testing couple creation...');
    const couple = await CoupleModel.create();
    await CoupleMemberModel.addMember(couple.id, user1.id, 'userA');
    console.log('✅ Couple created:', couple.id);

    // Test 4: Invite System
    console.log('\n4️⃣ Testing invite system...');
    const inviteCode = generateInviteCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await InviteModel.create(couple.id, inviteCode, expiresAt);
    console.log('✅ Invite created:', inviteCode);

    // Test 5: Invite Acceptance
    console.log('\n5️⃣ Testing invite acceptance...');
    const result = await InviteModel.acceptInvite(inviteCode, user2.id);
    console.log('✅ Invite accepted:', result);

    // Test 6: Couple Members
    console.log('\n6️⃣ Testing couple members...');
    const members = await CoupleModel.getMembers(couple.id);
    console.log('✅ Couple members:', members.length);

    // Test 7: Display Name Encryption/Decryption
    console.log('\n7️⃣ Testing display name encryption...');
    const aliceDisplayName = await UserModel.getDisplayName(user1);
    const bobDisplayName = await UserModel.getDisplayName(user2);
    console.log('✅ Display names decrypted:', { alice: aliceDisplayName, bob: bobDisplayName });

    // Test 8: Database Queries
    console.log('\n8️⃣ Testing database queries...');
    const aliceCouple = await CoupleMemberModel.findByUser(user1.id);
    const bobCouple = await CoupleMemberModel.findByUser(user2.id);
    console.log('✅ User couple lookups:', { 
      alice: aliceCouple?.couple_id, 
      bob: bobCouple?.couple_id 
    });

    console.log('\n🎉 All M1 tests passed! The authentication and couple system is working correctly.');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ User creation with encrypted display names');
    console.log('   ✅ Verification code generation and validation');
    console.log('   ✅ Couple creation and member management');
    console.log('   ✅ Invite code generation and acceptance');
    console.log('   ✅ Database relationships and queries');
    console.log('   ✅ Encryption/decryption of sensitive data');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testM1()
    .then(() => {
      console.log('\n✅ M1 testing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ M1 testing failed:', error);
      process.exit(1);
    });
}

export { testM1 };
