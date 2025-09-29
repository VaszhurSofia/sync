import { FastifyRequest, FastifyReply } from 'fastify';

export interface LongPollOptions {
  waitMs: number;
  timeout: number;
  checkInterval: number;
}

export interface MessageWatermark {
  sessionId: string;
  lastMessageId: string;
  lastTimestamp: string;
}

export class LongPollManager {
  private activePolls = new Map<string, Set<FastifyReply>>();
  private messageWatermarks = new Map<string, MessageWatermark>();
  private checkIntervals = new Map<string, NodeJS.Timeout>();

  /**
   * Start a long-polling request
   */
  async startLongPoll(
    sessionId: string,
    after: string | undefined,
    options: LongPollOptions,
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const { waitMs, timeout, checkInterval } = options;
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      this.endLongPoll(sessionId, reply);
      reply.code(200).send([]);
    }, Math.min(waitMs, timeout));

    // Set up abort handling
    request.raw.on('close', () => {
      clearTimeout(timeoutId);
      this.endLongPoll(sessionId, reply);
    });

    // Register this poll
    if (!this.activePolls.has(sessionId)) {
      this.activePolls.set(sessionId, new Set());
    }
    this.activePolls.get(sessionId)!.add(reply);

    // Set up periodic checking
    const intervalId = setInterval(async () => {
      try {
        const newMessages = await this.checkForNewMessages(sessionId, after);
        if (newMessages.length > 0) {
          clearTimeout(timeoutId);
          clearInterval(intervalId);
          this.endLongPoll(sessionId, reply);
          reply.code(200).send(newMessages);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        this.endLongPoll(sessionId, reply);
        reply.code(500).send({ error: 'LONGPOLL_FAILED', message: 'Failed to check for messages' });
      }
    }, checkInterval);

    this.checkIntervals.set(sessionId, intervalId);
  }

  /**
   * Check for new messages since the given timestamp
   */
  private async checkForNewMessages(sessionId: string, after?: string): Promise<any[]> {
    // This would integrate with the actual message storage
    // For now, we'll simulate checking for new messages
    const messages = await this.getMessagesSince(sessionId, after);
    return messages;
  }

  /**
   * Get messages since a specific timestamp
   */
  private async getMessagesSince(sessionId: string, after?: string): Promise<any[]> {
    // This would query the actual database
    // For now, return empty array (no new messages)
    return [];
  }

  /**
   * Notify all active polls about new messages
   */
  notifyNewMessages(sessionId: string, messages: any[]): void {
    const activePolls = this.activePolls.get(sessionId);
    if (!activePolls) return;

    for (const reply of activePolls) {
      try {
        reply.code(200).send(messages);
      } catch (error) {
        // Client disconnected, remove from active polls
        activePolls.delete(reply);
      }
    }

    // Clear all polls for this session
    this.clearActivePolls(sessionId);
  }

  /**
   * End a specific long-poll
   */
  private endLongPoll(sessionId: string, reply: FastifyReply): void {
    const activePolls = this.activePolls.get(sessionId);
    if (activePolls) {
      activePolls.delete(reply);
      if (activePolls.size === 0) {
        this.clearActivePolls(sessionId);
      }
    }
  }

  /**
   * Clear all active polls for a session
   */
  private clearActivePolls(sessionId: string): void {
    this.activePolls.delete(sessionId);
    
    const intervalId = this.checkIntervals.get(sessionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.checkIntervals.delete(sessionId);
    }
  }

  /**
   * Update watermark for a session
   */
  updateWatermark(sessionId: string, messageId: string, timestamp: string): void {
    this.messageWatermarks.set(sessionId, {
      sessionId,
      lastMessageId: messageId,
      lastTimestamp: timestamp
    });
  }

  /**
   * Get watermark for a session
   */
  getWatermark(sessionId: string): MessageWatermark | undefined {
    return this.messageWatermarks.get(sessionId);
  }
}

// Global long-poll manager instance
export const longPollManager = new LongPollManager();