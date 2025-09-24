/**
 * Staging Gates Test
 * Tests basic auth, robots.txt, and noindex headers
 */

import { NextRequest } from 'next/server';
import { middleware } from '../src/middleware';

describe('Staging Gates', () => {
  const originalEnv = process.env.STAGING;
  const originalUsername = process.env.STAGING_USERNAME;
  const originalPassword = process.env.STAGING_PASSWORD;

  beforeEach(() => {
    // Reset environment
    delete process.env.STAGING;
    delete process.env.STAGING_USERNAME;
    delete process.env.STAGING_PASSWORD;
  });

  afterEach(() => {
    // Restore environment
    if (originalEnv !== undefined) process.env.STAGING = originalEnv;
    if (originalUsername !== undefined) process.env.STAGING_USERNAME = originalUsername;
    if (originalPassword !== undefined) process.env.STAGING_PASSWORD = originalPassword;
  });

  describe('Basic Authentication', () => {
    it('should allow access when not in staging mode', async () => {
      process.env.STAGING = 'false';
      
      const request = new NextRequest('http://localhost:3000/');
      const response = await middleware(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Robots-Tag')).toBeNull();
    });

    it('should require authentication when in staging mode', async () => {
      process.env.STAGING = 'true';
      
      const request = new NextRequest('http://localhost:3000/');
      const response = await middleware(request);
      
      expect(response.status).toBe(401);
      expect(response.headers.get('WWW-Authenticate')).toBe('Basic realm="Staging Environment"');
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex,nofollow');
    });

    it('should accept valid credentials', async () => {
      process.env.STAGING = 'true';
      process.env.STAGING_USERNAME = 'admin';
      process.env.STAGING_PASSWORD = 'staging123';
      
      const credentials = Buffer.from('admin:staging123').toString('base64');
      const request = new NextRequest('http://localhost:3000/', {
        headers: {
          'authorization': `Basic ${credentials}`
        }
      });
      
      const response = await middleware(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex,nofollow');
      expect(response.headers.get('X-Staging-Environment')).toBe('true');
    });

    it('should reject invalid credentials', async () => {
      process.env.STAGING = 'true';
      process.env.STAGING_USERNAME = 'admin';
      process.env.STAGING_PASSWORD = 'staging123';
      
      const credentials = Buffer.from('admin:wrongpassword').toString('base64');
      const request = new NextRequest('http://localhost:3000/', {
        headers: {
          'authorization': `Basic ${credentials}`
        }
      });
      
      const response = await middleware(request);
      
      expect(response.status).toBe(401);
      expect(response.headers.get('WWW-Authenticate')).toBe('Basic realm="Staging Environment"');
    });

    it('should use default credentials when not set', async () => {
      process.env.STAGING = 'true';
      // No STAGING_USERNAME or STAGING_PASSWORD set
      
      const credentials = Buffer.from('admin:staging123').toString('base64');
      const request = new NextRequest('http://localhost:3000/', {
        headers: {
          'authorization': `Basic ${credentials}`
        }
      });
      
      const response = await middleware(request);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Headers and Metadata', () => {
    it('should add staging headers when authenticated', async () => {
      process.env.STAGING = 'true';
      process.env.STAGING_USERNAME = 'admin';
      process.env.STAGING_PASSWORD = 'staging123';
      
      const credentials = Buffer.from('admin:staging123').toString('base64');
      const request = new NextRequest('http://localhost:3000/', {
        headers: {
          'authorization': `Basic ${credentials}`
        }
      });
      
      const response = await middleware(request);
      
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex,nofollow');
      expect(response.headers.get('X-Staging-Environment')).toBe('true');
    });
  });

  describe('Route Matching', () => {
    it('should match all routes except API and static files', () => {
      const config = require('../src/middleware').config;
      
      expect(config.matcher).toContain('/((?!api|_next/static|_next/image|favicon.ico).*)');
    });
  });
});
