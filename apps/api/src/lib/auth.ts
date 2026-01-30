import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyJwt from "@fastify/jwt";

// Payload type for signing (without auto-generated fields)
export interface JWTSignPayload {
  playerId: string;
  walletAddress: string;
  farcasterFid?: number;
}

// Full payload type after decoding (includes auto-generated fields)
export interface JWTPayload extends JWTSignPayload {
  iat: number;
  exp: number;
}

export async function registerAuthPlugin(fastify: FastifyInstance) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  await fastify.register(fastifyJwt, {
    secret: jwtSecret,
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  });

  // Decorate fastify with authenticate method
  fastify.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: "Unauthorized", message: "Invalid or expired token" });
    }
  });
}

// Helper to generate tokens
export function generateTokens(
  fastify: FastifyInstance,
  payload: JWTSignPayload
): { accessToken: string; expiresAt: number } {
  const accessToken = fastify.jwt.sign(payload);
  const decoded = fastify.jwt.decode<JWTPayload>(accessToken);
  return {
    accessToken,
    expiresAt: decoded?.exp || 0,
  };
}

// Type augmentation for Fastify
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JWTSignPayload;
    user: JWTPayload;
  }
}
