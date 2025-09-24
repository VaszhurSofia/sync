/**
 * DEK Age Monitoring and Alerting
 * Monitors Data Encryption Key age and triggers alerts when threshold is exceeded
 */

import { FastifyInstance } from 'fastify';
import { getEncryption } from '../crypto/aes-gcm';

export interface DEKAgeAlert {
  dekAgeDays: number;
  thresholdDays: number;
  isExceeded: boolean;
  lastRotation: Date;
  nextRotationDue: Date;
  alertLevel: 'info' | 'warning' | 'critical';
}

export class DEKAgeMonitor {
  private thresholdDays: number;
  private alertWebhook?: string;
  private lastAlertSent?: Date;
  private alertCooldownHours: number;

  constructor(
    thresholdDays: number = 90,
    alertWebhook?: string,
    alertCooldownHours: number = 24
  ) {
    this.thresholdDays = thresholdDays;
    this.alertWebhook = alertWebhook;
    this.alertCooldownHours = alertCooldownHours;
  }

  /**
   * Check DEK age and determine if alert should be sent
   */
  async checkDEKAge(): Promise<DEKAgeAlert> {
    const encryption = getEncryption();
    const dekInfo = await encryption.getDEKInfo();
    
    if (!dekInfo.createdAt) {
      throw new Error('DEK creation date is not available');
    }
    
    const dekAgeDays = Math.floor(
      (Date.now() - dekInfo.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const isExceeded = dekAgeDays > this.thresholdDays;
    const nextRotationDue = new Date(dekInfo.createdAt.getTime() + (this.thresholdDays * 24 * 60 * 60 * 1000));
    
    let alertLevel: 'info' | 'warning' | 'critical' = 'info';
    if (dekAgeDays > this.thresholdDays * 1.5) {
      alertLevel = 'critical';
    } else if (dekAgeDays > this.thresholdDays) {
      alertLevel = 'warning';
    }

    const alert: DEKAgeAlert = {
      dekAgeDays,
      thresholdDays: this.thresholdDays,
      isExceeded,
      lastRotation: dekInfo.createdAt!,
      nextRotationDue,
      alertLevel
    };

    // Send alert if needed and cooldown has passed
    if (isExceeded && this.shouldSendAlert()) {
      await this.sendAlert(alert);
    }

    return alert;
  }

  /**
   * Determine if alert should be sent based on cooldown
   */
  private shouldSendAlert(): boolean {
    if (!this.lastAlertSent) return true;
    
    const hoursSinceLastAlert = (Date.now() - this.lastAlertSent.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastAlert >= this.alertCooldownHours;
  }

  /**
   * Send alert to monitoring system
   */
  private async sendAlert(alert: DEKAgeAlert): Promise<void> {
    if (!this.alertWebhook) return;

    const alertPayload = {
      alert: 'DEK Age Exceeded',
      level: alert.alertLevel,
      dekAgeDays: alert.dekAgeDays,
      thresholdDays: alert.thresholdDays,
      lastRotation: alert.lastRotation.toISOString(),
      nextRotationDue: alert.nextRotationDue.toISOString(),
      timestamp: new Date().toISOString(),
      service: 'sync-api',
      environment: process.env.NODE_ENV || 'development'
    };

    try {
      const response = await fetch(this.alertWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Sync-DEK-Monitor/1.0'
        },
        body: JSON.stringify(alertPayload)
      });

      if (response.ok) {
        this.lastAlertSent = new Date();
        console.log('DEK age alert sent successfully');
      } else {
        console.error('Failed to send DEK age alert:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error sending DEK age alert:', error);
    }
  }

  /**
   * Get current DEK age status
   */
  async getDEKAgeStatus(): Promise<DEKAgeAlert> {
    return this.checkDEKAge();
  }

  /**
   * Force send alert (for testing)
   */
  async forceAlert(): Promise<void> {
    const alert = await this.checkDEKAge();
    await this.sendAlert(alert);
  }
}

/**
 * Register DEK age monitoring with Fastify
 */
export async function registerDEKAgeMonitoring(fastify: FastifyInstance) {
  const monitor = new DEKAgeMonitor(
    parseInt(process.env.DEK_AGE_THRESHOLD_DAYS || '90'),
    process.env.ALERT_WEBHOOK_URL,
    parseInt(process.env.ALERT_COOLDOWN_HOURS || '24')
  );

  // Register health check endpoint
  fastify.get('/health/dek-age', async (request, reply) => {
    try {
      const status = await monitor.getDEKAgeStatus();
      reply.code(200).send(status);
    } catch (error) {
      fastify.log.error({ error: error instanceof Error ? error.message : "Unknown error" }, 'Failed to get DEK age status');
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve DEK age status'
      });
    }
  });

  // Register alert endpoint (for testing)
  fastify.post('/admin/force-dek-alert', async (request, reply) => {
    try {
      await monitor.forceAlert();
      reply.code(200).send({
        message: 'DEK age alert sent successfully'
      });
    } catch (error) {
      fastify.log.error({ error: error instanceof Error ? error.message : "Unknown error" }, 'Failed to force DEK age alert');
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to send DEK age alert'
      });
    }
  });

  // Start periodic monitoring
  const checkInterval = parseInt(process.env.DEK_CHECK_INTERVAL_MINUTES || '60') * 60 * 1000;
  
  setInterval(async () => {
    try {
      await monitor.checkDEKAge();
    } catch (error) {
      fastify.log.error({ error: error instanceof Error ? error.message : "Unknown error" }, 'DEK age monitoring error');
    }
  }, checkInterval);

  fastify.log.info({
    thresholdDays: process.env.DEK_AGE_THRESHOLD_DAYS || '90',
    checkIntervalMinutes: process.env.DEK_CHECK_INTERVAL_MINUTES || '60'
  }, 'DEK age monitoring registered');
}
