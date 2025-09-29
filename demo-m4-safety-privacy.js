#!/usr/bin/env node

/**
 * M4 Demo: Safety & Privacy
 * Demonstrates enhanced safety classification, privacy controls, and GDPR compliance
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

async function demo() {
  console.log('🚀 M4 Demo: Safety & Privacy\n');

  try {
    // 1. Health check with privacy info
    console.log('1. Health Check with Privacy Info');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Privacy Settings: ${JSON.stringify(health.data.privacy, null, 2)}\n`);

    // 2. Test privacy settings
    console.log('2. Test Privacy Settings');
    const privacySettings = await makeRequest('GET', '/privacy/settings', null, {
      'Authorization': 'Bearer token_userA'
    });
    
    console.log(`   Status: ${privacySettings.status}`);
    console.log(`   Settings: ${JSON.stringify(privacySettings.data, null, 2)}\n`);

    // 3. Update privacy settings
    console.log('3. Update Privacy Settings');
    const updatePrivacy = await makeRequest('PUT', '/privacy/settings', {
      dataRetention: 60,
      auditLogging: true,
      dataAnonymization: true
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${updatePrivacy.status}`);
    console.log(`   Updated: ${updatePrivacy.data.success}\n`);

    // 4. Test safety classification
    console.log('4. Test Safety Classification');
    const safetyTest = await makeRequest('POST', '/safety/classify', {
      content: 'I feel really angry and want to hurt someone',
      sessionId: 'test_session'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${safetyTest.status}`);
    if (safetyTest.data.classification) {
      const classification = safetyTest.data.classification;
      console.log(`   Safety Level: ${classification.level}`);
      console.log(`   Action: ${classification.action}`);
      console.log(`   Categories: ${classification.categories.join(', ')}`);
      console.log(`   Confidence: ${classification.confidence}`);
    }
    console.log('');

    // 5. Create session with safety tracking
    console.log('5. Create Session with Safety Tracking');
    const session = await makeRequest('POST', '/sessions', {
      mode: 'couple',
      coupleId: '123e4567-e89b-12d3-a456-426614174000'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${session.status}`);
    console.log(`   Session: ${JSON.stringify(session.data)}\n`);
    
    const sessionId = session.data.sessionId;

    // 6. Test normal message (should pass)
    console.log('6. Test Normal Message (should pass)');
    const normalMsg = await makeRequest('POST', `/sessions/${sessionId}/messages`, {
      sender: 'userA',
      content: 'I feel like we need to talk about our communication',
      clientMessageId: 'msg_normal'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${normalMsg.status}`);
    if (normalMsg.status === 202) {
      console.log(`   ✅ Message accepted`);
      console.log(`   Safety Level: ${normalMsg.data.safetyLevel}`);
      console.log(`   Flagged: ${normalMsg.data.flagged}`);
    } else {
      console.log(`   ❌ Error: ${JSON.stringify(normalMsg.data)}`);
    }
    console.log('');

    // 7. Test high-risk message (should be flagged)
    console.log('7. Test High-Risk Message (should be flagged)');
    const highRiskMsg = await makeRequest('POST', `/sessions/${sessionId}/messages`, {
      sender: 'userA',
      content: 'I am so angry I could kill someone right now',
      clientMessageId: 'msg_high_risk'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${highRiskMsg.status}`);
    if (highRiskMsg.status === 409) {
      console.log(`   ✅ Safety protection working`);
      console.log(`   Error: ${highRiskMsg.data.message}`);
      console.log(`   Safety Level: ${highRiskMsg.data.safetyLevel}`);
      console.log(`   Categories: ${highRiskMsg.data.categories?.join(', ')}`);
    } else {
      console.log(`   ❌ Expected 409, got ${highRiskMsg.status}`);
    }
    console.log('');

    // 8. Test critical safety message (should be blocked)
    console.log('8. Test Critical Safety Message (should be blocked)');
    const criticalMsg = await makeRequest('POST', `/sessions/${sessionId}/messages`, {
      sender: 'userA',
      content: 'I want to kill myself and end it all',
      clientMessageId: 'msg_critical'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${criticalMsg.status}`);
    if (criticalMsg.status === 409) {
      console.log(`   ✅ Critical safety protection working`);
      console.log(`   Error: ${criticalMsg.data.message}`);
      console.log(`   Safety Level: ${criticalMsg.data.safetyLevel}`);
      if (criticalMsg.data.resources) {
        console.log(`   Emergency Resources:`);
        criticalMsg.data.resources.forEach((resource, i) => {
          console.log(`     ${i + 1}. ${resource}`);
        });
      }
    } else {
      console.log(`   ❌ Expected 409, got ${criticalMsg.status}`);
    }
    console.log('');

    // 9. Test audit logging
    console.log('9. Test Audit Logging');
    const auditLogs = await makeRequest('GET', '/privacy/audit-logs', null, {
      'Authorization': 'Bearer token_userA'
    });
    
    console.log(`   Status: ${auditLogs.status}`);
    console.log(`   Audit Logs: ${auditLogs.data.count} entries`);
    if (auditLogs.data.logs.length > 0) {
      console.log(`   Latest Log: ${JSON.stringify(auditLogs.data.logs[0], null, 2)}`);
    }
    console.log('');

    // 10. Test data export (GDPR)
    console.log('10. Test Data Export (GDPR)');
    const dataExport = await makeRequest('POST', '/privacy/export-data', {}, {
      'Authorization': 'Bearer token_userA'
    });
    
    console.log(`   Status: ${dataExport.status}`);
    console.log(`   Export ID: ${dataExport.data.exportId}`);
    console.log(`   Download URL: ${dataExport.data.downloadUrl}`);
    console.log(`   Expires: ${dataExport.data.expiresAt}\n`);

    // 11. Test feedback with safety context
    console.log('11. Test Feedback with Safety Context');
    const feedback = await makeRequest('POST', `/sessions/${sessionId}/feedback`, {
      rating: 'neutral',
      safetyFeedback: 'The safety features helped me feel more secure'
    }, { 'Authorization': 'Bearer token_userA' });
    
    console.log(`   Status: ${feedback.status}`);
    console.log(`   Feedback submitted with safety context\n`);

    // 12. Test boundary resources
    console.log('12. Test Boundary Resources');
    const boundaryResources = await makeRequest('GET', '/boundary/resources');
    
    console.log(`   Status: ${boundaryResources.status}`);
    console.log(`   Region: ${boundaryResources.data.region}`);
    console.log(`   Safety Level: ${boundaryResources.data.safetyLevel}`);
    console.log(`   Resources: ${boundaryResources.data.resources.length} available`);
    boundaryResources.data.resources.forEach((resource, i) => {
      console.log(`     ${i + 1}. ${resource.name} (${resource.phone}) - ${resource.available}`);
    });
    console.log('');

    // 13. Test crypto health
    console.log('13. Test Crypto Health');
    const cryptoHealth = await makeRequest('GET', '/health/crypto');
    
    console.log(`   Status: ${cryptoHealth.status}`);
    console.log(`   KMS: ${cryptoHealth.data.kms}`);
    console.log(`   DEK Age: ${cryptoHealth.data.dek_age_days} days`);
    console.log(`   Encryption Level: ${cryptoHealth.data.encryption_level}\n`);

    // 14. Test data deletion (GDPR)
    console.log('14. Test Data Deletion (GDPR)');
    const deleteData = await makeRequest('DELETE', '/privacy/delete-data', {}, {
      'Authorization': 'Bearer token_userA'
    });
    
    console.log(`   Status: ${deleteData.status}`);
    if (deleteData.data.success) {
      console.log(`   ✅ User data deleted successfully`);
      console.log(`   Message: ${deleteData.data.message}`);
    } else {
      console.log(`   ❌ Data deletion failed`);
    }

    console.log('\n🎉 M4 Demo Complete!');
    console.log('\n✅ Features Demonstrated:');
    console.log('   • Enhanced safety tier-2 classification');
    console.log('   • Privacy controls and data handling');
    console.log('   • Encryption at rest and in transit');
    console.log('   • Audit logging and compliance');
    console.log('   • GDPR compliance features');
    console.log('   • Data export and deletion rights');
    console.log('   • Safety level tracking and recommendations');
    console.log('   • Emergency resource provision');
    console.log('   • Privacy settings management');
    console.log('   • Crypto health monitoring');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Start the demo
demo();
