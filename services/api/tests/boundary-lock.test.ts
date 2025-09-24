/**
 * Boundary Lock and Audit Tests
 * Tests boundary lock enforcement, 409 responses, and audit logging
 */

import { BoundaryAuditModel, CreateBoundaryAuditData } from '../src/models/boundary-audit';
import { SessionModel } from '../src/models/sessions';
import { 
  checkBoundaryLock, 
  createBoundaryLock, 
  clearBoundaryLock, 
  getBoundaryLockStatus 
} from '../src/middleware/boundary-lock';

// Mock database connection
const mockDb = {
  query: jest.fn()
} as any;

describe.skip('Boundary Lock and Audit Tests', () => {
  let boundaryAuditModel: BoundaryAuditModel;
  let sessionModel: SessionModel;

  beforeEach(() => {
    boundaryAuditModel = new BoundaryAuditModel(mockDb);
    sessionModel = new SessionModel(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Boundary Audit Model', () => {
    it('should create boundary audit entry', async () => {
      const auditData: CreateBoundaryAuditData = {
        sessionId: 'session-123',
        userId: 'user-456',
        boundaryType: 'safety',
        triggerReason: 'Self-harm content detected',
        action: 'boundary_lock',
        metadata: { riskLevel: 'high', detectedBy: 'tier1-detector' }
      };

      const mockResult = {
        id: 'audit-123',
        session_id: 'session-123',
        user_id: 'user-456',
        boundary_type: 'safety',
        trigger_reason: 'Self-harm content detected',
        action: 'boundary_lock',
        metadata: JSON.stringify(auditData.metadata),
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockResult] });

      const result = await boundaryAuditModel.create(auditData);

      expect(result.id).toBe('audit-123');
      expect(result.sessionId).toBe('session-123');
      expect(result.boundaryType).toBe('safety');
      expect(result.action).toBe('boundary_lock');
      expect(result.metadata).toEqual(auditData.metadata);
    });

    it('should get boundary audit entries by session', async () => {
      const mockRows = [
        {
          id: 'audit-1',
          session_id: 'session-123',
          user_id: 'user-456',
          boundary_type: 'safety',
          trigger_reason: 'Self-harm content',
          action: 'boundary_lock',
          metadata: '{}',
          created_at: new Date()
        },
        {
          id: 'audit-2',
          session_id: 'session-123',
          user_id: 'user-456',
          boundary_type: 'content',
          trigger_reason: 'Inappropriate language',
          action: 'boundary_warn',
          metadata: '{}',
          created_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await boundaryAuditModel.getBySessionId('session-123');

      expect(result).toHaveLength(2);
      expect(result[0].boundaryType).toBe('safety');
      expect(result[1].boundaryType).toBe('content');
    });

    it('should check for active boundary lock', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await boundaryAuditModel.hasActiveBoundaryLock('session-123');

      expect(result).toBe(true);
    });

    it('should return false for no active boundary lock', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await boundaryAuditModel.hasActiveBoundaryLock('session-123');

      expect(result).toBe(false);
    });

    it('should get boundary statistics', async () => {
      const mockRows = [
        { total: '5', boundary_type: 'safety', action: 'boundary_lock', hour: '2024-01-01T10:00:00Z' },
        { total: '3', boundary_type: 'content', action: 'boundary_warn', hour: '2024-01-01T10:00:00Z' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await boundaryAuditModel.getBoundaryStats('day');

      expect(result.totalBoundaries).toBe(8);
      expect(result.byType.safety).toBe(5);
      expect(result.byType.content).toBe(3);
      expect(result.byAction.boundary_lock).toBe(5);
      expect(result.byAction.boundary_warn).toBe(3);
    });
  });

  describe('Boundary Lock Enforcement', () => {
    it('should detect boundary lock from session flag', async () => {
      const mockSession = {
        id: 'session-123',
        coupleId: 'couple-456',
        startedAt: new Date(),
        turnState: 'boundary',
        boundaryFlag: true,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await checkBoundaryLock(sessionModel, boundaryAuditModel, 'session-123');

      expect(result.isLocked).toBe(true);
      expect(result.lockReason).toBe('Session has reached safety boundary');
      expect(result.lockTimestamp).toBeDefined();
    });

    it('should detect boundary lock from audit entries', async () => {
      const mockSession = {
        id: 'session-123',
        coupleId: 'couple-456',
        startedAt: new Date(),
        turnState: 'awaitingA',
        boundaryFlag: false,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await checkBoundaryLock(sessionModel, boundaryAuditModel, 'session-123');

      expect(result.isLocked).toBe(true);
      expect(result.lockReason).toBe('Active boundary lock detected');
    });

    it('should return no lock when session is clean', async () => {
      const mockSession = {
        id: 'session-123',
        coupleId: 'couple-456',
        startedAt: new Date(),
        turnState: 'awaitingA',
        boundaryFlag: false,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await checkBoundaryLock(sessionModel, boundaryAuditModel, 'session-123');

      expect(result.isLocked).toBe(false);
    });

    it('should handle session not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await checkBoundaryLock(sessionModel, boundaryAuditModel, 'session-123');

      expect(result.isLocked).toBe(false);
    });
  });

  describe('Boundary Lock Creation', () => {
    it('should create boundary lock and set session flag', async () => {
      const mockAuditResult = {
        id: 'audit-123',
        session_id: 'session-123',
        user_id: 'user-456',
        boundary_type: 'safety',
        trigger_reason: 'Self-harm content detected',
        action: 'boundary_lock',
        metadata: '{}',
        created_at: new Date()
      };

      const mockSessionResult = {
        id: 'session-123',
        coupleId: 'couple-456',
        startedAt: new Date(),
        turnState: 'boundary',
        boundaryFlag: true,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockAuditResult] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockSessionResult] });

      await createBoundaryLock(
        boundaryAuditModel,
        sessionModel,
        'session-123',
        'user-456',
        'safety',
        'Self-harm content detected',
        { riskLevel: 'high' }
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO boundary_audit'),
        expect.arrayContaining(['session-123', 'user-456', 'safety', 'boundary_lock'])
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions SET boundary_flag = true'),
        expect.any(Array)
      );
    });

    it('should handle creation errors gracefully', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(createBoundaryLock(
        boundaryAuditModel,
        sessionModel,
        'session-123',
        'user-456',
        'safety',
        'Test reason'
      )).rejects.toThrow('Database error');
    });
  });

  describe('Boundary Lock Clearing', () => {
    it('should clear boundary lock and reset session flag', async () => {
      const mockAuditResult = {
        id: 'audit-123',
        session_id: 'session-123',
        user_id: 'user-456',
        boundary_type: 'safety',
        trigger_reason: 'Manual clearance',
        action: 'boundary_clear',
        metadata: '{}',
        created_at: new Date()
      };

      const mockSessionResult = {
        id: 'session-123',
        coupleId: 'couple-456',
        startedAt: new Date(),
        turnState: 'awaitingA',
        boundaryFlag: false,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockAuditResult] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockSessionResult] });

      await clearBoundaryLock(
        boundaryAuditModel,
        sessionModel,
        'session-123',
        'user-456',
        'Manual clearance by admin'
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO boundary_audit'),
        expect.arrayContaining(['session-123', 'user-456', 'boundary_clear'])
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions SET boundary_flag = false'),
        expect.any(Array)
      );
    });
  });

  describe('Boundary Lock Status', () => {
    it('should get complete boundary lock status', async () => {
      const mockSession = {
        id: 'session-123',
        coupleId: 'couple-456',
        startedAt: new Date(),
        turnState: 'boundary',
        boundaryFlag: true,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockAuditEntries = [
        {
          id: 'audit-1',
          session_id: 'session-123',
          user_id: 'user-456',
          boundary_type: 'safety',
          trigger_reason: 'Self-harm content',
          action: 'boundary_lock',
          metadata: '{}',
          created_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      mockDb.query.mockResolvedValueOnce({ rows: mockAuditEntries });

      const result = await getBoundaryLockStatus(sessionModel, boundaryAuditModel, 'session-123');

      expect(result.isLocked).toBe(true);
      expect(result.lockReason).toBe('Session has reached safety boundary');
      expect(result.lockTimestamp).toBeDefined();
      expect(result.auditEntries).toHaveLength(1);
      expect(result.auditEntries[0].boundaryType).toBe('safety');
    });

    it('should handle session not found in status check', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await getBoundaryLockStatus(sessionModel, boundaryAuditModel, 'session-123');

      expect(result.isLocked).toBe(false);
      expect(result.auditEntries).toEqual([]);
    });
  });

  describe('Red-Team Boundary Lock Tests', () => {
    it('should lock session on self-harm content', async () => {
      const mockAuditResult = {
        id: 'audit-123',
        session_id: 'session-123',
        user_id: 'user-456',
        boundary_type: 'safety',
        trigger_reason: 'Self-harm content detected',
        action: 'boundary_lock',
        metadata: '{}',
        created_at: new Date()
      };

      const mockSessionResult = {
        id: 'session-123',
        coupleId: 'couple-456',
        startedAt: new Date(),
        turnState: 'boundary',
        boundaryFlag: true,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockAuditResult] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockSessionResult] });

      await createBoundaryLock(
        boundaryAuditModel,
        sessionModel,
        'session-123',
        'user-456',
        'safety',
        'Self-harm content detected',
        { content: 'I want to hurt myself', riskLevel: 'high' }
      );

      // Verify lock was created
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO boundary_audit'),
        expect.arrayContaining(['safety', 'boundary_lock'])
      );
    });

    it('should lock session on violent threats', async () => {
      const mockAuditResult = {
        id: 'audit-123',
        session_id: 'session-123',
        user_id: 'user-456',
        boundary_type: 'safety',
        trigger_reason: 'Violent threats detected',
        action: 'boundary_lock',
        metadata: '{}',
        created_at: new Date()
      };

      const mockSessionResult = {
        id: 'session-123',
        coupleId: 'couple-456',
        startedAt: new Date(),
        turnState: 'boundary',
        boundaryFlag: true,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockAuditResult] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockSessionResult] });

      await createBoundaryLock(
        boundaryAuditModel,
        sessionModel,
        'session-123',
        'user-456',
        'safety',
        'Violent threats detected',
        { content: 'I want to hurt you', riskLevel: 'high' }
      );

      // Verify lock was created
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO boundary_audit'),
        expect.arrayContaining(['safety', 'boundary_lock'])
      );
    });

    it('should lock session on abuse patterns', async () => {
      const mockAuditResult = {
        id: 'audit-123',
        session_id: 'session-123',
        user_id: 'user-456',
        boundary_type: 'behavioral',
        trigger_reason: 'Abuse patterns detected',
        action: 'boundary_lock',
        metadata: '{}',
        created_at: new Date()
      };

      const mockSessionResult = {
        id: 'session-123',
        coupleId: 'couple-456',
        startedAt: new Date(),
        turnState: 'boundary',
        boundaryFlag: true,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockAuditResult] });
      mockDb.query.mockResolvedValueOnce({ rows: [mockSessionResult] });

      await createBoundaryLock(
        boundaryAuditModel,
        sessionModel,
        'session-123',
        'user-456',
        'behavioral',
        'Abuse patterns detected',
        { pattern: 'manipulation', frequency: 'high' }
      );

      // Verify lock was created
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO boundary_audit'),
        expect.arrayContaining(['behavioral', 'boundary_lock'])
      );
    });
  });

  describe('Audit Logging Without Content', () => {
    it('should not log sensitive content in audit entries', async () => {
      const auditData: CreateBoundaryAuditData = {
        sessionId: 'session-123',
        userId: 'user-456',
        boundaryType: 'safety',
        triggerReason: 'Self-harm content detected',
        action: 'boundary_lock',
        metadata: { 
          riskLevel: 'high',
          detectedBy: 'tier1-detector',
          // No content fields
          contentLength: 25,
          hasSelfHarm: true
        }
      };

      const mockResult = {
        id: 'audit-123',
        session_id: 'session-123',
        user_id: 'user-456',
        boundary_type: 'safety',
        trigger_reason: 'Self-harm content detected',
        action: 'boundary_lock',
        metadata: JSON.stringify(auditData.metadata),
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockResult] });

      const result = await boundaryAuditModel.create(auditData);

      expect(result.metadata).not.toHaveProperty('content');
      expect(result.metadata).not.toHaveProperty('message');
      expect(result.metadata).not.toHaveProperty('text');
      expect(result.metadata).toHaveProperty('riskLevel');
      expect(result.metadata).toHaveProperty('hasSelfHarm');
    });

    it('should log boundary statistics without content', async () => {
      const mockRows = [
        { total: '5', boundary_type: 'safety', action: 'boundary_lock', hour: '2024-01-01T10:00:00Z' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await boundaryAuditModel.getBoundaryStats('day');

      expect(result.totalBoundaries).toBe(5);
      expect(result.byType.safety).toBe(5);
      expect(result.byAction.boundary_lock).toBe(5);
      
      // Verify no content fields in statistics
      expect(JSON.stringify(result)).not.toContain('content');
      expect(JSON.stringify(result)).not.toContain('message');
      expect(JSON.stringify(result)).not.toContain('text');
    });
  });
});
