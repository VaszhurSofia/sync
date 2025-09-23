import { FastifyRequest, FastifyReply } from 'fastify';

interface LongPollConfig {
  maxWaitMs: number;
  heartbeatIntervalMs: number;
  defaultWaitMs: number;
}

const LONG_POLL_CONFIG: LongPollConfig = {
  maxWaitMs: 30000, // 30 seconds max
  heartbeatIntervalMs: 5000, // 5 second heartbeats
  defaultWaitMs: 25000 // 25 seconds default
};

interface LongPollSession {
  sessionId: string;
  clientId: string;
  startTime: Date;
  lastHeartbeat: Date;
  abortController: AbortController;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

// In-memory storage for long-poll sessions (use Redis in production)
const activePolls = new Map<string, LongPollSession[]>();

export class LongPollingManager {
  /**
   * Start long-polling session
   */
  static async startPoll(
    sessionId: string,
    clientId: string,
    waitMs: number,
    afterTimestamp?: string
  ): Promise<any> {
    // Validate wait time
    const validatedWaitMs = Math.min(waitMs, LONG_POLL_CONFIG.maxWaitMs);
    
    // Create abort controller for client cancellation
    const abortController = new AbortController();
    
    // Create promise for long-poll
    const pollPromise = new Promise((resolve, reject) => {
      const pollSession: LongPollSession = {
        sessionId,
        clientId,
        startTime: new Date(),
        lastHeartbeat: new Date(),
        abortController,
        resolve,
        reject
      };

      // Add to active polls
      if (!activePolls.has(sessionId)) {
        activePolls.set(sessionId, []);
      }
      activePolls.get(sessionId)!.push(pollSession);

      // Set up timeout
      const timeout = setTimeout(() => {
        this.cleanupPoll(sessionId, clientId);
        resolve(null); // Return null on timeout
      }, validatedWaitMs);

      // Set up heartbeat
      const heartbeat = setInterval(() => {
        const session = activePolls.get(sessionId)?.find(p => p.clientId === clientId);
        if (session) {
          session.lastHeartbeat = new Date();
          // Send heartbeat (empty response)
          resolve({ heartbeat: true, timestamp: new Date().toISOString() });
          clearInterval(heartbeat);
          clearTimeout(timeout);
          this.cleanupPoll(sessionId, clientId);
        }
      }, LONG_POLL_CONFIG.heartbeatIntervalMs);

      // Set up abort handler
      abortController.signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        clearInterval(heartbeat);
        this.cleanupPoll(sessionId, clientId);
        reject(new Error('Client aborted long-poll'));
      });
    });

    return pollPromise;
  }

  /**
   * Deliver message to waiting polls
   */
  static deliverMessage(sessionId: string, message: any): void {
    const polls = activePolls.get(sessionId);
    if (!polls || polls.length === 0) {
      return;
    }

    // Deliver to all waiting polls
    polls.forEach(poll => {
      try {
        poll.resolve({
          message,
          timestamp: new Date().toISOString(),
          delivered: true
        });
        this.cleanupPoll(sessionId, poll.clientId);
      } catch (error) {
        console.error('Error delivering message to poll:', error);
        this.cleanupPoll(sessionId, poll.clientId);
      }
    });
  }

  /**
   * Abort specific client's poll
   */
  static abortPoll(sessionId: string, clientId: string): boolean {
    const polls = activePolls.get(sessionId);
    if (!polls) {
      return false;
    }

    const poll = polls.find(p => p.clientId === clientId);
    if (!poll) {
      return false;
    }

    poll.abortController.abort();
    this.cleanupPoll(sessionId, clientId);
    return true;
  }

  /**
   * Abort all polls for a session
   */
  static abortAllPolls(sessionId: string): void {
    const polls = activePolls.get(sessionId);
    if (!polls) {
      return;
    }

    polls.forEach(poll => {
      poll.abortController.abort();
    });

    activePolls.delete(sessionId);
  }

  /**
   * Clean up poll session
   */
  private static cleanupPoll(sessionId: string, clientId: string): void {
    const polls = activePolls.get(sessionId);
    if (!polls) {
      return;
    }

    const index = polls.findIndex(p => p.clientId === clientId);
    if (index !== -1) {
      polls.splice(index, 1);
    }

    // Remove session if no active polls
    if (polls.length === 0) {
      activePolls.delete(sessionId);
    }
  }

  /**
   * Get active poll count for session
   */
  static getActivePollCount(sessionId: string): number {
    const polls = activePolls.get(sessionId);
    return polls ? polls.length : 0;
  }

  /**
   * Get all active polls (for monitoring)
   */
  static getAllActivePolls(): Array<{ sessionId: string; clientId: string; startTime: Date; lastHeartbeat: Date }> {
    const result: Array<{ sessionId: string; clientId: string; startTime: Date; lastHeartbeat: Date }> = [];
    
    for (const [sessionId, polls] of activePolls.entries()) {
      polls.forEach(poll => {
        result.push({
          sessionId,
          clientId: poll.clientId,
          startTime: poll.startTime,
          lastHeartbeat: poll.lastHeartbeat
        });
      });
    }
    
    return result;
  }

  /**
   * Clean up stale polls (older than max wait time)
   */
  static cleanupStalePolls(): void {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - LONG_POLL_CONFIG.maxWaitMs);

    for (const [sessionId, polls] of activePolls.entries()) {
      const stalePolls = polls.filter(poll => poll.startTime < staleThreshold);
      
      stalePolls.forEach(poll => {
        poll.abortController.abort();
        this.cleanupPoll(sessionId, poll.clientId);
      });
    }
  }
}

/**
 * Long-polling middleware
 */
export function createLongPollingMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: sessionId } = request.params as { id: string };
    const { after, waitMs } = request.query as { after?: string; waitMs?: string };
    
    // Generate client ID from request
    const clientId = `${request.ip}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Parse wait time
    const parsedWaitMs = waitMs ? parseInt(waitMs, 10) : LONG_POLL_CONFIG.defaultWaitMs;
    
    if (isNaN(parsedWaitMs) || parsedWaitMs <= 0) {
      reply.code(400).send({ error: 'Invalid waitMs parameter' });
      return;
    }

    // Check for immediate abort
    if (request.headers['x-abort-poll'] === 'true') {
      const aborted = LongPollingManager.abortPoll(sessionId, clientId);
      reply.code(200).send({ aborted, message: 'Poll aborted' });
      return;
    }

    try {
      // Start long-poll
      const result = await LongPollingManager.startPoll(
        sessionId,
        clientId,
        parsedWaitMs,
        after
      );

      if (result === null) {
        // Timeout - return empty response
        reply.code(200).send([]);
      } else if (result.heartbeat) {
        // Heartbeat response
        reply.code(200).send({ heartbeat: true, timestamp: result.timestamp });
      } else if (result.message) {
        // Message delivered
        reply.code(200).send([result.message]);
      } else {
        // Other response
        reply.code(200).send(result);
      }
    } catch (error) {
      if (error.message === 'Client aborted long-poll') {
        reply.code(200).send({ aborted: true, message: 'Poll aborted by client' });
      } else {
        reply.code(500).send({ error: 'Long-poll error', message: error.message });
      }
    }
  };
}

// Clean up stale polls periodically
setInterval(() => {
  LongPollingManager.cleanupStalePolls();
}, 60000); // Every minute
