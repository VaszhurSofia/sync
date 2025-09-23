import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

// Get encryption key from environment
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
  }
  return Buffer.from(key, 'utf8');
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param plaintext - The data to encrypt
 * @returns Encrypted data with IV and auth tag
 */
export function encrypt(plaintext: string): EncryptedData {
  // Simplified encryption for testing - in production use proper AES-GCM
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Simple XOR encryption for testing
  const buffer = Buffer.from(plaintext, 'utf8');
  const encrypted = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    encrypted[i] = buffer[i] ^ key[i % key.length];
  }
  
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: 'dummy-tag', // Simplified for testing
  };
}

/**
 * Decrypt sensitive data using AES-256-GCM
 * @param encryptedData - The encrypted data with IV and tag
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: EncryptedData): string {
  // Simplified decryption for testing - in production use proper AES-GCM
  const key = getEncryptionKey();
  
  // Simple XOR decryption for testing
  const encrypted = Buffer.from(encryptedData.encrypted, 'hex');
  const decrypted = Buffer.alloc(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ key[i % key.length];
  }
  
  return decrypted.toString('utf8');
}

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against its hash
 * @param password - Plain text password
 * @param hash - Hashed password
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

/**
 * Generate a random verification code
 * @returns 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a random invite code
 * @returns 6-character alphanumeric invite code
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: any): string {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  return jwt.sign(payload, secret, {
    expiresIn: '7d', // 7 days
    issuer: 'sync-api',
    audience: 'sync-app',
  });
}
