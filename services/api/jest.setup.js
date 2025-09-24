// Jest setup file
// This file is run before each test file

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.STAGING = 'false';
process.env.STAGING_AUTH = 'admin:password';
process.env.DEK_AGE_THRESHOLD_DAYS = '90';
process.env.ALERT_WEBHOOK_URL = 'https://test-webhook.com';
process.env.ALERT_COOLDOWN_HOURS = '24';
process.env.DEK_CHECK_INTERVAL_MINUTES = '60';
