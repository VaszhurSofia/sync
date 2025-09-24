/**
 * Metrics Route
 * Exposes Prometheus-formatted metrics endpoint
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { metricsCollector } from '../metrics';

export async function metricsRoutes(fastify: FastifyInstance) {
  // GET /metrics - Prometheus metrics endpoint
  fastify.get('/metrics', {
    schema: {
      response: {
        200: {
          type: 'string',
          description: 'Prometheus-formatted metrics'
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const metrics = metricsCollector.toPrometheus();
      
      reply.type('text/plain; version=0.0.4; charset=utf-8');
      return reply.send(metrics);
    } catch (error) {
      fastify.log.error({ error: error instanceof Error ? error.message : "Unknown error" }, 'Failed to generate metrics');
      return reply.code(500).send('Internal server error');
    }
  });

  // GET /metrics/json - JSON metrics endpoint (for debugging)
  fastify.get('/metrics/json', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            sessionStarted: { type: 'number' },
            sessionCompleted: { type: 'number' },
            sessionBoundary: { type: 'number' },
            sessionSurvey: { type: 'number' },
            sessionDelete: { type: 'number' },
            messageSent: { type: 'number' },
            messageReceived: { type: 'number' },
            boundaryViolation: { type: 'number' },
            safetyCheck: { type: 'number' },
            longPollRequest: { type: 'number' },
            longPollTimeout: { type: 'number' },
            longPollAbort: { type: 'number' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const metrics = metricsCollector.getMetrics();
      return reply.send(metrics);
    } catch (error) {
      fastify.log.error({ error: error instanceof Error ? error.message : "Unknown error" }, 'Failed to get metrics');
      return reply.code(500).send('Internal server error');
    }
  });

  // POST /metrics/reset - Reset metrics (for testing)
  fastify.post('/metrics/reset', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      metricsCollector.reset();
      return reply.send({
        success: true,
        message: 'Metrics reset successfully'
      });
    } catch (error) {
      fastify.log.error({ error: error instanceof Error ? error.message : "Unknown error" }, 'Failed to reset metrics');
      return reply.code(500).send('Internal server error');
    }
  });
}
