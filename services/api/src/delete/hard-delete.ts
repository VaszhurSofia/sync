/**
 * M5: Hard Delete System
 * Complete data removal for privacy compliance (GDPR, CCPA, etc.)
 */

export interface DeleteRequest {
  id: string;
  userId: string;
  requestedAt: string;
  reason: 'user_request' | 'privacy_compliance' | 'account_closure' | 'data_breach';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completedAt?: string;
  errorMessage?: string;
}

export interface DeleteScope {
  userId: string;
  includeSessions: boolean;
  includeMessages: boolean;
  includeSurveyResponses: boolean;
  includeSafetyViolations: boolean;
  includeAnalytics: boolean;
  includeAuditLogs: boolean;
}

export interface DeleteResult {
  success: boolean;
  deletedRecords: {
    users: number;
    couples: number;
    sessions: number;
    messages: number;
    surveyResponses: number;
    safetyViolations: number;
    analytics: number;
    auditLogs: number;
  };
  errors: string[];
  completedAt: string;
}

export interface DeleteConfig {
  enabled: boolean;
  retentionPeriod: number; // Days to retain data before hard delete
  auditLogging: boolean; // Whether to log delete operations
  confirmationRequired: boolean; // Whether to require confirmation before delete
  gracePeriod: number; // Hours to wait before executing delete
  batchSize: number; // Number of records to delete per batch
  maxRetries: number; // Maximum retry attempts for failed deletes
}

// Default delete configuration
export const DEFAULT_DELETE_CONFIG: DeleteConfig = {
  enabled: true,
  retentionPeriod: 30, // 30 days retention
  auditLogging: true,
  confirmationRequired: true,
  gracePeriod: 24, // 24 hours grace period
  batchSize: 1000, // Delete 1000 records per batch
  maxRetries: 3,
};

/**
 * Validate delete request
 */
export function validateDeleteRequest(request: Partial<DeleteRequest>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!request.userId) {
    errors.push('User ID is required');
  }

  if (!request.reason) {
    errors.push('Delete reason is required');
  } else if (!['user_request', 'privacy_compliance', 'account_closure', 'data_breach'].includes(request.reason)) {
    errors.push('Invalid delete reason');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create delete request
 */
export function createDeleteRequest(
  userId: string,
  reason: DeleteRequest['reason'],
  scope: DeleteScope
): DeleteRequest {
  return {
    id: `delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    requestedAt: new Date().toISOString(),
    reason,
    status: 'pending',
  };
}

/**
 * Calculate delete scope based on user data
 */
export function calculateDeleteScope(
  userId: string,
  userData: {
    hasSessions: boolean;
    hasMessages: boolean;
    hasSurveyResponses: boolean;
    hasSafetyViolations: boolean;
    hasAnalytics: boolean;
  }
): DeleteScope {
  return {
    userId,
    includeSessions: userData.hasSessions,
    includeMessages: userData.hasMessages,
    includeSurveyResponses: userData.hasSurveyResponses,
    includeSafetyViolations: userData.hasSafetyViolations,
    includeAnalytics: userData.hasAnalytics,
    includeAuditLogs: true, // Always include audit logs for compliance
  };
}

/**
 * Execute hard delete operation
 */
export async function executeHardDelete(
  deleteRequest: DeleteRequest,
  scope: DeleteScope,
  dataStores: {
    users: Map<string, any>;
    couples: Map<string, any>;
    sessions: Map<string, any>;
    messages: Map<string, any>;
    surveyResponses: Map<string, any>;
    safetyViolations: Map<string, any>;
    analytics: Map<string, any>;
    auditLogs: Map<string, any>;
  }
): Promise<DeleteResult> {
  const config = getDeleteConfig();
  const result: DeleteResult = {
    success: false,
    deletedRecords: {
      users: 0,
      couples: 0,
      sessions: 0,
      messages: 0,
      surveyResponses: 0,
      safetyViolations: 0,
      analytics: 0,
      auditLogs: 0,
    },
    errors: [],
    completedAt: new Date().toISOString(),
  };

  try {
    // Update delete request status
    deleteRequest.status = 'in_progress';

    // Delete user data in order of dependencies
    if (scope.includeMessages) {
      // Delete messages first (they reference sessions)
      for (const [messageId, message] of dataStores.messages.entries()) {
        if (message.userId === scope.userId || message.sender === scope.userId) {
          dataStores.messages.delete(messageId);
          result.deletedRecords.messages++;
        }
      }
    }

    if (scope.includeSessions) {
      // Delete sessions
      for (const [sessionId, session] of dataStores.sessions.entries()) {
        if (session.userId === scope.userId) {
          dataStores.sessions.delete(sessionId);
          result.deletedRecords.sessions++;
        }
      }
    }

    if (scope.includeSurveyResponses) {
      // Delete survey responses
      for (const [surveyId, survey] of dataStores.surveyResponses.entries()) {
        if (survey.userId === scope.userId) {
          dataStores.surveyResponses.delete(surveyId);
          result.deletedRecords.surveyResponses++;
        }
      }
    }

    if (scope.includeSafetyViolations) {
      // Delete safety violations
      for (const [violationId, violation] of dataStores.safetyViolations.entries()) {
        if (violation.userId === scope.userId) {
          dataStores.safetyViolations.delete(violationId);
          result.deletedRecords.safetyViolations++;
        }
      }
    }

    if (scope.includeAnalytics) {
      // Delete analytics data
      for (const [analyticsId, analytics] of dataStores.analytics.entries()) {
        if (analytics.userId === scope.userId) {
          dataStores.analytics.delete(analyticsId);
          result.deletedRecords.analytics++;
        }
      }
    }

    // Delete couples (remove user from couples)
    for (const [coupleId, couple] of dataStores.couples.entries()) {
      if (couple.members.some((member: any) => member.userId === scope.userId)) {
        // Remove user from couple members
        couple.members = couple.members.filter((member: any) => member.userId !== scope.userId);
        
        // If couple is now empty, delete the couple
        if (couple.members.length === 0) {
          dataStores.couples.delete(coupleId);
          result.deletedRecords.couples++;
        }
      }
    }

    if (scope.includeAuditLogs) {
      // Delete audit logs
      for (const [logId, log] of dataStores.auditLogs.entries()) {
        if (log.userId === scope.userId) {
          dataStores.auditLogs.delete(logId);
          result.deletedRecords.auditLogs++;
        }
      }
    }

    // Finally, delete the user
    if (dataStores.users.has(scope.userId)) {
      dataStores.users.delete(scope.userId);
      result.deletedRecords.users++;
    }

    // Update delete request status
    deleteRequest.status = 'completed';
    deleteRequest.completedAt = new Date().toISOString();

    result.success = true;

    // Log the delete operation if audit logging is enabled
    if (config.auditLogging) {
      const auditLog = {
        id: `audit_${Date.now()}`,
        action: 'hard_delete',
        userId: scope.userId,
        details: {
          deleteRequestId: deleteRequest.id,
          reason: deleteRequest.reason,
          deletedRecords: result.deletedRecords,
        },
        timestamp: new Date().toISOString(),
      };
      dataStores.auditLogs.set(auditLog.id, auditLog);
    }

  } catch (error) {
    result.errors.push(`Delete operation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    deleteRequest.status = 'failed';
    deleteRequest.errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  return result;
}

/**
 * Get delete configuration with environment overrides
 */
export function getDeleteConfig(): DeleteConfig {
  const config = { ...DEFAULT_DELETE_CONFIG };

  // Override with environment variables if available
  if (process.env.DELETE_ENABLED !== undefined) {
    config.enabled = process.env.DELETE_ENABLED === 'true';
  }

  if (process.env.DELETE_RETENTION_PERIOD !== undefined) {
    config.retentionPeriod = parseInt(process.env.DELETE_RETENTION_PERIOD, 10);
  }

  if (process.env.DELETE_AUDIT_LOGGING !== undefined) {
    config.auditLogging = process.env.DELETE_AUDIT_LOGGING === 'true';
  }

  if (process.env.DELETE_CONFIRMATION_REQUIRED !== undefined) {
    config.confirmationRequired = process.env.DELETE_CONFIRMATION_REQUIRED === 'true';
  }

  if (process.env.DELETE_GRACE_PERIOD !== undefined) {
    config.gracePeriod = parseInt(process.env.DELETE_GRACE_PERIOD, 10);
  }

  return config;
}

/**
 * Check if delete is allowed for a user
 */
export function isDeleteAllowed(userId: string, reason: DeleteRequest['reason']): {
  allowed: boolean;
  message?: string;
} {
  const config = getDeleteConfig();

  if (!config.enabled) {
    return {
      allowed: false,
      message: 'Delete functionality is currently disabled',
    };
  }

  // Additional business logic can be added here
  // For example, checking if user has pending transactions, etc.

  return {
    allowed: true,
  };
}

/**
 * Generate delete confirmation
 */
export function generateDeleteConfirmation(
  userId: string,
  scope: DeleteScope,
  estimatedRecords: number
): {
  confirmationId: string;
  message: string;
  warning: string;
  estimatedRecords: number;
  gracePeriod: number;
} {
  const config = getDeleteConfig();
  const confirmationId = `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const message = `You are about to permanently delete all your data from Sync. This action cannot be undone.`;
  
  const warning = `This will delete:
- Your account and profile information
- All chat sessions and messages
- Survey responses and feedback
- Safety violation records
- Analytics data
- Audit logs

Estimated records to be deleted: ${estimatedRecords}`;

  return {
    confirmationId,
    message,
    warning,
    estimatedRecords,
    gracePeriod: config.gracePeriod,
  };
}

/**
 * Request hard delete (stub implementation)
 */
export async function requestHardDelete(
  userId: string,
  reason: DeleteRequest['reason']
): Promise<DeleteRequest> {
  const request = createDeleteRequest(userId, reason, {
    userId,
    includeSessions: true,
    includeMessages: true,
    includeSurveyResponses: true,
    includeSafetyViolations: true,
    includeAnalytics: true,
    includeAuditLogs: true,
  });
  
  // In a real implementation, this would save to database
  console.log('Delete request created:', request);
  return request;
}

/**
 * Confirm hard delete (stub implementation)
 */
export async function confirmHardDelete(
  deleteRequestId: string,
  confirmationId: string
): Promise<DeleteResult> {
  // In a real implementation, this would validate confirmation and execute delete
  console.log('Delete confirmed:', deleteRequestId, confirmationId);
  return {
    success: true,
    deletedRecords: {
      users: 1,
      couples: 0,
      sessions: 0,
      messages: 0,
      surveyResponses: 0,
      safetyViolations: 0,
      analytics: 0,
      auditLogs: 0,
    },
    errors: [],
    completedAt: new Date().toISOString(),
  };
}

/**
 * Get delete request status (stub implementation)
 */
export async function getDeleteRequestStatus(deleteRequestId: string): Promise<DeleteRequest | null> {
  // In a real implementation, this would query the database
  console.log('Getting delete request status:', deleteRequestId);
  return null;
}

/**
 * Get audit logs (stub implementation)
 */
export async function getAuditLogs(userId: string): Promise<any[]> {
  // In a real implementation, this would query the database
  console.log('Getting audit logs for user:', userId);
  return [];
}

/**
 * Initialize delete data (stub implementation)
 */
export async function initializeDeleteData(): Promise<void> {
  // In a real implementation, this would initialize data stores
  console.log('Delete data initialized');
}

/**
 * Clear all data (stub implementation)
 */
export async function clearAllData(): Promise<void> {
  // In a real implementation, this would clear all data stores
  console.log('All data cleared');
}

/**
 * Export delete config
 */
export { DEFAULT_DELETE_CONFIG as deleteConfig };
