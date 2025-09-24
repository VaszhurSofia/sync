import { createCipherGCM, createDecipherGCM, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Field-specific encryption for database columns
export const ENCRYPTED_FIELDS = {
  'messages.content': 'content_enc',
  'users.display_name': 'display_name_enc', 
  'sessions.summary_text': 'summary_text_enc'
} as const;

interface EncryptionResult {
  ciphertext: Buffer;
  nonce: Buffer;
  tag: Buffer;
}

interface DecryptionResult {
  plaintext: string;
  isValid: boolean;
}

export class AESGCMEncryption {
  private dek: Buffer | null = null;
  private dekDerivedAt: Date | null = null;
  private kmsKeyId: string;
  private salt: Buffer;

  constructor(kmsKeyId: string) {
    this.kmsKeyId = kmsKeyId;
    this.salt = Buffer.from('sync-encryption-salt-2024', 'utf8');
  }

  /**
   * Derive Data Encryption Key (DEK) from KMS key
   */
  async deriveDEK(): Promise<void> {
    try {
      // In production, this would call actual KMS service
      // For now, we'll derive from environment variable
      const kmsKey = process.env.KMS_KEY_ID || process.env.ENCRYPTION_KEY;
      if (!kmsKey) {
        throw new Error('KMS_KEY_ID or ENCRYPTION_KEY not found');
      }

      // Derive DEK using scrypt
      this.dek = await scryptAsync(kmsKey, this.salt, 32) as Buffer;
      this.dekDerivedAt = new Date();
      
      console.log('✅ DEK derived successfully from KMS key');
    } catch (error) {
      console.error('❌ Failed to derive DEK:', error);
      throw new Error('DEK derivation failed');
    }
  }

  /**
   * Get DEK age in days
   */
  getDEKAge(): number {
    if (!this.dekDerivedAt) {
      return -1; // Not derived
    }
    const now = new Date();
    const diffMs = now.getTime() - this.dekDerivedAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Ensure DEK is available
   */
  private async ensureDEK(): Promise<Buffer> {
    if (!this.dek) {
      await this.deriveDEK();
    }
    if (!this.dek) {
      throw new Error('DEK not available');
    }
    return this.dek;
  }

  /**
   * Encrypt data using AES-GCM
   */
  async encrypt(plaintext: string): Promise<EncryptionResult> {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }

    const dek = await this.ensureDEK();
    const nonce = randomBytes(12); // 96-bit nonce for GCM
    const cipher = createCipherGCM('aes-256-gcm', dek, nonce);

    let ciphertext = cipher.update(plaintext, 'utf8');
    cipher.final();
    const tag = cipher.getAuthTag();

    return {
      ciphertext,
      nonce,
      tag
    };
  }

  /**
   * Decrypt data using AES-GCM
   */
  async decrypt(ciphertext: Buffer, nonce: Buffer, tag: Buffer): Promise<DecryptionResult> {
    try {
      const dek = await this.ensureDEK();
      const decipher = createDecipherGCM('aes-256-gcm', dek, nonce);
      decipher.setAuthTag(tag);

      let plaintext = decipher.update(ciphertext, undefined, 'utf8');
      decipher.final();

      return {
        plaintext,
        isValid: true
      };
    } catch (error) {
      return {
        plaintext: '',
        isValid: false
      };
    }
  }

  /**
   * Encrypt and encode for database storage
   */
  async encryptForStorage(plaintext: string): Promise<string> {
    if (!plaintext) return '';
    
    const result = await this.encrypt(plaintext);
    
    // Combine nonce + tag + ciphertext
    const combined = Buffer.concat([result.nonce, result.tag, result.ciphertext]);
    
    // Encode as base64 for database storage
    return combined.toString('base64');
  }

  /**
   * Encrypt specific database field
   */
  async encryptField(fieldName: keyof typeof ENCRYPTED_FIELDS, plaintext: string): Promise<string> {
    return this.encryptForStorage(plaintext);
  }

  /**
   * Decode and decrypt from database storage
   */
  async decryptFromStorage(encryptedData: string): Promise<string> {
    if (!encryptedData) return '';
    
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract nonce (12 bytes), tag (16 bytes), ciphertext (remaining)
      const nonce = combined.subarray(0, 12);
      const tag = combined.subarray(12, 28);
      const ciphertext = combined.subarray(28);
      
      const result = await this.decrypt(ciphertext, nonce, tag);
      
      if (!result.isValid) {
        throw new Error('Decryption failed - invalid data or tampering detected');
      }
      
      return result.plaintext;
    } catch (error) {
      throw new Error(`Failed to decrypt data: ${error.message}`);
    }
  }

  /**
   * Decrypt specific database field
   */
  async decryptField(fieldName: keyof typeof ENCRYPTED_FIELDS, encryptedData: string): Promise<string> {
    return this.decryptFromStorage(encryptedData);
  }

  /**
   * Self-test encryption/decryption
   */
  async selfTest(): Promise<boolean> {
    try {
      const testData = 'Sync encryption self-test data - 2024';
      const encrypted = await this.encryptForStorage(testData);
      const decrypted = await this.decryptFromStorage(encrypted);
      
      return decrypted === testData;
    } catch (error) {
      console.error('Self-test failed:', error);
      return false;
    }
  }

  /**
   * Get encryption status
   */
  getStatus() {
    return {
      kmsKeyId: this.kmsKeyId,
      dekAvailable: !!this.dek,
      dekAgeDays: this.getDEKAge(),
      dekDerivedAt: this.dekDerivedAt?.toISOString(),
      encryptionMethod: 'AES-256-GCM'
    };
  }
}

// Singleton instance
let encryptionInstance: AESGCMEncryption | null = null;

export function getEncryption(): AESGCMEncryption {
  if (!encryptionInstance) {
    const kmsKeyId = process.env.KMS_KEY_ID || 'default-key';
    encryptionInstance = new AESGCMEncryption(kmsKeyId);
  }
  return encryptionInstance;
}

export async function initializeEncryption(): Promise<void> {
  const encryption = getEncryption();
  await encryption.deriveDEK();
  
  // Run self-test
  const selfTestPassed = await encryption.selfTest();
  if (!selfTestPassed) {
    throw new Error('Encryption self-test failed');
  }
  
  console.log('🔐 Encryption system initialized successfully');
}
