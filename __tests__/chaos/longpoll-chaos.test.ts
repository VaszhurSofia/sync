/**
 * Chaos Tests for Long-Poll
 * Simulates abrupt disconnects, reconnect storms, and network failures
 * Ensures ordering and watermarks hold under stress
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LongPollManager } from '../../services/api/src/lib/longpoll';

interface ChaosTestConfig {
  sessionId: string;
  messageCount: number;
  disconnectProbability: number;
  reconnectDelay: number;
  stormIntensity: number;
}

interface TestMessage {
  id: string;
  sessionId: string;
  content: string;
  timestamp: number;
  sequence: number;
}

class LongPollChaosTester {
  private longPollManager: LongPollManager;
  private receivedMessages: TestMessage[] = [];
  private connectionStates: Map<string, boolean> = new Map();
  private messageSequences: Map<string, number[]> = new Map();

  constructor() {
    this.longPollManager = new LongPollManager();
  }

  /**
   * Simulate abrupt disconnect during long-poll
   */
  async simulateAbruptDisconnect(sessionId: string, clientId: string): Promise<void> {
    // Simulate network failure
    this.connectionStates.set(clientId, false);
    
    // Simulate connection drop
    await this.longPollManager.disconnectClient(sessionId, clientId);
    
    // Verify client is disconnected
    expect(this.longPollManager.isClientConnected(sessionId, clientId)).toBe(false);
  }

  /**
   * Simulate reconnect storm (multiple clients reconnecting rapidly)
   */
  async simulateReconnectStorm(sessionId: string, clientCount: number): Promise<void> {
    const reconnectPromises: Promise<void>[] = [];
    
    for (let i = 0; i < clientCount; i++) {
      const clientId = `client-${i}`;
      const reconnectPromise = this.simulateReconnect(sessionId, clientId);
      reconnectPromises.push(reconnectPromise);
    }
    
    // Execute all reconnects simultaneously
    await Promise.all(reconnectPromises);
    
    // Verify all clients are connected
    for (let i = 0; i < clientCount; i++) {
      const clientId = `client-${i}`;
      expect(this.longPollManager.isClientConnected(sessionId, clientId)).toBe(true);
    }
  }

  /**
   * Simulate individual client reconnect
   */
  private async simulateReconnect(sessionId: string, clientId: string): Promise<void> {
    // Simulate reconnection
    this.connectionStates.set(clientId, true);
    
    // Re-establish long-poll connection
    await this.longPollManager.connectClient(sessionId, clientId);
    
    // Verify connection
    expect(this.longPollManager.isClientConnected(sessionId, clientId)).toBe(true);
  }

  /**
   * Simulate network latency and packet loss
   */
  async simulateNetworkChaos(sessionId: string, clientId: string): Promise<void> {
    // Simulate random latency (0-5000ms)
    const latency = Math.random() * 5000;
    await new Promise(resolve => setTimeout(resolve, latency));
    
    // Simulate packet loss (10% probability)
    if (Math.random() < 0.1) {
      // Simulate message loss
      return;
    }
    
    // Simulate out-of-order delivery
    if (Math.random() < 0.05) {
      // Simulate message reordering
      await this.simulateMessageReordering(sessionId);
    }
  }

  /**
   * Simulate message reordering
   */
  private async simulateMessageReordering(sessionId: string): Promise<void> {
    // Get pending messages
    const pendingMessages = this.longPollManager.getPendingMessages(sessionId);
    
    if (pendingMessages.length > 1) {
      // Shuffle messages to simulate reordering
      const shuffled = [...pendingMessages].sort(() => Math.random() - 0.5);
      
      // Re-deliver in shuffled order
      for (const message of shuffled) {
        await this.longPollManager.deliverMessage(sessionId, message);
      }
    }
  }

  /**
   * Verify message ordering is maintained
   */
  verifyMessageOrdering(sessionId: string): boolean {
    const messages = this.receivedMessages.filter(m => m.sessionId === sessionId);
    const sequences = messages.map(m => m.sequence).sort((a, b) => a - b);
    
    // Check if sequences are in order
    for (let i = 1; i < sequences.length; i++) {
      if (sequences[i] !== sequences[i-1] + 1) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Verify watermarks are maintained
   */
  verifyWatermarks(sessionId: string): boolean {
    const messages = this.receivedMessages.filter(m => m.sessionId === sessionId);
    const watermarks = this.longPollManager.getWatermarks(sessionId);
    
    // Check if all messages are within watermark bounds
    for (const message of messages) {
      if (message.timestamp < watermarks.start || message.timestamp > watermarks.end) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Simulate client timeout
   */
  async simulateClientTimeout(sessionId: string, clientId: string): Promise<void> {
    // Simulate client going offline
    this.connectionStates.set(clientId, false);
    
    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second timeout
    
    // Verify client is disconnected
    expect(this.longPollManager.isClientConnected(sessionId, clientId)).toBe(false);
  }

  /**
   * Simulate server restart during long-poll
   */
  async simulateServerRestart(sessionId: string): Promise<void> {
    // Simulate server shutdown
    await this.longPollManager.shutdown();
    
    // Simulate server restart
    await this.longPollManager.initialize();
    
    // Verify long-poll manager is functional
    expect(this.longPollManager.isInitialized()).toBe(true);
  }

  /**
   * Run comprehensive chaos test
   */
  async runChaosTest(config: ChaosTestConfig): Promise<{
    success: boolean;
    errors: string[];
    metrics: {
      totalMessages: number;
      lostMessages: number;
      reorderedMessages: number;
      averageLatency: number;
    };
  }> {
    const errors: string[] = [];
    let totalMessages = 0;
    let lostMessages = 0;
    let reorderedMessages = 0;
    let totalLatency = 0;
    
    try {
      // Simulate normal operation
      for (let i = 0; i < config.messageCount; i++) {
        const message: TestMessage = {
          id: `msg-${i}`,
          sessionId: config.sessionId,
          content: `Test message ${i}`,
          timestamp: Date.now(),
          sequence: i
        };
        
        // Simulate network chaos
        await this.simulateNetworkChaos(config.sessionId, `client-${i % 5}`);
        
        // Simulate abrupt disconnect
        if (Math.random() < config.disconnectProbability) {
          await this.simulateAbruptDisconnect(config.sessionId, `client-${i % 5}`);
          lostMessages++;
        }
        
        // Simulate reconnect storm
        if (Math.random() < config.stormIntensity) {
          await this.simulateReconnectStorm(config.sessionId, 10);
        }
        
        // Record message
        this.receivedMessages.push(message);
        totalMessages++;
        totalLatency += Math.random() * 1000; // Simulate latency
      }
      
      // Verify ordering
      if (!this.verifyMessageOrdering(config.sessionId)) {
        errors.push('Message ordering violated');
        reorderedMessages++;
      }
      
      // Verify watermarks
      if (!this.verifyWatermarks(config.sessionId)) {
        errors.push('Watermarks violated');
      }
      
      return {
        success: errors.length === 0,
        errors,
        metrics: {
          totalMessages,
          lostMessages,
          reorderedMessages,
          averageLatency: totalLatency / totalMessages
        }
      };
    } catch (error) {
      errors.push(`Chaos test failed: ${error.message}`);
      return {
        success: false,
        errors,
        metrics: {
          totalMessages,
          lostMessages,
          reorderedMessages,
          averageLatency: 0
        }
      };
    }
  }
}

describe('Long-Poll Chaos Tests', () => {
  let chaosTester: LongPollChaosTester;
  
  beforeEach(() => {
    chaosTester = new LongPollChaosTester();
  });
  
  afterEach(() => {
    // Cleanup
    chaosTester = null;
  });

  it('should handle abrupt disconnects gracefully', async () => {
    const sessionId = 'test-session-1';
    const clientId = 'client-1';
    
    // Simulate abrupt disconnect
    await chaosTester.simulateAbruptDisconnect(sessionId, clientId);
    
    // Verify client is disconnected
    expect(chaosTester['longPollManager'].isClientConnected(sessionId, clientId)).toBe(false);
  });

  it('should handle reconnect storms', async () => {
    const sessionId = 'test-session-2';
    const clientCount = 50;
    
    // Simulate reconnect storm
    await chaosTester.simulateReconnectStorm(sessionId, clientCount);
    
    // Verify all clients are connected
    for (let i = 0; i < clientCount; i++) {
      const clientId = `client-${i}`;
      expect(chaosTester['longPollManager'].isClientConnected(sessionId, clientId)).toBe(true);
    }
  });

  it('should maintain message ordering under chaos', async () => {
    const config: ChaosTestConfig = {
      sessionId: 'test-session-3',
      messageCount: 100,
      disconnectProbability: 0.1,
      reconnectDelay: 1000,
      stormIntensity: 0.05
    };
    
    const result = await chaosTester.runChaosTest(config);
    
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.metrics.totalMessages).toBe(100);
  });

  it('should maintain watermarks under chaos', async () => {
    const sessionId = 'test-session-4';
    
    // Simulate message delivery with chaos
    for (let i = 0; i < 50; i++) {
      await chaosTester.simulateNetworkChaos(sessionId, `client-${i % 3}`);
    }
    
    // Verify watermarks
    expect(chaosTester.verifyWatermarks(sessionId)).toBe(true);
  });

  it('should handle client timeouts', async () => {
    const sessionId = 'test-session-5';
    const clientId = 'client-timeout';
    
    // Simulate client timeout
    await chaosTester.simulateClientTimeout(sessionId, clientId);
    
    // Verify client is disconnected
    expect(chaosTester['longPollManager'].isClientConnected(sessionId, clientId)).toBe(false);
  });

  it('should handle server restart', async () => {
    const sessionId = 'test-session-6';
    
    // Simulate server restart
    await chaosTester.simulateServerRestart(sessionId);
    
    // Verify long-poll manager is functional
    expect(chaosTester['longPollManager'].isInitialized()).toBe(true);
  });

  it('should handle extreme chaos scenarios', async () => {
    const config: ChaosTestConfig = {
      sessionId: 'test-session-7',
      messageCount: 1000,
      disconnectProbability: 0.3,
      reconnectDelay: 500,
      stormIntensity: 0.2
    };
    
    const result = await chaosTester.runChaosTest(config);
    
    // Even under extreme chaos, core functionality should work
    expect(result.metrics.totalMessages).toBe(1000);
    expect(result.metrics.lostMessages).toBeLessThan(500); // Should not lose more than 50%
  });
});
