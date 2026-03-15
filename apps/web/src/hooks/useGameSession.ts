import { useCallback, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useSessionStore } from "../stores";
import { computeChecksum } from "../lib/checksum";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const IS_DEV = import.meta.env.DEV;

interface GearSnapshot {
  weapon: string;
  armor: string;
  power: string;
  gloves: string;
  amulet: string;
  boots: string;
}

interface SessionStartResponse {
  sessionId: string;
  serverTime: number;
  checksumSecret: string;
}

interface SessionEndResponse {
  vscReward: string;
  rewardSignature: string;
  nonce: string;
  deadline: number;
}

export interface RewardClaimData {
  amount: string;
  signature: `0x${string}`;
  nonce: string;
  deadline: number;
}

export function useGameSession() {
  const { address, isConnected } = useAccount();
  const { authToken, isAuthenticated, sessionId, setAuth, clearAuth, startSession, endSession } =
    useSessionStore();

  // Track if we're currently authenticating to prevent double calls
  const isAuthenticatingRef = useRef(false);

  // Store the checksum secret received from the server on session start
  const checksumSecretRef = useRef<string>("");

  // Authenticate with the backend (dev mode uses /api/auth/dev)
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!address) {
      console.error("No wallet address connected");
      return false;
    }

    if (isAuthenticatingRef.current) {
      return false;
    }

    isAuthenticatingRef.current = true;

    try {
      // In dev mode, use the dev auth endpoint
      const authEndpoint = IS_DEV ? "/api/auth/dev" : "/api/auth/verify";

      const response = await fetch(`${API_URL}${authEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: address,
        }),
      });

      if (!response.ok) {
        console.error("Auth failed:", response.status, response.statusText);
        return false;
      }

      const data = await response.json();
      setAuth(data.token, data.player.id, address);
      return true;
    } catch (error) {
      console.error("Auth error:", error);
      return false;
    } finally {
      isAuthenticatingRef.current = false;
    }
  }, [address, setAuth]);

  // Start a new game session
  const startGameSession = useCallback(
    async (gearSnapshot?: GearSnapshot): Promise<string | null> => {
      if (!authToken) {
        console.error("Not authenticated");
        return null;
      }

      try {
        const response = await fetch(`${API_URL}/api/game/session/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            gearSnapshot: gearSnapshot || {
              weapon: "0",
              armor: "0",
              power: "0",
              gloves: "0",
              amulet: "0",
              boots: "0",
            },
          }),
        });

        if (!response.ok) {
          console.error("Failed to start session:", response.status, response.statusText);
          return null;
        }

        const data: SessionStartResponse = await response.json();
        checksumSecretRef.current = data.checksumSecret;
        startSession(data.sessionId);
        return data.sessionId;
      } catch (error) {
        console.error("Error starting session:", error);
        return null;
      }
    },
    [authToken, startSession]
  );

  // End a game session and get signed reward
  const endGameSession = useCallback(
    async (
      finalScore: number,
      finalWave: number,
      totalKills: number,
      xpEarned: number,
      damageDealt = 0,
      damageTaken = 0
    ): Promise<RewardClaimData | null> => {
      if (!authToken || !sessionId) {
        console.error("Not authenticated or no active session");
        return null;
      }

      try {
        const response = await fetch(`${API_URL}/api/game/session/end`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            sessionId,
            finalScore,
            finalWave,
            totalKills,
            damageDealt,
            damageTaken,
            xpEarned,
          }),
        });

        if (!response.ok) {
          console.error("Failed to end session:", response.status, response.statusText);
          return null;
        }

        const data: SessionEndResponse = await response.json();
        endSession();

        return {
          amount: data.vscReward,
          signature: data.rewardSignature as `0x${string}`,
          nonce: data.nonce,
          deadline: data.deadline,
        };
      } catch (error) {
        console.error("Error ending session:", error);
        return null;
      }
    },
    [authToken, sessionId, endSession]
  );

  // Send heartbeat during gameplay
  const sendHeartbeat = useCallback(
    async (score: number, wave: number, kills: number) => {
      if (!authToken || !sessionId) {
        return false;
      }

      try {
        const timestamp = Date.now();
        const checksum = await computeChecksum(
          sessionId,
          score,
          wave,
          kills,
          timestamp,
          checksumSecretRef.current
        );

        const response = await fetch(`${API_URL}/api/game/session/heartbeat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            sessionId,
            score,
            wave,
            kills,
            timestamp,
            checksum,
          }),
        });

        return response.ok;
      } catch {
        return false;
      }
    },
    [authToken, sessionId]
  );

  // Auto-authenticate when wallet connects (dev mode only)
  useEffect(() => {
    if (IS_DEV && isConnected && address && !isAuthenticated && !isAuthenticatingRef.current) {
      authenticate();
    }
  }, [IS_DEV, isConnected, address, isAuthenticated, authenticate]);

  // Clear auth when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      clearAuth();
    }
  }, [isConnected, clearAuth]);

  return {
    isAuthenticated,
    sessionId,
    authenticate,
    startGameSession,
    endGameSession,
    sendHeartbeat,
  };
}
