import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email?: string;
    };
  }
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email?: string;
  };
}

export type RequestHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
export type AuthenticatedHandler = (request: AuthenticatedRequest, reply: FastifyReply) => Promise<void>;
