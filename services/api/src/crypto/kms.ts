import { AESGCMEncryption } from './aes-gcm';

interface KMSStatus {
  connected: boolean;
  keyId: string;
  keyStatus: 'active' | 'inactive' | 'error';
  lastChecked: string;
  error?: string;
}

export class KMSClient {
  private keyId: string;
  private encryption: AESGCMEncryption;

  constructor(keyId: string) {
    this.keyId = keyId;
    this.encryption = new AESGCMEncryption(keyId);
  }

  /**
   * Check KMS connection status
   */
  async checkConnection(): Promise<KMSStatus> {
    try {
      // In production, this would make actual KMS API calls
      // For now, we'll simulate KMS connectivity
      const keyExists = !!process.env.KMS_KEY_ID || !!process.env.ENCRYPTION_KEY;
      
      if (!keyExists) {
        return {
          connected: false,
          keyId: this.keyId,
          keyStatus: 'error',
          lastChecked: new Date().toISOString(),
          error: 'KMS key not found in environment'
        };
      }

      // Simulate KMS key status check
      const keyStatus = process.env.KMS_KEY_ID ? 'active' : 'inactive';
      
      return {
        connected: true,
        keyId: this.keyId,
        keyStatus: keyStatus as 'active' | 'inactive',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        connected: false,
        keyId: this.keyId,
        keyStatus: 'error',
        lastChecked: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Get encryption instance
   */
  getEncryption(): AESGCMEncryption {
    return this.encryption;
  }

  /**
   * Initialize KMS and encryption
   */
  async initialize(): Promise<void> {
    const status = await this.checkConnection();
    
    if (!status.connected) {
      throw new Error(`KMS connection failed: ${status.error}`);
    }
    
    if (status.keyStatus !== 'active') {
      throw new Error(`KMS key is not active: ${status.keyStatus}`);
    }
    
    // Initialize encryption with derived DEK
    await this.encryption.deriveDEK();
    
    console.log('🔐 KMS initialized successfully');
  }
}

// Singleton KMS client
let kmsClient: KMSClient | null = null;

export function getKMSClient(): KMSClient {
  if (!kmsClient) {
    const keyId = process.env.KMS_KEY_ID || 'default-key';
    kmsClient = new KMSClient(keyId);
  }
  return kmsClient;
}

export async function initializeKMS(): Promise<void> {
  const kms = getKMSClient();
  await kms.initialize();
}
