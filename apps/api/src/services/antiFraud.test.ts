import { describe, it, expect } from "vitest";
import {
  computeTrustStatus,
  getRewardMultiplier,
  runValidationPipeline,
} from "./antiFraud.js";
import type { HeartbeatData, SessionTrustData } from "./antiFraud.js";

describe("antiFraud", () => {
  // ── Task 1: Core Types and Pipeline Orchestrator ──

  describe("computeTrustStatus", () => {
    it("returns 'clean' for scores >= 70", () => {
      expect(computeTrustStatus(100)).toBe("clean");
      expect(computeTrustStatus(70)).toBe("clean");
    });

    it("returns 'suspicious' for scores >= 40 and < 70", () => {
      expect(computeTrustStatus(69)).toBe("suspicious");
      expect(computeTrustStatus(40)).toBe("suspicious");
    });

    it("returns 'flagged' for scores >= 1 and < 40", () => {
      expect(computeTrustStatus(39)).toBe("flagged");
      expect(computeTrustStatus(1)).toBe("flagged");
    });

    it("returns 'banned' for score of 0", () => {
      expect(computeTrustStatus(0)).toBe("banned");
    });
  });

  describe("getRewardMultiplier", () => {
    it("returns 1.0 for clean scores", () => {
      expect(getRewardMultiplier(100)).toBe(1.0);
      expect(getRewardMultiplier(70)).toBe(1.0);
    });

    it("returns 0.5 for suspicious scores", () => {
      expect(getRewardMultiplier(50)).toBe(0.5);
    });

    it("returns 0.0 for flagged or banned scores", () => {
      expect(getRewardMultiplier(30)).toBe(0.0);
      expect(getRewardMultiplier(0)).toBe(0.0);
    });
  });

  describe("runValidationPipeline", () => {
    const makeHeartbeat = (overrides?: Partial<HeartbeatData>): HeartbeatData => ({
      sessionId: "session-1",
      playerId: "player-1",
      score: 100,
      wave: 1,
      kills: 10,
      timestamp: Date.now(),
      checksum: "valid",
      heartbeatCount: 1,
      ...overrides,
    });

    const makeTrust = (overrides?: Partial<SessionTrustData>): SessionTrustData => ({
      sessionId: "session-1",
      walletAddress: "0x1234",
      trustScore: 100,
      flags: [],
      previousHeartbeat: null,
      sessionStartTime: Date.now() - 60_000,
      heartbeatCount: 0,
    });

    it("returns results from all 4 validators with stubs passing", async () => {
      const results = await runValidationPipeline(makeHeartbeat(), makeTrust());
      expect(results).toHaveLength(4);
      for (const r of results) {
        expect(r.valid).toBe(true);
        expect(r.trustPenalty).toBe(0);
      }
      const names = results.map((r) => r.validator);
      expect(names).toContain("checksum");
      expect(names).toContain("rates");
      expect(names).toContain("timing");
      expect(names).toContain("behavior");
    });
  });
});
