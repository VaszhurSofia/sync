/**
 * Crypto Integration Tests
 * Tests AES-GCM encryption, KMS integration, and crypto health endpoint
 */

import { getEncryption, initializeEncryption } from '../src/crypto/aes-gcm';
import { getKMSClient, initializeKMS } from '../src/crypto/kms';
import { getCryptoHealth, cryptoHealthHandler } from '../src/health/crypto';

describe('Crypto Integration Tests', () => {
  let encryption: any;
  let kmsClient: any;

  beforeEach(async () => {
    // Set up test environment
    process.env.KMS_KEY_ID = 'test-kms-key-12345';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-67890';
    
    encryption = getEncryption();
    kmsClient = getKMSClient();
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.KMS_KEY_ID;
    delete process.env.ENCRYPTION_KEY;
  });

  describe('AES-GCM Encryption', () => {
    it('should encrypt and decrypt data correctly', async () => {
      await encryption.deriveDEK();
      
      const testData = 'This is sensitive message content that needs encryption';
      const encrypted = await encryption.encryptForStorage(testData);
      const decrypted = await encryption.decryptFromStorage(encrypted);
      
      expect(decrypted).toBe(testData);
      expect(encrypted).not.toBe(testData);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should handle empty strings', async () => {
      await encryption.deriveDEK();
      
      const emptyString = '';
      const encrypted = await encryption.encryptForStorage(emptyString);
      const decrypted = await encryption.decryptFromStorage(encrypted);
      
      expect(decrypted).toBe(emptyString);
    });

    it('should handle special characters and unicode', async () => {
      await encryption.deriveDEK();
      
      const unicodeData = '🚀 Special chars: !@#$%^&*()_+{}|:"<>?[]\\;\',./ 中文 العربية';
      const encrypted = await encryption.encryptForStorage(unicodeData);
      const decrypted = await encryption.decryptFromStorage(encrypted);
      
      expect(decrypted).toBe(unicodeData);
    });

    it('should fail decryption with invalid data', async () => {
      await encryption.deriveDEK();
      
      const invalidData = 'invalid-base64-data-that-will-fail';
      
      await expect(encryption.decryptFromStorage(invalidData)).rejects.toThrow();
    });

    it('should pass self-test', async () => {
      await encryption.deriveDEK();
      
      const selfTestResult = await encryption.selfTest();
      expect(selfTestResult).toBe(true);
    });

    it('should track DEK age correctly', async () => {
      await encryption.deriveDEK();
      
      const age = encryption.getDEKAge();
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(1); // Should be less than 1 day for fresh DEK
    });

    it('should get encryption status', async () => {
      await encryption.deriveDEK();
      
      const status = encryption.getStatus();
      expect(status.kmsKeyId).toBeDefined();
      expect(status.dekAvailable).toBe(true);
      expect(status.dekAgeDays).toBeGreaterThanOrEqual(0);
      expect(status.encryptionMethod).toBe('AES-256-GCM');
    });
  });

  describe('KMS Integration', () => {
    it('should check KMS connection successfully', async () => {
      const status = await kmsClient.checkConnection();
      
      expect(status.connected).toBe(true);
      expect(status.keyId).toBe('test-kms-key-12345');
      expect(status.keyStatus).toBe('active');
      expect(status.lastChecked).toBeDefined();
    });

    it('should fail KMS connection when no key is provided', async () => {
      delete process.env.KMS_KEY_ID;
      delete process.env.ENCRYPTION_KEY;
      
      const kms = getKMSClient();
      const status = await kms.checkConnection();
      
      expect(status.connected).toBe(false);
      expect(status.keyStatus).toBe('error');
      expect(status.error).toBeDefined();
    });

    it('should initialize KMS successfully', async () => {
      await expect(kmsClient.initialize()).resolves.not.toThrow();
    });

    it('should fail initialization when KMS is unavailable', async () => {
      delete process.env.KMS_KEY_ID;
      delete process.env.ENCRYPTION_KEY;
      
      const kms = getKMSClient();
      await expect(kms.initialize()).rejects.toThrow();
    });

    it('should provide encryption instance', () => {
      const encryptionInstance = kmsClient.getEncryption();
      expect(encryptionInstance).toBeDefined();
      expect(typeof encryptionInstance.encrypt).toBe('function');
      expect(typeof encryptionInstance.decrypt).toBe('function');
    });
  });

  describe('Crypto Health Endpoint', () => {
    it('should return healthy status when everything is working', async () => {
      await encryption.deriveDEK();
      
      const health = await getCryptoHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.kms).toBe('ok');
      expect(health.selftest).toBe('ok');
      expect(health.dek_age_days).toBeGreaterThanOrEqual(0);
      expect(health.encryptionMethod).toBe('AES-256-GCM');
    });

    it('should return degraded status when DEK is old', async () => {
      await encryption.deriveDEK();
      
      // Mock old DEK by manipulating the derived date
      const encryptionInstance = encryption as any;
      if (encryptionInstance.dekDerivedAt) {
        encryptionInstance.dekDerivedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      }
      
      const health = await getCryptoHealth();
      
      expect(health.status).toBe('degraded');
      expect(health.dek_age_days).toBeGreaterThan(7);
    });

    it('should return unhealthy status when KMS fails', async () => {
      delete process.env.KMS_KEY_ID;
      delete process.env.ENCRYPTION_KEY;
      
      const health = await getCryptoHealth();
      
      expect(health.status).toBe('unhealthy');
      expect(health.kms).toBe('error');
      expect(health.selftest).toBe('failed');
      expect(health.errors).toBeDefined();
    });

    it('should return unhealthy status when self-test fails', async () => {
      // Mock self-test failure
      const originalSelfTest = encryption.selfTest;
      encryption.selfTest = jest.fn().mockResolvedValue(false);
      
      const health = await getCryptoHealth();
      
      expect(health.status).toBe('unhealthy');
      expect(health.selftest).toBe('failed');
      
      // Restore original method
      encryption.selfTest = originalSelfTest;
    });

    it('should return correct HTTP status codes', async () => {
      const mockReply = {
        code: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      
      const mockRequest = {};
      
      await cryptoHealthHandler(mockRequest as any, mockReply as any);
      
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        kms: 'ok',
        dek_age_days: expect.any(Number),
        selftest: 'ok'
      });
    });

    it('should handle health check errors gracefully', async () => {
      const mockReply = {
        code: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      
      const mockRequest = {};
      
      // Mock encryption to throw error
      const originalGetEncryption = require('../src/crypto/aes-gcm').getEncryption;
      require('../src/crypto/aes-gcm').getEncryption = jest.fn().mockImplementation(() => {
        throw new Error('Encryption system unavailable');
      });
      
      await cryptoHealthHandler(mockRequest as any, mockReply as any);
      
      expect(mockReply.code).toHaveBeenCalledWith(503);
      expect(mockReply.send).toHaveBeenCalledWith({
        kms: 'error',
        dek_age_days: -1,
        selftest: 'failed'
      });
      
      // Restore original function
      require('../src/crypto/aes-gcm').getEncryption = originalGetEncryption;
    });
  });

  describe('Database Field Encryption', () => {
    it('should encrypt messages.content field', async () => {
      await encryption.deriveDEK();
      
      const messageContent = 'This is a sensitive message that needs to be encrypted';
      const encrypted = await encryption.encryptField('messages.content', messageContent);
      const decrypted = await encryption.decryptField('messages.content', encrypted);
      
      expect(decrypted).toBe(messageContent);
      expect(encrypted).not.toBe(messageContent);
    });

    it('should encrypt users.display_name field', async () => {
      await encryption.deriveDEK();
      
      const displayName = 'John Doe';
      const encrypted = await encryption.encryptField('users.display_name', displayName);
      const decrypted = await encryption.decryptField('users.display_name', encrypted);
      
      expect(decrypted).toBe(displayName);
      expect(encrypted).not.toBe(displayName);
    });

    it('should encrypt sessions.summary_text field', async () => {
      await encryption.deriveDEK();
      
      const summaryText = 'Session summary with sensitive information';
      const encrypted = await encryption.encryptField('sessions.summary_text', summaryText);
      const decrypted = await encryption.decryptField('sessions.summary_text', encrypted);
      
      expect(decrypted).toBe(summaryText);
      expect(encrypted).not.toBe(summaryText);
    });
  });

  describe('Log Redaction', () => {
    it('should not log sensitive data in encryption operations', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await encryption.deriveDEK();
      
      const sensitiveData = 'This is sensitive data that should not appear in logs';
      await encryption.encryptForStorage(sensitiveData);
      
      // Check that sensitive data is not logged
      const logCalls = consoleSpy.mock.calls;
      const errorCalls = consoleErrorSpy.mock.calls;
      
      const allLogs = [...logCalls, ...errorCalls].flat();
      const hasSensitiveData = allLogs.some(log => 
        typeof log === 'string' && log.includes(sensitiveData)
      );
      
      expect(hasSensitiveData).toBe(false);
      
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should not log encryption keys or DEK', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await encryption.deriveDEK();
      
      const allLogs = [...consoleSpy.mock.calls, ...consoleErrorSpy.mock.calls].flat();
      
      // Check that encryption keys are not logged
      const hasEncryptionKey = allLogs.some(log => 
        typeof log === 'string' && (
          log.includes(process.env.KMS_KEY_ID || '') ||
          log.includes(process.env.ENCRYPTION_KEY || '') ||
          log.includes('test-kms-key') ||
          log.includes('test-encryption-key')
        )
      );
      
      expect(hasEncryptionKey).toBe(false);
      
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('should complete full encryption workflow', async () => {
      // Initialize KMS
      await kmsClient.initialize();
      
      // Test encryption
      const testData = 'Full workflow test data';
      const encrypted = await encryption.encryptForStorage(testData);
      const decrypted = await encryption.decryptFromStorage(encrypted);
      
      expect(decrypted).toBe(testData);
      
      // Test health check
      const health = await getCryptoHealth();
      expect(health.status).toBe('healthy');
      expect(health.kms).toBe('ok');
      expect(health.selftest).toBe('ok');
    });

    it('should handle encryption failures gracefully', async () => {
      // Test with invalid data
      await expect(encryption.encryptForStorage(null as any)).rejects.toThrow();
      await expect(encryption.encryptForStorage(undefined as any)).rejects.toThrow();
    });

    it('should maintain encryption consistency across multiple operations', async () => {
      await encryption.deriveDEK();
      
      const testData = 'Consistency test data';
      const encrypted1 = await encryption.encryptForStorage(testData);
      const encrypted2 = await encryption.encryptForStorage(testData);
      
      // Encrypted data should be different (due to random nonce)
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same plaintext
      const decrypted1 = await encryption.decryptFromStorage(encrypted1);
      const decrypted2 = await encryption.decryptFromStorage(encrypted2);
      
      expect(decrypted1).toBe(testData);
      expect(decrypted2).toBe(testData);
    });
  });
});
