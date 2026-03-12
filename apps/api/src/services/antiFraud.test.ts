import { describe, it, expect } from "vitest";
import {
  computeTrustStatus,
  getRewardMultiplier,
  runValidationPipeline,
  computeChecksumSecret,
  computeChecksum,
  generateSessionFingerprint,
  detectReplay,
  shouldBanPlayer,
} from "./antiFraud.js";
import type { HeartbeatData, SessionTrustData, PlayerFraudHistory } from "./antiFraud.js";

// ── Shared helpers ──

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
  ...overrides,
});

/** Build a heartbeat with a valid checksum so checksum validator passes */
function makeValidHeartbeat(
  overrides?: Partial<HeartbeatData>,
  wallet = "0x1234",
): HeartbeatData {
  const base = makeHeartbeat(overrides);
  const secret = computeChecksumSecret(base.sessionId, wallet);
  const checksum = computeChecksum(
    base.sessionId,
    base.score,
    base.wave,
    base.kills,
    base.timestamp,
    secret,
  );
  return { ...base, checksum };
}

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
    it("returns results from all 4 validators with stubs passing", async () => {
      const hb = makeValidHeartbeat();
      const trust = makeTrust();
      const results = await runValidationPipeline(hb, trust);
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

  // ── Task 2: Checksum Validator ──

  describe("checksum validator", () => {
    it("produces deterministic checksums", () => {
      const secret = computeChecksumSecret("session-1", "0xABC");
      const c1 = computeChecksum("session-1", 100, 1, 10, 1000, secret);
      const c2 = computeChecksum("session-1", 100, 1, 10, 1000, secret);
      expect(c1).toBe(c2);
    });

    it("produces different checksums for different inputs", () => {
      const secret = computeChecksumSecret("session-1", "0xABC");
      const c1 = computeChecksum("session-1", 100, 1, 10, 1000, secret);
      const c2 = computeChecksum("session-1", 200, 1, 10, 1000, secret);
      expect(c1).not.toBe(c2);
    });

    it("pipeline passes with valid checksum", async () => {
      const hb = makeValidHeartbeat();
      const results = await runValidationPipeline(hb, makeTrust());
      const checksumResult = results.find((r) => r.validator === "checksum")!;
      expect(checksumResult.valid).toBe(true);
      expect(checksumResult.trustPenalty).toBe(0);
    });

    it("pipeline penalizes invalid checksum with 40 points", async () => {
      const hb = makeHeartbeat({ checksum: "definitely-wrong" });
      const results = await runValidationPipeline(hb, makeTrust());
      const checksumResult = results.find((r) => r.validator === "checksum")!;
      expect(checksumResult.valid).toBe(false);
      expect(checksumResult.trustPenalty).toBe(40);
      expect(checksumResult.severity).toBe("critical");
    });
  });

  // ── Task 3: Rate Validator ──

  describe("rate validator", () => {
    it("passes with normal growth", async () => {
      const now = Date.now();
      const prev = makeValidHeartbeat({
        score: 50, wave: 1, kills: 5, timestamp: now - 30_000, heartbeatCount: 1,
      });
      const hb = makeValidHeartbeat({
        score: 100, wave: 1, kills: 10, timestamp: now, heartbeatCount: 2,
      });
      const trust = makeTrust({ previousHeartbeat: prev, heartbeatCount: 1 });
      const results = await runValidationPipeline(hb, trust);
      const rateResult = results.find((r) => r.validator === "rates")!;
      expect(rateResult.valid).toBe(true);
      expect(rateResult.trustPenalty).toBe(0);
    });

    it("penalizes score decrease", async () => {
      const now = Date.now();
      const prev = makeValidHeartbeat({
        score: 200, wave: 1, kills: 10, timestamp: now - 30_000, heartbeatCount: 1,
      });
      const hb = makeValidHeartbeat({
        score: 100, wave: 1, kills: 10, timestamp: now, heartbeatCount: 2,
      });
      const trust = makeTrust({ previousHeartbeat: prev, heartbeatCount: 1 });
      const results = await runValidationPipeline(hb, trust);
      const rateResult = results.find((r) => r.validator === "rates")!;
      expect(rateResult.valid).toBe(false);
      expect(rateResult.trustPenalty).toBeGreaterThanOrEqual(20);
    });

    it("penalizes impossible kill rate", async () => {
      const now = Date.now();
      const prev = makeValidHeartbeat({
        score: 50, wave: 1, kills: 0, timestamp: now - 10_000, heartbeatCount: 1,
      });
      const hb = makeValidHeartbeat({
        score: 5000, wave: 1, kills: 300, timestamp: now, heartbeatCount: 2,
      });
      const trust = makeTrust({ previousHeartbeat: prev, heartbeatCount: 1 });
      const results = await runValidationPipeline(hb, trust);
      const rateResult = results.find((r) => r.validator === "rates")!;
      expect(rateResult.valid).toBe(false);
      expect(rateResult.trustPenalty).toBeGreaterThanOrEqual(60);
    });

    it("penalizes wave jump > 1", async () => {
      const now = Date.now();
      const prev = makeValidHeartbeat({
        score: 50, wave: 1, kills: 5, timestamp: now - 30_000, heartbeatCount: 1,
      });
      const hb = makeValidHeartbeat({
        score: 100, wave: 4, kills: 10, timestamp: now, heartbeatCount: 2,
      });
      const trust = makeTrust({ previousHeartbeat: prev, heartbeatCount: 1 });
      const results = await runValidationPipeline(hb, trust);
      const rateResult = results.find((r) => r.validator === "rates")!;
      expect(rateResult.valid).toBe(false);
      expect(rateResult.trustPenalty).toBeGreaterThanOrEqual(20);
    });
  });

  // ── Task 4: Timing Validator ──

  describe("timing validator", () => {
    it("passes with normal 30s interval", async () => {
      const now = Date.now();
      const prev = makeValidHeartbeat({
        score: 50, wave: 1, kills: 5, timestamp: now - 30_000, heartbeatCount: 1,
      });
      const hb = makeValidHeartbeat({
        score: 100, wave: 1, kills: 10, timestamp: now, heartbeatCount: 2,
      });
      const trust = makeTrust({
        previousHeartbeat: prev, heartbeatCount: 1, sessionStartTime: now - 120_000,
      });
      const results = await runValidationPipeline(hb, trust);
      const timingResult = results.find((r) => r.validator === "timing")!;
      expect(timingResult.valid).toBe(true);
      expect(timingResult.trustPenalty).toBe(0);
    });

    it("penalizes too-fast heartbeat interval (< 10s)", async () => {
      const now = Date.now();
      const prev = makeValidHeartbeat({
        score: 50, wave: 1, kills: 5, timestamp: now - 5_000, heartbeatCount: 1,
      });
      const hb = makeValidHeartbeat({
        score: 100, wave: 1, kills: 10, timestamp: now, heartbeatCount: 2,
      });
      const trust = makeTrust({
        previousHeartbeat: prev, heartbeatCount: 1, sessionStartTime: now - 60_000,
      });
      const results = await runValidationPipeline(hb, trust);
      const timingResult = results.find((r) => r.validator === "timing")!;
      expect(timingResult.valid).toBe(false);
      expect(timingResult.trustPenalty).toBe(15);
      expect(timingResult.severity).toBe("warning");
    });

    it("penalizes session duration over 30 minutes", async () => {
      const now = Date.now();
      const prev = makeValidHeartbeat({
        score: 50, wave: 1, kills: 5, timestamp: now - 30_000, heartbeatCount: 1,
      });
      const hb = makeValidHeartbeat({
        score: 100, wave: 1, kills: 10, timestamp: now, heartbeatCount: 2,
      });
      const trust = makeTrust({
        previousHeartbeat: prev, heartbeatCount: 1,
        sessionStartTime: now - 31 * 60 * 1000,
      });
      const results = await runValidationPipeline(hb, trust);
      const timingResult = results.find((r) => r.validator === "timing")!;
      expect(timingResult.valid).toBe(false);
      expect(timingResult.trustPenalty).toBe(15);
      expect(timingResult.severity).toBe("warning");
    });
  });

  // ── Task 5: Behavioral Validator ──

  describe("behavioral validator", () => {
    it("passes with normal score/kill correlation", async () => {
      const now = Date.now();
      const prev = makeValidHeartbeat({
        score: 500, wave: 2, kills: 50, timestamp: now - 30_000, heartbeatCount: 2,
      });
      const hb = makeValidHeartbeat({
        score: 1000, wave: 2, kills: 100, timestamp: now, heartbeatCount: 3,
      });
      const trust = makeTrust({
        previousHeartbeat: prev, heartbeatCount: 2, sessionStartTime: now - 120_000,
      });
      const results = await runValidationPipeline(hb, trust);
      const behaviorResult = results.find((r) => r.validator === "behavior")!;
      expect(behaviorResult.valid).toBe(true);
      expect(behaviorResult.trustPenalty).toBe(0);
    });

    it("penalizes disproportionate score to kills ratio", async () => {
      const now = Date.now();
      const prev = makeValidHeartbeat({
        score: 50_000, wave: 2, kills: 1, timestamp: now - 30_000, heartbeatCount: 2,
      });
      const hb = makeValidHeartbeat({
        score: 100_000, wave: 2, kills: 2, timestamp: now, heartbeatCount: 3,
      });
      const trust = makeTrust({
        previousHeartbeat: prev, heartbeatCount: 2, sessionStartTime: now - 120_000,
      });
      const results = await runValidationPipeline(hb, trust);
      const behaviorResult = results.find((r) => r.validator === "behavior")!;
      expect(behaviorResult.valid).toBe(false);
      expect(behaviorResult.trustPenalty).toBe(10);
    });

    it("penalizes kills decreasing", async () => {
      const now = Date.now();
      const prev = makeValidHeartbeat({
        score: 500, wave: 2, kills: 100, timestamp: now - 30_000, heartbeatCount: 2,
      });
      const hb = makeValidHeartbeat({
        score: 600, wave: 2, kills: 50, timestamp: now, heartbeatCount: 3,
      });
      const trust = makeTrust({
        previousHeartbeat: prev, heartbeatCount: 2, sessionStartTime: now - 120_000,
      });
      const results = await runValidationPipeline(hb, trust);
      const behaviorResult = results.find((r) => r.validator === "behavior")!;
      expect(behaviorResult.valid).toBe(false);
      expect(behaviorResult.trustPenalty).toBe(10);
      expect(behaviorResult.severity).toBe("warning");
    });
  });

  // ── Task 6: Replay Detector ──

  describe("replay detector", () => {
    it("produces deterministic fingerprints", () => {
      const heartbeats = [
        { score: 100, wave: 1, kills: 10 },
        { score: 200, wave: 2, kills: 20 },
      ];
      const f1 = generateSessionFingerprint(heartbeats);
      const f2 = generateSessionFingerprint(heartbeats);
      expect(f1).toBe(f2);
      expect(f1).toHaveLength(16);
    });

    it("produces different fingerprints for different sequences", () => {
      const seq1 = [{ score: 100, wave: 1, kills: 10 }];
      const seq2 = [{ score: 200, wave: 1, kills: 10 }];
      expect(generateSessionFingerprint(seq1)).not.toBe(generateSessionFingerprint(seq2));
    });

    it("returns false when no previous fingerprints exist", async () => {
      const mockRedis = {
        get: async () => null,
        setex: async () => "OK" as const,
      };
      const result = await detectReplay("player-1", "abc123", mockRedis);
      expect(result).toBe(false);
    });

    it("returns true when fingerprint matches a stored one", async () => {
      const storedFingerprints = JSON.stringify(["abc123", "def456"]);
      const mockRedis = {
        get: async () => storedFingerprints,
        setex: async () => "OK" as const,
      };
      const result = await detectReplay("player-1", "abc123", mockRedis);
      expect(result).toBe(true);
    });
  });

  // ── Task 7: Ban System ──

  describe("ban system", () => {
    const makeHistory = (overrides?: Partial<PlayerFraudHistory>): PlayerFraudHistory => ({
      flaggedSessionsLast24h: 0,
      flaggedSessionsLast7d: 0,
      currentBanUntil: null,
      banCount: 0,
      ...overrides,
    });

    it("does not ban a clean player", () => {
      const decision = shouldBanPlayer(makeHistory());
      expect(decision.shouldBan).toBe(false);
      expect(decision.alreadyBanned).toBeUndefined();
    });

    it("bans for 24h when 3+ sessions flagged in 24h", () => {
      const decision = shouldBanPlayer(makeHistory({ flaggedSessionsLast24h: 3 }));
      expect(decision.shouldBan).toBe(true);
      expect(decision.banDurationHours).toBe(24);
    });

    it("bans for 7 days when 5+ sessions flagged in 7d", () => {
      const decision = shouldBanPlayer(makeHistory({ flaggedSessionsLast7d: 5 }));
      expect(decision.shouldBan).toBe(true);
      expect(decision.banDurationHours).toBe(168);
    });

    it("does not re-ban an already banned player", () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const decision = shouldBanPlayer(makeHistory({
        flaggedSessionsLast24h: 10,
        currentBanUntil: futureDate,
      }));
      expect(decision.shouldBan).toBe(false);
      expect(decision.alreadyBanned).toBe(true);
    });
  });
});
