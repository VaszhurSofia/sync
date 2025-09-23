import { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';

interface StagingProtectionConfig {
  enabled: boolean;
  basicAuth: {
    username: string;
    password: string;
  };
  robotsTxt: string;
  stagingBanner: string;
}

const STAGING_CONFIG: StagingProtectionConfig = {
  enabled: process.env.STAGING === 'true',
  basicAuth: {
    username: process.env.STAGING_USERNAME || 'admin',
    password: process.env.STAGING_PASSWORD || 'staging123'
  },
  robotsTxt: `User-agent: *
Disallow: /

# Staging environment - not for public access
# This is a development/testing environment
# All data may be reset at any time`,
  stagingBanner: '🚧 STAGING ENVIRONMENT - NOT FOR PRODUCTION USE 🚧'
};

/**
 * Basic Auth middleware for staging protection
 */
export function createStagingAuthMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!STAGING_CONFIG.enabled) {
      return; // Skip staging protection in production
    }

    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      reply.code(401).send({
        error: 'Staging Authentication Required',
        message: 'This is a staging environment. Please provide basic authentication credentials.',
        realm: 'Staging Environment',
        banner: STAGING_CONFIG.stagingBanner
      });
      reply.header('WWW-Authenticate', 'Basic realm="Staging Environment"');
      reply.header('X-Staging-Banner', STAGING_CONFIG.stagingBanner);
      return false;
    }

    try {
      const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf8');
      const [username, password] = credentials.split(':');
      
      if (username !== STAGING_CONFIG.basicAuth.username || 
          password !== STAGING_CONFIG.basicAuth.password) {
        reply.code(401).send({
          error: 'Invalid Staging Credentials',
          message: 'The provided credentials are not valid for this staging environment.',
          banner: STAGING_CONFIG.stagingBanner
        });
        reply.header('X-Staging-Banner', STAGING_CONFIG.stagingBanner);
        return false;
      }
    } catch (error) {
      reply.code(401).send({
        error: 'Invalid Authorization Header',
        message: 'The authorization header format is invalid.',
        banner: STAGING_CONFIG.stagingBanner
      });
      reply.header('X-Staging-Banner', STAGING_CONFIG.stagingBanner);
      return false;
    }

    return true; // Allow request to proceed
  };
}

/**
 * Add staging headers to all responses
 */
export function addStagingHeaders(request: FastifyRequest, reply: FastifyReply) {
  if (!STAGING_CONFIG.enabled) {
    return;
  }

  // Add no-index meta tag equivalent in headers
  reply.header('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
  
  // Add staging environment indicator
  reply.header('X-Environment', 'staging');
  reply.header('X-Staging-Auth', 'required');
  reply.header('X-Staging-Banner', STAGING_CONFIG.stagingBanner);
  
  // Add staging warning to response body
  const originalSend = reply.send;
  reply.send = function(payload) {
    if (typeof payload === 'object' && payload !== null) {
      payload._staging_warning = STAGING_CONFIG.stagingBanner;
      payload._staging_notice = 'This is a staging environment. Data may be reset at any time.';
    }
    return originalSend.call(this, payload);
  };
}

/**
 * Serve robots.txt for staging
 */
export function createRobotsTxtHandler() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!STAGING_CONFIG.enabled) {
      reply.code(404).send({ error: 'Not found' });
      return;
    }

    reply.type('text/plain');
    reply.header('X-Staging-Banner', STAGING_CONFIG.stagingBanner);
    reply.send(STAGING_CONFIG.robotsTxt);
  };
}

/**
 * Staging health check endpoint
 */
export function createStagingHealthHandler() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const baseHealth = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: STAGING_CONFIG.enabled ? 'staging' : 'production',
      features: ['M1', 'M2', 'M3', 'M4', 'M5', 'M7', 'Production-Ready'],
      safety: 'enabled',
      survey: 'enabled',
      delete: 'enabled',
      rateLimiting: 'enabled',
      accessibility: 'enabled'
    };

    if (STAGING_CONFIG.enabled) {
      return {
        ...baseHealth,
        staging: {
          enabled: true,
          basicAuth: 'required',
          noIndex: true,
          robotsTxt: 'available',
          banner: STAGING_CONFIG.stagingBanner
        }
      };
    }

    return baseHealth;
  };
}

/**
 * Staging configuration endpoint
 */
export function createStagingConfigHandler() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!STAGING_CONFIG.enabled) {
      reply.code(404).send({ error: 'Not found' });
      return;
    }

    reply.send({
      enabled: STAGING_CONFIG.enabled,
      basicAuth: {
        required: true,
        username: STAGING_CONFIG.basicAuth.username
      },
      robotsTxt: {
        available: true,
        content: STAGING_CONFIG.robotsTxt
      },
      banner: STAGING_CONFIG.stagingBanner,
      warnings: [
        'This is a staging environment',
        'Data may be reset at any time',
        'Not suitable for production use',
        'Basic authentication required'
      ]
    });
  };
}

/**
 * Validate staging environment setup
 */
export function validateStagingSetup(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (STAGING_CONFIG.enabled) {
    if (!process.env.STAGING_USERNAME || !process.env.STAGING_PASSWORD) {
      issues.push('STAGING_USERNAME and STAGING_PASSWORD should be set in staging environment');
    }

    if (STAGING_CONFIG.basicAuth.username === 'admin' && STAGING_CONFIG.basicAuth.password === 'staging123') {
      issues.push('Default staging credentials are being used - change them for security');
    }

    if (!process.env.STAGING) {
      issues.push('STAGING environment variable should be explicitly set to "true"');
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Get staging configuration
 */
export function getStagingConfig() {
  return {
    enabled: STAGING_CONFIG.enabled,
    basicAuth: {
      required: STAGING_CONFIG.enabled,
      username: STAGING_CONFIG.basicAuth.username
    },
    robotsTxt: {
      available: STAGING_CONFIG.enabled,
      content: STAGING_CONFIG.robotsTxt
    },
    banner: STAGING_CONFIG.stagingBanner,
    noIndex: STAGING_CONFIG.enabled
  };
}
