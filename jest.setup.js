// Jest setup file for global test configuration

// Set test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.PORT = '3001';

// Global test utilities
global.testUtils = {
  // Generate random session ID
  generateSessionId: () => `session_${Math.random().toString(36).substr(2, 9)}`,
  
  // Generate random message ID
  generateMessageId: () => `msg_${Math.random().toString(36).substr(2, 9)}`,
  
  // Generate random user ID
  generateUserId: () => `user_${Math.random().toString(36).substr(2, 9)}`,
  
  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock authentication token
  getAuthToken: (userId = 'userA') => `Bearer token_${userId}`,
  
  // Mock session data
  createMockSession: (mode = 'couple') => ({
    sessionId: global.testUtils.generateSessionId(),
    mode,
    turnState: mode === 'couple' ? 'awaitingA' : 'ai_reflect',
    safetyLevel: 'low',
    boundaryFlag: false
  }),
  
  // Mock message data
  createMockMessage: (sender = 'userA', content = 'Test message') => ({
    id: global.testUtils.generateMessageId(),
    sender,
    content,
    createdAt: new Date().toISOString(),
    safetyTags: [],
    safetyLevel: 'low',
    flagged: false
  })
};

// Mock external dependencies
jest.mock('@sync/ai/src/orchestrator', () => ({
  aiOrchestrator: {
    generateResponse: jest.fn().mockResolvedValue({
      content: 'Mock AI response',
      metadata: {
        prompt_version: 'couple_v2.0',
        validation_status: 'valid',
        latency_ms: 100,
        tokens_used: 50,
        safety_tags: []
      }
    })
  }
}));

// Mock long-polling manager
jest.mock('../../services/api/src/lib/longpoll', () => ({
  longPollManager: {
    subscribe: jest.fn(),
    addMessage: jest.fn(),
    removeClient: jest.fn(),
    clearSessionMessages: jest.fn()
  }
}));

// Mock safety and privacy utilities
jest.mock('../../services/api/src/lib/safety-privacy', () => ({
  classifyContent: jest.fn().mockReturnValue({
    level: 'low',
    categories: [],
    confidence: 0.5,
    action: 'allow'
  }),
  recordAuditLog: jest.fn(),
  getPrivacySettings: jest.fn().mockReturnValue({
    dataRetention: 30,
    encryptionLevel: 'enhanced',
    auditLogging: true,
    gdprCompliance: true,
    dataAnonymization: true
  }),
  updatePrivacySettings: jest.fn(),
  requestDataExport: jest.fn().mockReturnValue({
    exportId: 'export_123',
    downloadUrl: '/privacy/download/export_123',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }),
  deleteUserData: jest.fn().mockReturnValue({
    status: 'success',
    message: 'User data deletion initiated.'
  }),
  getBoundaryResources: jest.fn().mockReturnValue({
    region: 'EU',
    safetyLevel: 'enhanced',
    resources: [
      { name: 'Crisis Helpline EU', phone: '+800-123-4567', available: '24/7' },
      { name: 'Couples Therapy EU', phone: '+800-987-6543', available: 'Mon-Fri 9-17' },
      { name: 'Emergency Services', phone: '112', available: '24/7' }
    ]
  }),
  getCryptoHealth: jest.fn().mockReturnValue({
    kms: 'ok',
    dek_age_days: 7,
    encryption_level: 'enhanced'
  })
}));

// Setup and teardown for each test
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
