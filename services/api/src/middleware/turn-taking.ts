import { FastifyRequest, FastifyReply } from 'fastify';

interface TurnTakingLock {
  sessionId: string;
  currentTurn: string;
  lockedAt: Date;
  expiresAt: Date;
  messageCount: number;
}

// In-memory storage for turn-taking locks (use Redis in production)
const turnLocks = new Map<string, TurnTakingLock>();

const TURN_LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_MESSAGE_COUNT = 100; // Prevent infinite locks

export function createTurnTakingMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: sessionId } = request.params as { id: string };
    const user = (request as any).user;
    
    if (!user || !sessionId) {
      return; // Let other middleware handle auth/session validation
    }

    // Check if there's an active turn lock
    const existingLock = turnLocks.get(sessionId);
    
    if (existingLock) {
      // Check if lock has expired
      if (existingLock.expiresAt < new Date()) {
        turnLocks.delete(sessionId);
      } else {
        // Check if it's the user's turn
        if (existingLock.currentTurn !== user.id) {
          reply.code(409).send({
            error: 'Not your turn',
            message: 'Your partner is currently sharing their thoughts. Please wait for them to finish before responding.',
            currentTurn: existingLock.currentTurn,
            lockedAt: existingLock.lockedAt.toISOString(),
            expiresAt: existingLock.expiresAt.toISOString(),
            waitTime: Math.ceil((existingLock.expiresAt.getTime() - Date.now()) / 1000),
          });
          return false;
        }
        
        // Check message count to prevent infinite locks
        if (existingLock.messageCount >= MAX_MESSAGE_COUNT) {
          reply.code(429).send({
            error: 'Turn limit exceeded',
            message: 'This conversation has reached the maximum number of messages. Please start a new session.',
            messageCount: existingLock.messageCount,
            maxMessages: MAX_MESSAGE_COUNT,
          });
          return false;
        }
      }
    }

    return true; // Allow the request to proceed
  };
}

export function updateTurnLock(sessionId: string, userId: string, partnerId: string): void {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TURN_LOCK_DURATION_MS);
  
  const existingLock = turnLocks.get(sessionId);
  const messageCount = existingLock ? existingLock.messageCount + 1 : 1;
  
  const newLock: TurnTakingLock = {
    sessionId,
    currentTurn: partnerId, // Switch to partner's turn
    lockedAt: now,
    expiresAt,
    messageCount,
  };
  
  turnLocks.set(sessionId, newLock);
  
  // Clean up expired locks periodically
  if (Math.random() < 0.01) { // 1% chance
    cleanupExpiredLocks();
  }
}

export function releaseTurnLock(sessionId: string): void {
  turnLocks.delete(sessionId);
}

export function getTurnLockStatus(sessionId: string): TurnTakingLock | null {
  const lock = turnLocks.get(sessionId);
  if (lock && lock.expiresAt > new Date()) {
    return lock;
  }
  return null;
}

function cleanupExpiredLocks(): void {
  const now = new Date();
  for (const [sessionId, lock] of turnLocks.entries()) {
    if (lock.expiresAt < now) {
      turnLocks.delete(sessionId);
    }
  }
}

// Get all active locks (for debugging/admin)
export function getAllActiveLocks(): TurnTakingLock[] {
  const now = new Date();
  return Array.from(turnLocks.values()).filter(lock => lock.expiresAt > now);
}
