import { Pool, PoolClient } from 'pg';
import { encrypt, decrypt, EncryptedData } from './crypto';

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export { pool };

/**
 * Execute a query with automatic connection management
 */
export async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Set the current user context for RLS
 */
export async function setUserContext(client: PoolClient, userId: string): Promise<void> {
  await client.query('SET app.current_user_id = $1', [userId]);
}

/**
 * Database models with encryption support
 */
export class UserModel {
  static async create(email: string, displayName: string): Promise<any> {
    const displayNameEnc = encrypt(displayName);
    const result = await query(
      'INSERT INTO users (email, display_name_enc) VALUES ($1, $2) RETURNING *',
      [email, JSON.stringify(displayNameEnc)]
    );
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<any> {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async findById(id: string): Promise<any> {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async getDisplayName(user: any): Promise<string> {
    if (!user || !user.display_name_enc) return '';
    const encryptedData = JSON.parse(user.display_name_enc) as EncryptedData;
    return decrypt(encryptedData);
  }
}

export class CoupleModel {
  static async create(): Promise<any> {
    const result = await query('INSERT INTO couples DEFAULT VALUES RETURNING *');
    return result.rows[0];
  }

  static async findById(id: string): Promise<any> {
    const result = await query('SELECT * FROM couples WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async getMembers(coupleId: string): Promise<any[]> {
    const result = await query(
      'SELECT u.*, cm.role FROM users u JOIN couple_members cm ON u.id = cm.user_id WHERE cm.couple_id = $1',
      [coupleId]
    );
    return result.rows;
  }
}

export class CoupleMemberModel {
  static async addMember(coupleId: string, userId: string, role: 'userA' | 'userB'): Promise<void> {
    await query(
      'INSERT INTO couple_members (couple_id, user_id, role) VALUES ($1, $2, $3)',
      [coupleId, userId, role]
    );
  }

  static async findByUser(userId: string): Promise<any> {
    const result = await query(
      'SELECT cm.*, c.* FROM couple_members cm JOIN couples c ON cm.couple_id = c.id WHERE cm.user_id = $1',
      [userId]
    );
    return result.rows[0];
  }

  static async getRole(userId: string, coupleId: string): Promise<string | null> {
    const result = await query(
      'SELECT role FROM couple_members WHERE user_id = $1 AND couple_id = $2',
      [userId, coupleId]
    );
    return result.rows[0]?.role || null;
  }
}

export class InviteModel {
  static async create(coupleId: string, code: string, expiresAt: Date): Promise<any> {
    const result = await query(
      'INSERT INTO invites (code, couple_id, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [code, coupleId, expiresAt]
    );
    return result.rows[0];
  }

  static async findByCode(code: string): Promise<any> {
    const result = await query('SELECT * FROM invites WHERE code = $1', [code]);
    return result.rows[0];
  }

  static async acceptInvite(code: string, userId: string): Promise<any> {
    return await transaction(async (client) => {
      // Get the invite
      const inviteResult = await client.query('SELECT * FROM invites WHERE code = $1', [code]);
      const invite = inviteResult.rows[0];
      
      if (!invite) {
        throw new Error('Invite not found');
      }
      
      if (invite.expires_at < new Date()) {
        throw new Error('Invite has expired');
      }
      
      if (invite.accepted_by) {
        throw new Error('Invite has already been accepted');
      }
      
      // Check if couple already has 2 members
      const memberCountResult = await client.query(
        'SELECT COUNT(*) FROM couple_members WHERE couple_id = $1',
        [invite.couple_id]
      );
      
      if (parseInt(memberCountResult.rows[0].count) >= 2) {
        throw new Error('Couple is already full');
      }
      
      // Determine role (userA or userB)
      const existingMembersResult = await client.query(
        'SELECT role FROM couple_members WHERE couple_id = $1',
        [invite.couple_id]
      );
      
      const existingRoles = existingMembersResult.rows.map(row => row.role);
      const role = existingRoles.includes('userA') ? 'userB' : 'userA';
      
      // Add user to couple
      await client.query(
        'INSERT INTO couple_members (couple_id, user_id, role) VALUES ($1, $2, $3)',
        [invite.couple_id, userId, role]
      );
      
      // Mark invite as accepted
      await client.query(
        'UPDATE invites SET accepted_by = $1 WHERE code = $2',
        [userId, code]
      );
      
      return { coupleId: invite.couple_id, role };
    });
  }
}

// Verification code storage (in-memory for MVP, should be Redis in production)
const verificationCodes = new Map<string, { code: string; expiresAt: Date }>();

export class VerificationCodeModel {
  static async create(email: string, code: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    verificationCodes.set(email, { code, expiresAt });
  }

  static async verify(email: string, code: string): Promise<boolean> {
    const stored = verificationCodes.get(email);
    if (!stored) return false;
    
    if (stored.expiresAt < new Date()) {
      verificationCodes.delete(email);
      return false;
    }
    
    if (stored.code !== code) return false;
    
    verificationCodes.delete(email);
    return true;
  }
}
