import { FastifyInstance } from 'fastify';
import { getCryptoHealth, cryptoHealthHandler } from '../health/crypto';

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0'
    };
  });

  // Crypto health check
  fastify.get('/health/crypto', cryptoHealthHandler);

  // Detailed health check
  fastify.get('/health/detailed', async (request, reply) => {
    const cryptoHealth = await getCryptoHealth();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      crypto: cryptoHealth,
      features: {
        encryption: cryptoHealth.status === 'healthy',
        kms: cryptoHealth.kms === 'ok',
        selfTest: cryptoHealth.selftest === 'ok'
      }
    };
  });
}
