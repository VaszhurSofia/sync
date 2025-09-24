import { FastifyRequest, FastifyReply } from 'fastify';
import { getKMSClient } from '../crypto/kms';
import { getEncryption } from '../crypto/aes-gcm';

interface CryptoHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  kms: 'ok' | 'error';
  dek_age_days: number;
  selftest: 'ok' | 'failed';
  encryptionMethod: string;
  lastChecked: string;
  errors?: string[];
}

export async function getCryptoHealth(): Promise<CryptoHealthStatus> {
  const errors: string[] = [];
  let kmsStatus: 'ok' | 'error' = 'error';
  let dekAgeDays = -1;
  let selfTestStatus: 'ok' | 'failed' = 'failed';

  try {
    // Check KMS connection
    const kms = getKMSClient();
    const kmsConnectionStatus = await kms.checkConnection();
    
    if (kmsConnectionStatus.connected && kmsConnectionStatus.keyStatus === 'active') {
      kmsStatus = 'ok';
    } else {
      kmsStatus = 'error';
      errors.push(`KMS connection failed: ${kmsConnectionStatus.error || 'Unknown error'}`);
    }

    // Get DEK age
    const encryption = getEncryption();
    dekAgeDays = encryption.getDEKAge();
    
    if (dekAgeDays < 0) {
      errors.push('DEK not derived');
    } else if (dekAgeDays > 30) {
      errors.push(`DEK is ${dekAgeDays} days old - consider rotation`);
    }

    // Run self-test
    const selfTestPassed = await encryption.selfTest();
    if (selfTestPassed) {
      selfTestStatus = 'ok';
    } else {
      selfTestStatus = 'failed';
      errors.push('Encryption self-test failed');
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (kmsStatus === 'error' || selfTestStatus === 'failed') {
      status = 'unhealthy';
    } else if (dekAgeDays > 7 || errors.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      kms: kmsStatus,
      dek_age_days: dekAgeDays,
      selftest: selfTestStatus,
      encryptionMethod: 'AES-256-GCM',
      lastChecked: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      kms: 'error',
      dek_age_days: -1,
      selftest: 'failed',
      encryptionMethod: 'Unknown',
      lastChecked: new Date().toISOString(),
      errors: [`Crypto health check failed: ${error.message}`],
    };
  }
}

export async function cryptoHealthHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const healthStatus = await getCryptoHealth();
    
    // Return the exact format requested: {kms:ok, dek_age_days, selftest:ok}
    const response = {
      kms: healthStatus.kms,
      dek_age_days: healthStatus.dek_age_days,
      selftest: healthStatus.selftest
    };
    
    // Return appropriate HTTP status based on health
    const httpStatus = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    reply.code(httpStatus).send(response);
  } catch (error) {
    reply.code(503).send({
      kms: 'error',
      dek_age_days: -1,
      selftest: 'failed'
    });
  }
}
