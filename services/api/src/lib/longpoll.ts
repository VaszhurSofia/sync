import { EventEmitter } from 'events';
import { logger } from '../logger';

export interface LongPollConfig {
  maxWaitMs: number;
  heartbeatIntervalMs: number;
  defaultWaitMs: number;
  maxConcurrentPolls: number;
}

export interface LongPollRequest {
  sessionId: string;
  clientId: string;
  after?: string;
  waitMs: number;
  startTime: Date;
  abortController: AbortController;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export interface LongPollResponse {
  messages?: any[];
  heartbeat?: boolean;
  timestamp: string;
  watermark?: string;
}

export class LongPollManager extends EventEmitter {
  private activePolls = new Map<string, LongPollRequest[]>();
  private config: LongPollConfig;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<LongPollConfig> = {}) {
    super();
    
    this.config = {
      maxWaitMs: 30000, // 30 seconds max
      heartbeatIntervalMs: 5000, // 5 second heartbeats
      defaultWaitMs: 25000, // 25 seconds default
      maxConcurrentPolls: 100, // Max concurrent polls per session
      ...config
    };

    this.startHeartbeat();
  }

  /**
   * Start a long-poll request
   */
  async startPoll(
    sessionId: string,
    clientId: string,
    waitMs: number,
    after?: string
  ): Promise<LongPollResponse> {
    // Validate wait time
    const validatedWaitMs = Math.min(waitMs, this.config.maxWaitMs);
    
    // Check concurrent poll limit
    const sessionPolls = this.activePolls.get(sessionId) || [];
    if (sessionPolls.length >= this.config.maxConcurrentPolls) {
      throw new Error('Too many concurrent polls for this session');
    }
    
    // Create abort controller for client cancellation
    const abortController = new AbortController();
    
    // Create promise for long-poll
    const pollPromise = new Promise<LongPollResponse>((resolve, reject) => {
      const pollRequest: LongPollRequest = {
        sessionId,
        clientId,
        after,
        waitMs: validatedWaitMs,
        startTime: new Date(),
        abortController,
        resolve,
        reject
      };

      // Add to active polls
      if (!this.activePolls.has(sessionId)) {
        this.activePolls.set(sessionId, []);
      }
      this.activePolls.get(sessionId)!.push(pollRequest);

      // Set up timeout
      const timeout = setTimeout(() => {
        this.cleanupPoll(sessionId, clientId);
        resolve({
          messages: [],
          timestamp: new Date().toISOString(),
          watermark: after
        });
      }, validatedWaitMs);

      // Set up abort handler
      abortController.signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        this.cleanupPoll(sessionId, clientId);
        reject(new Error('Client aborted long-poll'));
      });

      // Store timeout for cleanup
      (pollRequest as any).timeout = timeout;
    });

    logger.info('Long-poll started', {
      sessionId,
      clientId,
      waitMs: validatedWaitMs,
      after
    });

    return pollPromise;
  }

  /**
   * Deliver message to waiting polls
   */
  deliverMessage(sessionId: string, message: any): void {
    const polls = this.activePolls.get(sessionId);
    if (!polls || polls.length === 0) {
      return;
    }

    logger.info('Delivering message to long-polls', {
      sessionId,
      activePolls: polls.length,
      messageId: message.id
    });

    // Deliver to all waiting polls
    polls.forEach(poll => {
      try {
        // Clear timeout
        if ((poll as any).timeout) {
          clearTimeout((poll as any).timeout);
        }

        poll.resolve({
          messages: [message],
          timestamp: new Date().toISOString(),
          watermark: message.createdAt || new Date().toISOString()
        });
        
        this.cleanupPoll(sessionId, poll.clientId);
      } catch (error) {
        logger.error('Error delivering message to poll', {
          error: error instanceof Error ? error.message : "Unknown error",
          sessionId,
          clientId: poll.clientId
        });
        this.cleanupPoll(sessionId, poll.clientId);
      }
    });
  }

  /**
   * Send heartbeat to all active polls
   */
  private sendHeartbeat(): void {
    const now = new Date();
    
    for (const [sessionId, polls] of this.activePolls.entries()) {
      polls.forEach(poll => {
        try {
          // Check if poll is still active and needs heartbeat
          const elapsed = now.getTime() - poll.startTime.getTime();
          if (elapsed >= this.config.heartbeatIntervalMs) {
            poll.resolve({
              heartbeat: true,
              timestamp: now.toISOString(),
              watermark: poll.after
            });
            
            // Clean up this poll after heartbeat
            this.cleanupPoll(sessionId, poll.clientId);
          }
        } catch (error) {
          logger.error('Error sending heartbeat', {
            error: error instanceof Error ? error.message : "Unknown error",
            sessionId,
            clientId: poll.clientId
          });
          this.cleanupPoll(sessionId, poll.clientId);
        }
      });
    }
  }

  /**
   * Abort specific client's poll
   */
  abortPoll(sessionId: string, clientId: string): boolean {
    const polls = this.activePolls.get(sessionId);
    if (!polls) {
      return false;
    }

    const poll = polls.find(p => p.clientId === clientId);
    if (!poll) {
      return false;
    }

    poll.abortController.abort();
    this.cleanupPoll(sessionId, clientId);
    
    logger.info('Long-poll aborted', { sessionId, clientId });
    
    return true;
  }

  /**
   * Abort all polls for a session
   */
  abortAllPolls(sessionId: string): void {
    const polls = this.activePolls.get(sessionId);
    if (!polls) {
      return;
    }

    logger.info('Aborting all long-polls for session', {
      sessionId,
      pollCount: polls.length
    });

    polls.forEach(poll => {
      poll.abortController.abort();
    });

    this.activePolls.delete(sessionId);
  }

  /**
   * Clean up poll session
   */
  private cleanupPoll(sessionId: string, clientId: string): void {
    const polls = this.activePolls.get(sessionId);
    if (!polls) {
      return;
    }

    const index = polls.findIndex(p => p.clientId === clientId);
    if (index !== -1) {
      const poll = polls[index];
      
      // Clear timeout if exists
      if ((poll as any).timeout) {
        clearTimeout((poll as any).timeout);
      }
      
      polls.splice(index, 1);
    }

    // Remove session if no active polls
    if (polls.length === 0) {
      this.activePolls.delete(sessionId);
    }
  }

  /**
   * Get active poll count for session
   */
  getActivePollCount(sessionId: string): number {
    const polls = this.activePolls.get(sessionId);
    return polls ? polls.length : 0;
  }

  /**
   * Get all active polls (for monitoring)
   */
  getAllActivePolls(): Array<{
    sessionId: string;
    clientId: string;
    startTime: Date;
    waitMs: number;
    after?: string;
  }> {
    const result: Array<{
      sessionId: string;
      clientId: string;
      startTime: Date;
      waitMs: number;
      after?: string;
    }> = [];
    
    for (const [sessionId, polls] of this.activePolls.entries()) {
      polls.forEach(poll => {
        result.push({
          sessionId,
          clientId: poll.clientId,
          startTime: poll.startTime,
          waitMs: poll.waitMs,
          after: poll.after
        });
      });
    }
    
    return result;
  }

  /**
   * Clean up stale polls (older than max wait time)
   */
  cleanupStalePolls(): void {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - this.config.maxWaitMs);

    for (const [sessionId, polls] of this.activePolls.entries()) {
      const stalePolls = polls.filter(poll => poll.startTime < staleThreshold);
      
      stalePolls.forEach(poll => {
        logger.warn('Cleaning up stale long-poll', {
          sessionId,
          clientId: poll.clientId,
          age: now.getTime() - poll.startTime.getTime()
        });
        
        poll.abortController.abort();
        this.cleanupPoll(sessionId, poll.clientId);
      });
    }
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
      this.cleanupStalePolls();
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Stop heartbeat interval
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Abort all active polls
    for (const sessionId of this.activePolls.keys()) {
      this.abortAllPolls(sessionId);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): LongPollConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LongPollConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart heartbeat if interval changed
    if (newConfig.heartbeatIntervalMs) {
      this.stop();
      this.startHeartbeat();
    }
  }
}

// Singleton instance
let longPollManager: LongPollManager | null = null;

export function getLongPollManager(): LongPollManager {
  if (!longPollManager) {
    longPollManager = new LongPollManager();
  }
  return longPollManager;
}

export function initializeLongPolling(config?: Partial<LongPollConfig>): void {
  if (longPollManager) {
    longPollManager.stop();
  }
  
  longPollManager = new LongPollManager(config);
  
  logger.info('Long-polling initialized', {
    config: longPollManager.getConfig()
  });
}

export function shutdownLongPolling(): void {
  if (longPollManager) {
    longPollManager.stop();
    longPollManager = null;
  }
}
