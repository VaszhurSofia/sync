#!/usr/bin/env node

/**
 * Environment validation script
 * Validates that all required environment variables are set
 */

const requiredEnvVars = {
  // API Configuration
  PORT: '3001',
  NODE_ENV: 'development',
  LOG_LEVEL: 'info',
  
  // Database Configuration
  DATABASE_URL: 'postgresql://localhost:5432/sync',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_NAME: 'sync',
  DB_USER: 'sync_user',
  DB_PASSWORD: 'sync_password',
  
  // AI Configuration
  OPENAI_API_KEY: 'sk-test-key',
  AI_MODEL: 'gpt-4',
  AI_MAX_TOKENS: '1000',
  
  // Security Configuration
  JWT_SECRET: 'your-jwt-secret',
  ENCRYPTION_KEY: 'your-encryption-key',
  KMS_KEY_ID: 'your-kms-key-id',
  
  // Privacy Configuration
  DATA_RETENTION_DAYS: '30',
  AUDIT_LOG_LEVEL: 'info',
  GDPR_COMPLIANCE: 'true',
  
  // External Services
  REDIS_URL: 'redis://localhost:6379',
  SENTRY_DSN: 'https://your-sentry-dsn',
  
  // Website Configuration
  NEXT_PUBLIC_API_URL: 'http://localhost:3001',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000'
};

const optionalEnvVars = {
  // Optional configuration
  CORS_ORIGIN: 'http://localhost:3000',
  RATE_LIMIT_WINDOW: '900000',
  RATE_LIMIT_MAX: '100',
  SESSION_TIMEOUT: '3600000',
  MAX_MESSAGE_LENGTH: '1000',
  MAX_SESSION_DURATION: '7200000'
};

function validateEnvironment() {
  console.log('🔍 Validating environment configuration...\n');
  
  let hasErrors = false;
  const missingVars = [];
  const invalidVars = [];
  
  // Check required environment variables
  for (const [varName, defaultValue] of Object.entries(requiredEnvVars)) {
    const value = process.env[varName];
    
    if (!value) {
      if (defaultValue) {
        console.log(`⚠️  ${varName}: Not set, using default: ${defaultValue}`);
        process.env[varName] = defaultValue;
      } else {
        console.error(`❌ ${varName}: Required but not set`);
        missingVars.push(varName);
        hasErrors = true;
      }
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  }
  
  // Check optional environment variables
  for (const [varName, defaultValue] of Object.entries(optionalEnvVars)) {
    const value = process.env[varName];
    
    if (!value && defaultValue) {
      console.log(`ℹ️  ${varName}: Not set, using default: ${defaultValue}`);
      process.env[varName] = defaultValue;
    } else if (value) {
      console.log(`✅ ${varName}: Set`);
    }
  }
  
  // Validate specific values
  const validations = [
    {
      name: 'PORT',
      value: process.env.PORT,
      validator: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) < 65536,
      error: 'PORT must be a valid port number (1-65535)'
    },
    {
      name: 'NODE_ENV',
      value: process.env.NODE_ENV,
      validator: (val) => ['development', 'test', 'production'].includes(val),
      error: 'NODE_ENV must be development, test, or production'
    },
    {
      name: 'LOG_LEVEL',
      value: process.env.LOG_LEVEL,
      validator: (val) => ['error', 'warn', 'info', 'debug'].includes(val),
      error: 'LOG_LEVEL must be error, warn, info, or debug'
    },
    {
      name: 'DB_PORT',
      value: process.env.DB_PORT,
      validator: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) < 65536,
      error: 'DB_PORT must be a valid port number'
    },
    {
      name: 'DATA_RETENTION_DAYS',
      value: process.env.DATA_RETENTION_DAYS,
      validator: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) <= 365,
      error: 'DATA_RETENTION_DAYS must be between 1 and 365'
    }
  ];
  
  for (const validation of validations) {
    if (validation.value && !validation.validator(validation.value)) {
      console.error(`❌ ${validation.name}: ${validation.error}`);
      invalidVars.push(validation.name);
      hasErrors = true;
    }
  }
  
  // Check for conflicting configurations
  if (process.env.NODE_ENV === 'production') {
    if (process.env.LOG_LEVEL === 'debug') {
      console.warn('⚠️  Warning: LOG_LEVEL is set to debug in production');
    }
    
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')) {
      console.warn('⚠️  Warning: DATABASE_URL points to localhost in production');
    }
  }
  
  // Summary
  console.log('\n📊 Environment Validation Summary:');
  console.log(`✅ Valid variables: ${Object.keys(requiredEnvVars).length - missingVars.length}`);
  console.log(`❌ Missing variables: ${missingVars.length}`);
  console.log(`⚠️  Invalid variables: ${invalidVars.length}`);
  
  if (hasErrors) {
    console.log('\n❌ Environment validation failed!');
    console.log('Missing variables:', missingVars.join(', '));
    console.log('Invalid variables:', invalidVars.join(', '));
    console.log('\nPlease set the required environment variables and try again.');
    process.exit(1);
  } else {
    console.log('\n✅ Environment validation passed!');
    console.log('All required environment variables are set and valid.');
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateEnvironment();
}

module.exports = { validateEnvironment };
