import { AESGCMEncryption, getEncryption, initializeEncryption, ENCRYPTED_FIELDS } from '../crypto/aes-gcm';
import { getKMSClient, initializeKMS } from '../crypto/kms';

describe('AES-GCM Encryption', () => {
  let encryption: AESGCMEncryption;

  beforeEach(async () => {
    // Set up test environment
    process.env.KMS_KEY_ID = 'test-key-123';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing-only';
    
    encryption = new AESGCMEncryption('test-key-123');
    await encryption.deriveDEK();
  });

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt and decrypt plaintext correctly', async () => {
      const plaintext = 'This is a test message for encryption';
      
      const encrypted = await encryption.encryptForStorage(plaintext);
      const decrypted = await encryption.decryptFromStorage(encrypted);
      
      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 format
    });

    it('should handle empty strings', async () => {
      const plaintext = '';
      
      const encrypted = await encryption.encryptForStorage(plaintext);
      const decrypted = await encryption.decryptFromStorage(encrypted);
      
      expect(decrypted).toBe(plaintext);
      expect(encrypted).toBe('');
    });

    it('should handle special characters and unicode', async () => {
      const plaintext = 'Hello 世界! 🚀 Special chars: @#$%^&*()';
      
      const encrypted = await encryption.encryptForStorage(plaintext);
      const decrypted = await encryption.decryptFromStorage(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', async () => {
      const plaintext = 'Same message';
      
      const encrypted1 = await encryption.encryptForStorage(plaintext);
      const encrypted2 = await encryption.encryptForStorage(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2); // Different nonces
      
      // But both should decrypt to same plaintext
      const decrypted1 = await encryption.decryptFromStorage(encrypted1);
      const decrypted2 = await encryption.decryptFromStorage(encrypted2);
      
      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });
  });

  describe('Field-Specific Encryption', () => {
    it('should encrypt messages.content field', async () => {
      const content = 'This is a message content';
      
      const encrypted = await encryption.encryptField('messages.content', content);
      const decrypted = await encryption.decryptField('messages.content', encrypted);
      
      expect(decrypted).toBe(content);
    });

    it('should encrypt users.display_name field', async () => {
      const displayName = 'John Doe';
      
      const encrypted = await encryption.encryptField('users.display_name', displayName);
      const decrypted = await encryption.decryptField('users.display_name', encrypted);
      
      expect(decrypted).toBe(displayName);
    });

    it('should encrypt sessions.summary_text field', async () => {
      const summaryText = 'Session summary: Discussed weekend plans';
      
      const encrypted = await encryption.encryptField('sessions.summary_text', summaryText);
      const decrypted = await encryption.decryptField('sessions.summary_text', encrypted);
      
      expect(decrypted).toBe(summaryText);
    });
  });

  describe('Database Storage Format', () => {
    it('should produce valid base64 for database storage', async () => {
      const plaintext = 'Database storage test';
      
      const encrypted = await encryption.encryptForStorage(plaintext);
      
      // Should be valid base64
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
      
      // Should contain nonce + tag + ciphertext
      const combined = Buffer.from(encrypted, 'base64');
      expect(combined.length).toBeGreaterThan(28); // 12 (nonce) + 16 (tag) + ciphertext
    });

    it('should handle corrupted data gracefully', async () => {
      const corruptedData = 'invalid-base64-data!@#';
      
      await expect(encryption.decryptFromStorage(corruptedData))
        .rejects.toThrow('Failed to decrypt data');
    });

    it('should detect tampering', async () => {
      const plaintext = 'Original message';
      const encrypted = await encryption.encryptForStorage(plaintext);
      
      // Tamper with the encrypted data
      const tampered = encrypted.slice(0, -5) + 'XXXXX';
      
      await expect(encryption.decryptFromStorage(tampered))
        .rejects.toThrow('Decryption failed - invalid data or tampering detected');
    });
  });

  describe('Self-Test', () => {
    it('should pass self-test', async () => {
      const result = await encryption.selfTest();
      expect(result).toBe(true);
    });

    it('should fail self-test with invalid DEK', async () => {
      // Create encryption with invalid key
      const invalidEncryption = new AESGCMEncryption('invalid-key');
      
      // This should fail during DEK derivation or self-test
      await expect(invalidEncryption.selfTest()).rejects.toThrow();
    });
  });

  describe('DEK Management', () => {
    it('should track DEK age', () => {
      const age = encryption.getDEKAge();
      expect(typeof age).toBe('number');
      expect(age).toBeGreaterThanOrEqual(0);
    });

    it('should provide encryption status', () => {
      const status = encryption.getStatus();
      
      expect(status).toHaveProperty('kmsKeyId');
      expect(status).toHaveProperty('dekAvailable');
      expect(status).toHaveProperty('dekAgeDays');
      expect(status).toHaveProperty('encryptionMethod');
      
      expect(status.kmsKeyId).toBe('test-key-123');
      expect(status.dekAvailable).toBe(true);
      expect(status.encryptionMethod).toBe('AES-256-GCM');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = getEncryption();
      const instance2 = getEncryption();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize encryption system', async () => {
      await expect(initializeEncryption()).resolves.not.toThrow();
    });
  });
});

describe('KMS Integration', () => {
  beforeEach(() => {
    process.env.KMS_KEY_ID = 'test-kms-key';
    process.env.ENCRYPTION_KEY = 'test-encryption-key';
  });

  describe('KMS Client', () => {
    it('should create KMS client', () => {
      const kms = getKMSClient();
      expect(kms).toBeDefined();
    });

    it('should return same KMS client instance', () => {
      const kms1 = getKMSClient();
      const kms2 = getKMSClient();
      expect(kms1).toBe(kms2);
    });

    it('should check KMS connection', async () => {
      const kms = getKMSClient();
      const status = await kms.checkConnection();
      
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('keyId');
      expect(status).toHaveProperty('keyStatus');
      expect(status).toHaveProperty('lastChecked');
    });

    it('should initialize KMS', async () => {
      await expect(initializeKMS()).resolves.not.toThrow();
    });
  });
});

describe('Integration Tests', () => {
  it('should perform complete round-trip encryption/decryption', async () => {
    // Initialize systems
    await initializeKMS();
    await initializeEncryption();
    
    const encryption = getEncryption();
    
    // Test data
    const testData = [
      'Simple message',
      'Message with special chars: @#$%^&*()',
      'Unicode message: 世界 🌍',
      'Long message: '.repeat(100),
      '' // Empty string
    ];
    
    for (const plaintext of testData) {
      // Encrypt
      const encrypted = await encryption.encryptForStorage(plaintext);
      
      // Verify it's different from plaintext
      expect(encrypted).not.toBe(plaintext);
      
      // Decrypt
      const decrypted = await encryption.decryptFromStorage(encrypted);
      
      // Verify round-trip
      expect(decrypted).toBe(plaintext);
    }
  });

  it('should handle database field encryption', async () => {
    await initializeKMS();
    await initializeEncryption();
    
    const encryption = getEncryption();
    
    // Test all encrypted fields
    const testFields = [
      { field: 'messages.content' as const, value: 'User message content' },
      { field: 'users.display_name' as const, value: 'John Doe' },
      { field: 'sessions.summary_text' as const, value: 'Session summary text' }
    ];
    
    for (const { field, value } of testFields) {
      const encrypted = await encryption.encryptField(field, value);
      const decrypted = await encryption.decryptField(field, encrypted);
      
      expect(decrypted).toBe(value);
      expect(encrypted).not.toBe(value);
    }
  });
});
