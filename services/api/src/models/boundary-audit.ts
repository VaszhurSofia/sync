/**
 * Boundary Audit Model
 * Handles boundary lock enforcement and audit logging
 */

import { Pool } from 'pg';
import { logger } from '../logger';

export interface BoundaryAuditEntry {
  id: string;
  sessionId: string;
  userId: string;
  boundaryType: 'safety' | 'content' | 'behavioral';
  triggerReason: string;
  action: 'boundary_lock' | 'boundary_warn' | 'boundary_clear';
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface CreateBoundaryAuditData {
  sessionId: string;
  userId: string;
  boundaryType: 'safety' | 'content' | 'behavioral';
  triggerReason: string;
  action: 'boundary_lock' | 'boundary_warn' | 'boundary_clear';
  riskLevel?: 'low' | 'medium' | 'high';
  concerns?: string[];
  metadata?: Record<string, any>;
}

export class BoundaryAuditModel {
  constructor(private db: Pool) {}

  /**
   * Create boundary audit entry
   */
  async create(data: CreateBoundaryAuditData): Promise<BoundaryAuditEntry> {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const query = `
      INSERT INTO boundary_audit (
        id, session_id, user_id, boundary_type, trigger_reason, 
        action, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      auditId,
      data.sessionId,
      data.userId,
      data.boundaryType,
      data.triggerReason,
      data.action,
      JSON.stringify(data.metadata || {}),
      new Date()
    ];
    
    try {
      const result = await this.db.query(query, values);
      const auditEntry = this.mapRowToAuditEntry(result.rows[0]);
      
      logger.info('Boundary audit entry created', {
        auditId: auditEntry.id,
        sessionId: auditEntry.sessionId,
        boundaryType: auditEntry.boundaryType,
        action: auditEntry.action
      });
      
      return auditEntry;
    } catch (error) {
      logger.error('Failed to create boundary audit entry', {
        error: error instanceof Error ? error.message : "Unknown error",
        data
      });
      throw error;
    }
  }

  /**
   * Get boundary audit entries for a session
   */
  async getBySessionId(sessionId: string, limit: number = 50): Promise<BoundaryAuditEntry[]> {
    const query = `
      SELECT * FROM boundary_audit 
      WHERE session_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    
    try {
      const result = await this.db.query(query, [sessionId, limit]);
      return result.rows.map(row => this.mapRowToAuditEntry(row));
    } catch (error) {
      logger.error('Failed to get boundary audit entries', {
        error: error instanceof Error ? error.message : "Unknown error",
        sessionId
      });
      throw error;
    }
  }

  /**
   * Get boundary audit entries for a user
   */
  async getByUserId(userId: string, limit: number = 50): Promise<BoundaryAuditEntry[]> {
    const query = `
      SELECT * FROM boundary_audit 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    
    try {
      const result = await this.db.query(query, [userId, limit]);
      return result.rows.map(row => this.mapRowToAuditEntry(row));
    } catch (error) {
      logger.error('Failed to get boundary audit entries for user', {
        error: error instanceof Error ? error.message : "Unknown error",
        userId
      });
      throw error;
    }
  }

  /**
   * Check if session has active boundary lock
   */
  async hasActiveBoundaryLock(sessionId: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM boundary_audit 
      WHERE session_id = $1 
        AND action = 'boundary_lock'
        AND created_at > NOW() - INTERVAL '24 hours'
    `;
    
    try {
      const result = await this.db.query(query, [sessionId]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Failed to check boundary lock status', {
        error: error instanceof Error ? error.message : "Unknown error",
        sessionId
      });
      return false;
    }
  }

  /**
   * Get boundary statistics
   */
  async getBoundaryStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalBoundaries: number;
    byType: Record<string, number>;
    byAction: Record<string, number>;
    recentTrend: Array<{ date: string; count: number }>;
  }> {
    const intervalMap = {
      hour: '1 hour',
      day: '1 day',
      week: '7 days'
    };
    
    const query = `
      SELECT 
        COUNT(*) as total,
        boundary_type,
        action,
        DATE_TRUNC('hour', created_at) as hour
      FROM boundary_audit 
      WHERE created_at > NOW() - INTERVAL '${intervalMap[timeframe]}'
      GROUP BY boundary_type, action, hour
      ORDER BY hour DESC
    `;
    
    try {
      const result = await this.db.query(query);
      
      const stats = {
        totalBoundaries: 0,
        byType: {} as Record<string, number>,
        byAction: {} as Record<string, number>,
        recentTrend: [] as Array<{ date: string; count: number }>
      };
      
      result.rows.forEach(row => {
        stats.totalBoundaries += parseInt(row.total);
        stats.byType[row.boundary_type] = (stats.byType[row.boundary_type] || 0) + parseInt(row.total);
        stats.byAction[row.action] = (stats.byAction[row.action] || 0) + parseInt(row.total);
        
        const hour = row.hour.toISOString();
        const existingTrend = stats.recentTrend.find(t => t.date === hour);
        if (existingTrend) {
          existingTrend.count += parseInt(row.total);
        } else {
          stats.recentTrend.push({ date: hour, count: parseInt(row.total) });
        }
      });
      
      return stats;
    } catch (error) {
      logger.error('Failed to get boundary statistics', {
        error: error instanceof Error ? error.message : "Unknown error",
        timeframe
      });
      throw error;
    }
  }

  /**
   * Map database row to audit entry
   */
  private mapRowToAuditEntry(row: any): BoundaryAuditEntry {
    return {
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      boundaryType: row.boundary_type,
      triggerReason: row.trigger_reason,
      action: row.action,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at
    };
  }
}
