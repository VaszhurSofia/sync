import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    // Ensure no plaintext content is logged
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
      }),
    },
  },
});

// Register plugins
async function registerPlugins() {
  // Security
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Allow for development
  });

  await fastify.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key',
  });

  // Swagger documentation
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Sync API',
        description: 'Couple\'s shared chat MVP with AI reflection',
        version: '0.1.0',
      },
      servers: [
        {
          url: process.env.API_URL || 'http://localhost:3001',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });
}

// Register authentication middleware
async function registerAuth() {
  const { authenticate, optionalAuthenticate } = await import('./middleware/auth');
  const { createLogScrubbingMiddleware } = await import('./middleware/log-scrubbing');
  const { pool } = await import('./utils/database');
  
  fastify.decorate('authenticate', authenticate);
  fastify.decorate('optionalAuthenticate', optionalAuthenticate);
  fastify.decorate('pg', pool);
  
  // Register log scrubbing middleware to prevent API key leaks
  fastify.addHook('onRequest', createLogScrubbingMiddleware());
}

// Register routes
async function registerRoutes() {
  // Health check
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });

  // Register route modules
  const { authRoutes } = await import('./routes/auth');
  const { couplesRoutes } = await import('./routes/couples');
  const { healthRoutes } = await import('./routes/health');
  // const { sessionMessagesRoutes } = await import('./routes/sessions.messages');
  // const { sessionDeleteRoutes } = await import('./routes/sessions.delete');
  const { metricsRoutes } = await import('./routes/metrics');
  
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(couplesRoutes);
  // await fastify.register(sessionMessagesRoutes);
  // await fastify.register(sessionDeleteRoutes);
  await fastify.register(metricsRoutes);

  // Staging gate
  if (process.env.STAGING === 'true') {
    fastify.addHook('onRequest', async (request, reply) => {
      const auth = request.headers.authorization;
      const validAuth = `Basic ${Buffer.from(process.env.STAGING_AUTH || 'admin:password').toString('base64')}`;
      
      if (!auth || auth !== validAuth) {
        reply.code(401).send({ 
          error: 'Unauthorized',
          message: 'Staging environment requires authentication'
        });
      }
    });
  }
}

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerAuth();
    await registerRoutes();

    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🚀 Sync API server running on http://${host}:${port}`);
    console.log(`📚 API documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

start();
