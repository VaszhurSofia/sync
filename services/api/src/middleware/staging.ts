import { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';

interface StagingConfig {
  enabled: boolean;
  basicAuth: {
    username: string;
    password: string;
  };
  noIndex: boolean;
  robotsTxt: string;
}

const STAGING_CONFIG: StagingConfig = {
  enabled: process.env.STAGING === 'true',
  basicAuth: {
    username: process.env.STAGING_USERNAME || 'admin',
    password: process.env.STAGING_PASSWORD || 'staging123'
  },
  noIndex: true,
  robotsTxt: `User-agent: *
Disallow: /

# Staging environment - not for public access`
};

/**
 * Basic Auth middleware for staging environment
 */
export function createStagingAuthMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!STAGING_CONFIG.enabled) {
      return; // Skip staging controls in production
    }

    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      reply.code(401).send({
        error: 'Staging Authentication Required',
        message: 'This is a staging environment. Please provide basic authentication credentials.',
        realm: 'Staging Environment'
      });
      reply.header('WWW-Authenticate', 'Basic realm="Staging Environment"');
      return false;
    }

    try {
      const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf8');
      const [username, password] = credentials.split(':');
      
      if (username !== STAGING_CONFIG.basicAuth.username || 
          password !== STAGING_CONFIG.basicAuth.password) {
        reply.code(401).send({
          error: 'Invalid Staging Credentials',
          message: 'The provided credentials are not valid for this staging environment.'
        });
        return false;
      }
    } catch (error) {
      reply.code(401).send({
        error: 'Invalid Authorization Header',
        message: 'The authorization header format is invalid.'
      });
      return false;
    }

    return true; // Allow request to proceed
  };
}

/**
 * Add staging headers to responses
 */
export function addStagingHeaders(request: FastifyRequest, reply: FastifyReply) {
  if (!STAGING_CONFIG.enabled) {
    return;
  }

  // Add no-index meta tag equivalent in headers
  if (STAGING_CONFIG.noIndex) {
    reply.header('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
  }

  // Add staging environment indicator
  reply.header('X-Environment', 'staging');
  reply.header('X-Staging-Auth', 'required');
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

    reply.type('text/plain').send(STAGING_CONFIG.robotsTxt);
  };
}

/**
 * Health check that includes staging status
 */
export function createStagingHealthHandler() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const baseHealth = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: STAGING_CONFIG.enabled ? 'staging' : 'production',
      features: ['M1', 'M2', 'M3', 'M4', 'M5', 'M7'],
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
          noIndex: STAGING_CONFIG.noIndex,
          robotsTxt: 'available'
        }
      };
    }

    return baseHealth;
  };
}

/**
 * Middleware to add staging warnings to API responses
 */
export function addStagingWarnings(request: FastifyRequest, reply: FastifyReply) {
  if (!STAGING_CONFIG.enabled) {
    return;
  }

  // Add staging warning to all responses
  const originalSend = reply.send;
  reply.send = function(payload) {
    if (typeof payload === 'object' && payload !== null) {
      payload._staging_warning = 'This is a staging environment. Data may be reset at any time.';
    }
    return originalSend.call(this, payload);
  };
}

/**
 * Get staging configuration (for admin/debugging)
 */
export function getStagingConfig() {
  return {
    enabled: STAGING_CONFIG.enabled,
    noIndex: STAGING_CONFIG.noIndex,
    hasBasicAuth: !!STAGING_CONFIG.basicAuth.username,
    robotsTxtAvailable: true
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
