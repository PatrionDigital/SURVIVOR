import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { verifyMessage } from "viem";
import { isTokenBlocked, addToTokenBlocklist } from "./redis.js";
import crypto from "crypto";

// Payload type for signing (without auto-generated fields)
export interface JWTSignPayload {
  playerId: string;
  walletAddress: string;
  farcasterFid?: number;
  jti?: string; // JWT ID for blocklist
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

      // Check if token is blocklisted (for logout)
      const jti = request.user?.jti;
      if (jti) {
        const blocked = await isTokenBlocked(jti);
        if (blocked) {
          return reply
            .status(401)
            .send({ error: "Unauthorized", message: "Token has been revoked" });
        }
      }
    } catch (_err) {
      reply.status(401).send({ error: "Unauthorized", message: "Invalid or expired token" });
    }
  });
}

// Helper to generate tokens
export function generateTokens(
  fastify: FastifyInstance,
  payload: Omit<JWTSignPayload, "jti">
): { accessToken: string; expiresAt: number } {
  // Generate unique JWT ID for blocklist support
  const jti = crypto.randomUUID();
  const accessToken = fastify.jwt.sign({ ...payload, jti });
  const decoded = fastify.jwt.decode<JWTPayload>(accessToken);
  return {
    accessToken,
    expiresAt: decoded?.exp || 0,
  };
}

// Verify SIWF signature
export async function verifySIWFSignature(
  message: string,
  signature: `0x${string}`,
  walletAddress: `0x${string}`
): Promise<boolean> {
  try {
    const isValid = await verifyMessage({
      address: walletAddress,
      message,
      signature,
    });
    return isValid;
  } catch {
    return false;
  }
}

// Add token to blocklist for logout
export async function revokeToken(jti: string, expiresAt: number): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const ttl = expiresAt - now;
  if (ttl > 0) {
    await addToTokenBlocklist(jti, ttl);
  }
}

export { isTokenBlocked };

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
