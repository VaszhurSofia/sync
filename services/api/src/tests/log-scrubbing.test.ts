import { scrubForLogging, safeLog, createSecureLogger, validateLogScrubbing } from '../middleware/log-scrubbing';

describe('Log Scrubbing', () => {
  let originalConsoleLog: any;
  let consoleLogCalls: any[] = [];

  beforeEach(() => {
    // Capture console.log calls
    originalConsoleLog = console.log;
    consoleLogCalls = [];
    console.log = (...args: any[]) => {
      consoleLogCalls.push(args);
      originalConsoleLog(...args);
    };
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('scrubForLogging', () => {
    it('should redact forbidden keys', () => {
      const obj = {
        id: '123',
        content: 'sensitive message content',
        email: 'user@example.com',
        password: 'secret123',
        status: 'active'
      };

      const scrubbed = scrubForLogging(obj);

      expect(scrubbed.id).toBe('123');
      expect(scrubbed.content).toBe('[REDACTED]');
      expect(scrubbed.email).toBe('[REDACTED]');
      expect(scrubbed.password).toBe('[REDACTED]');
      expect(scrubbed.status).toBe('active');
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          id: '123',
          email: 'user@example.com',
          profile: {
            displayName: 'John Doe',
            preferences: {
              theme: 'dark'
            }
          }
        },
        message: {
          content: 'sensitive content',
          timestamp: '2024-01-01T00:00:00Z'
        }
      };

      const scrubbed = scrubForLogging(obj);

      expect(scrubbed.user.id).toBe('123');
      expect(scrubbed.user.email).toBe('[REDACTED]');
      expect(scrubbed.user.profile.displayName).toBe('[REDACTED]');
      expect(scrubbed.user.profile.preferences.theme).toBe('[REDACTED]');
      expect(scrubbed.message.content).toBe('[REDACTED]');
      expect(scrubbed.message.timestamp).toBe('2024-01-01T00:00:00Z');
    });

    it('should handle arrays', () => {
      const obj = {
        messages: [
          { id: '1', content: 'sensitive content 1' },
          { id: '2', content: 'sensitive content 2' }
        ],
        users: [
          { id: '1', email: 'user1@example.com' },
          { id: '2', email: 'user2@example.com' }
        ]
      };

      const scrubbed = scrubForLogging(obj);

      expect(scrubbed.messages[0].id).toBe('1');
      expect(scrubbed.messages[0].content).toBe('[REDACTED]');
      expect(scrubbed.messages[1].id).toBe('2');
      expect(scrubbed.messages[1].content).toBe('[REDACTED]');
      expect(scrubbed.users[0].id).toBe('1');
      expect(scrubbed.users[0].email).toBe('[REDACTED]');
    });

    it('should handle strings with sensitive patterns', () => {
      const sensitiveString = 'This message contains sensitive content';
      const scrubbed = scrubForLogging(sensitiveString);
      expect(scrubbed).toBe('[REDACTED]');
    });

    it('should allow safe strings', () => {
      const safeString = 'This is a safe message';
      const scrubbed = scrubForLogging(safeString);
      expect(scrubbed).toBe('This is a safe message');
    });

    it('should limit recursion depth', () => {
      const deepObj: any = { level: 0 };
      let current = deepObj;
      for (let i = 1; i < 10; i++) {
        current.next = { level: i };
        current = current.next;
      }

      const scrubbed = scrubForLogging(deepObj);
      expect(scrubbed).toBeDefined();
    });
  });

  describe('safeLog', () => {
    it('should scrub sensitive data when logging', () => {
      const sensitiveData = {
        id: '123',
        content: 'sensitive message',
        email: 'user@example.com'
      };

      safeLog('info', 'Test message', sensitiveData);

      expect(consoleLogCalls).toHaveLength(1);
      const loggedData = consoleLogCalls[0][1];
      expect(loggedData.id).toBe('123');
      expect(loggedData.content).toBe('[REDACTED]');
      expect(loggedData.email).toBe('[REDACTED]');
    });

    it('should handle logging without data', () => {
      safeLog('info', 'Test message');

      expect(consoleLogCalls).toHaveLength(1);
      expect(consoleLogCalls[0][0]).toBe('Test message');
      expect(consoleLogCalls[0][1]).toBeUndefined();
    });
  });

  describe('createSecureLogger', () => {
    it('should create logger with context', () => {
      const logger = createSecureLogger('TestContext');
      
      logger.info('Test message', { content: 'sensitive' });

      expect(consoleLogCalls).toHaveLength(1);
      expect(consoleLogCalls[0][0]).toBe('[TestContext] Test message');
      expect(consoleLogCalls[0][1].content).toBe('[REDACTED]');
    });

    it('should handle different log levels', () => {
      const logger = createSecureLogger('TestContext');
      
      logger.warn('Warning message', { email: 'user@example.com' });
      logger.error('Error message', { password: 'secret' });

      expect(consoleLogCalls).toHaveLength(2);
      expect(consoleLogCalls[0][0]).toBe('[TestContext] Warning message');
      expect(consoleLogCalls[1][0]).toBe('[TestContext] Error message');
    });
  });

  describe('validateLogScrubbing', () => {
    it('should validate log scrubbing configuration', () => {
      const validation = validateLogScrubbing();
      
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('issues');
      expect(Array.isArray(validation.issues)).toBe(true);
    });
  });

  describe('Forbidden Keys Detection', () => {
    it('should detect all forbidden keys', () => {
      const forbiddenKeys = [
        'content', 'contentEnc', 'message', 'email', 'password',
        'token', 'accessToken', 'refreshToken', 'apiKey', 'secret',
        'feedback', 'displayName', 'displayNameEnc', 'summaryText', 'summaryTextEnc'
      ];

      forbiddenKeys.forEach(key => {
        const obj = { [key]: 'sensitive data' };
        const scrubbed = scrubForLogging(obj);
        expect(scrubbed[key]).toBe('[REDACTED]');
      });
    });

    it('should allow all allowed keys', () => {
      const allowedKeys = [
        'id', 'sessionId', 'userId', 'coupleId', 'timestamp',
        'createdAt', 'updatedAt', 'status', 'type', 'action',
        'endpoint', 'method', 'statusCode', 'duration', 'userAgent',
        'ip', 'riskLevel', 'concerns', 'violations'
      ];

      allowedKeys.forEach(key => {
        const obj = { [key]: 'safe data' };
        const scrubbed = scrubForLogging(obj);
        expect(scrubbed[key]).toBe('safe data');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined', () => {
      expect(scrubForLogging(null)).toBe(null);
      expect(scrubForLogging(undefined)).toBe(undefined);
    });

    it('should handle empty objects', () => {
      const scrubbed = scrubForLogging({});
      expect(scrubbed).toEqual({});
    });

    it('should handle empty arrays', () => {
      const scrubbed = scrubForLogging([]);
      expect(scrubbed).toEqual([]);
    });

    it('should handle primitive values', () => {
      expect(scrubForLogging(123)).toBe(123);
      expect(scrubForLogging(true)).toBe(true);
      expect(scrubForLogging('safe string')).toBe('safe string');
    });
  });
});
