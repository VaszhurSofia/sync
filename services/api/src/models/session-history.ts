/**
 * Session History Model
 * Manages encrypted session summaries with user consent
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getEncryption } from '../crypto/aes-gcm';

export interface SessionHistoryEntry {
  id: string;
  sessionId: string;
  userId: string;
  summaryText: string; // Encrypted
  summaryTextEnc: string; // Actual encrypted field
  consentGiven: boolean;
  consentDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionHistoryRequest {
  sessionId: string;
  userId: string;
  summaryText: string;
  consentGiven: boolean;
}

export interface UpdateConsentRequest {
  historyId: string;
  userId: string;
  consentGiven: boolean;
}

export class SessionHistoryModel {
  private pool: Pool;
  private encryption: any;

  constructor(pool: Pool) {
    this.pool = pool;
    this.encryption = getEncryption();
  }

  /**
   * Create a new session history entry with encrypted summary
   */
  async create(request: CreateSessionHistoryRequest): Promise<SessionHistoryEntry> {
    const id = uuidv4();
    const now = new Date();
    
    // Encrypt the summary text
    const encryptedSummary = await this.encryption.encryptField(
      'session_history.summary_text',
      request.summaryText
    );

    const query = `
      INSERT INTO session_history (
        id, session_id, user_id, summary_text_enc, consent_given, consent_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      id,
      request.sessionId,
      request.userId,
      encryptedSummary,
      request.consentGiven,
      request.consentGiven ? now : null,
      now,
      now
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];

    return {
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      summaryText: request.summaryText, // Return decrypted for immediate use
      summaryTextEnc: row.summary_text_enc,
      consentGiven: row.consent_given,
      consentDate: row.consent_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Get session history for a user (only consented entries)
   */
  async getByUserId(userId: string, limit: number = 10): Promise<SessionHistoryEntry[]> {
    const query = `
      SELECT 
        id, session_id, user_id, summary_text_enc, consent_given, consent_date, created_at, updated_at
      FROM session_history 
      WHERE user_id = $1 AND consent_given = true
      ORDER BY created_at DESC 
      LIMIT $2
    `;

    const result = await this.pool.query(query, [userId, limit]);
    
    // Decrypt summaries
    const entries = await Promise.all(
      result.rows.map(async (row) => {
        const decryptedSummary = await this.encryption.decryptField(
          'session_history.summary_text',
          row.summary_text_enc
        );

        return {
          id: row.id,
          sessionId: row.session_id,
          userId: row.user_id,
          summaryText: decryptedSummary,
          summaryTextEnc: row.summary_text_enc,
          consentGiven: row.consent_given,
          consentDate: row.consent_date,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      })
    );

    return entries;
  }

  /**
   * Update consent status for a history entry
   */
  async updateConsent(request: UpdateConsentRequest): Promise<SessionHistoryEntry | null> {
    const query = `
      UPDATE session_history 
      SET 
        consent_given = $1,
        consent_date = $2,
        updated_at = $3
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `;

    const now = new Date();
    const values = [
      request.consentGiven,
      request.consentGiven ? now : null,
      now,
      request.historyId,
      request.userId
    ];

    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    // Decrypt summary for return
    const decryptedSummary = await this.encryption.decryptField(
      'session_history.summary_text',
      row.summary_text_enc
    );

    return {
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      summaryText: decryptedSummary,
      summaryTextEnc: row.summary_text_enc,
      consentGiven: row.consent_given,
      consentDate: row.consent_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Delete a history entry (user can only delete their own)
   */
  async delete(historyId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM session_history 
      WHERE id = $1 AND user_id = $2
    `;

    const result = await this.pool.query(query, [historyId, userId]);
    return result.rowCount > 0;
  }

  /**
   * Get pending consent requests for a user
   */
  async getPendingConsent(userId: string): Promise<SessionHistoryEntry[]> {
    const query = `
      SELECT 
        id, session_id, user_id, summary_text_enc, consent_given, consent_date, created_at, updated_at
      FROM session_history 
      WHERE user_id = $1 AND consent_given = false
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [userId]);
    
    // Decrypt summaries
    const entries = await Promise.all(
      result.rows.map(async (row) => {
        const decryptedSummary = await this.encryption.decryptField(
          'session_history.summary_text',
          row.summary_text_enc
        );

        return {
          id: row.id,
          sessionId: row.session_id,
          userId: row.user_id,
          summaryText: decryptedSummary,
          summaryTextEnc: row.summary_text_enc,
          consentGiven: row.consent_given,
          consentDate: row.consent_date,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      })
    );

    return entries;
  }
}
