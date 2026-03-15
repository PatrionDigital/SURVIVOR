# Anti-Cheat System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a layered anti-fraud validation pipeline for game sessions with trust scoring, silent flagging, and automated ban escalation.

**Architecture:** A pipeline of pure-function validators (checksum, rate, timing, behavioral, replay) that run on heartbeats and session-end. Each produces a penalty score. Accumulated penalties reduce a session trust score, which determines reward eligibility (1.0x / 0.5x / 0x multiplier). Silent flagging prevents cheaters from adapting.

**Tech Stack:** Fastify (existing), Redis (existing), Supabase/Postgres (existing), crypto (Node built-in for HMAC), Vitest (existing test framework)

**Design Doc:** `docs/plans/2026-03-09-anti-cheat-system-design.md`

---

### Task 1: Core Types and Pipeline Orchestrator

**Files:**

- Create: `apps/api/src/services/antiFraud.ts`
- Test: `apps/api/src/services/antiFraud.test.ts`

**Step 1: Write failing tests for core types and pipeline**

Create `apps/api/src/services/antiFraud.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  type ValidationResult,
  type SessionTrustData,
  type HeartbeatData,
  runValidationPipeline,
  computeTrustStatus,
  getRewardMultiplier,
} from "./antiFraud.js";

describe("Anti-Fraud Pipeline", () => {
  describe("computeTrustStatus", () => {
    it("returns 'clean' for scores 70-100", () => {
      expect(computeTrustStatus(100)).toBe("clean");
      expect(computeTrustStatus(70)).toBe("clean");
    });

    it("returns 'suspicious' for scores 40-69", () => {
      expect(computeTrustStatus(69)).toBe("suspicious");
      expect(computeTrustStatus(40)).toBe("suspicious");
    });

    it("returns 'flagged' for scores 1-39", () => {
      expect(computeTrustStatus(39)).toBe("flagged");
      expect(computeTrustStatus(1)).toBe("flagged");
    });

    it("returns 'banned' for score 0", () => {
      expect(computeTrustStatus(0)).toBe("banned");
    });
  });

  describe("getRewardMultiplier", () => {
    it("returns 1.0 for clean sessions", () => {
      expect(getRewardMultiplier(85)).toBe(1.0);
    });

    it("returns 0.5 for suspicious sessions", () => {
      expect(getRewardMultiplier(55)).toBe(0.5);
    });

    it("returns 0.0 for flagged sessions", () => {
      expect(getRewardMultiplier(20)).toBe(0.0);
    });

    it("returns 0.0 for banned sessions", () => {
      expect(getRewardMultiplier(0)).toBe(0.0);
    });
  });

  describe("runValidationPipeline", () => {
    const baseHeartbeat: HeartbeatData = {
      sessionId: "session-1",
      playerId: "player-1",
      score: 500,
      wave: 2,
      kills: 30,
      timestamp: Date.now(),
      checksum: "valid-checksum",
    };

    const baseTrust: SessionTrustData = {
      trustScore: 100,
      heartbeatCount: 1,
      lastHeartbeatTime: Date.now() - 30000,
      lastScore: 200,
      lastWave: 1,
      lastKills: 15,
      checksumSecret: "test-secret",
      consecutiveChecksumFailures: 0,
      sessionStartTime: Date.now() - 60000,
    };

    it("returns results from all validators", () => {
      const results = runValidationPipeline(baseHeartbeat, baseTrust);
      expect(results.length).toBeGreaterThanOrEqual(4);
      // Each result must have the required fields
      for (const r of results) {
        expect(r).toHaveProperty("valid");
        expect(r).toHaveProperty("trustPenalty");
        expect(r).toHaveProperty("severity");
      }
    });

    it("returns no penalties for legitimate play", () => {
      const results = runValidationPipeline(baseHeartbeat, baseTrust);
      const totalPenalty = results.reduce((sum, r) => sum + r.trustPenalty, 0);
      expect(totalPenalty).toBe(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- --reporter verbose src/services/antiFraud.test.ts`
Expected: FAIL — module `./antiFraud.js` not found

**Step 3: Write minimal implementation**

Create `apps/api/src/services/antiFraud.ts`:

```typescript
/**
 * Anti-Fraud Validation Pipeline
 *
 * Layered validators that each produce a trust penalty.
 * Accumulated penalties reduce session trust score.
 */

// ============ Types ============

export type TrustStatus = "clean" | "suspicious" | "flagged" | "banned";
export type Severity = "info" | "warning" | "critical";

export interface ValidationResult {
  valid: boolean;
  trustPenalty: number;
  reason?: string;
  severity: Severity;
  validator: string;
}

export interface HeartbeatData {
  sessionId: string;
  playerId: string;
  score: number;
  wave: number;
  kills: number;
  timestamp: number;
  checksum: string;
}

export interface SessionTrustData {
  trustScore: number;
  heartbeatCount: number;
  lastHeartbeatTime: number;
  lastScore: number;
  lastWave: number;
  lastKills: number;
  checksumSecret: string;
  consecutiveChecksumFailures: number;
  sessionStartTime: number;
}

export interface FraudFlag {
  validator: string;
  severity: Severity;
  penalty: number;
  reason: string;
  heartbeatIndex: number;
  metadata?: Record<string, unknown>;
}

// ============ Trust Scoring ============

export function computeTrustStatus(score: number): TrustStatus {
  if (score >= 70) return "clean";
  if (score >= 40) return "suspicious";
  if (score >= 1) return "flagged";
  return "banned";
}

export function getRewardMultiplier(trustScore: number): number {
  const status = computeTrustStatus(trustScore);
  switch (status) {
    case "clean":
      return 1.0;
    case "suspicious":
      return 0.5;
    default:
      return 0.0;
  }
}

// ============ Pipeline ============

export function runValidationPipeline(
  heartbeat: HeartbeatData,
  trust: SessionTrustData
): ValidationResult[] {
  return [
    validateChecksum(heartbeat, trust),
    validateRates(heartbeat, trust),
    validateTiming(heartbeat, trust),
    validateBehavior(heartbeat, trust),
  ];
}

// ============ Validators (stubs — implemented in subsequent tasks) ============

function validateChecksum(_heartbeat: HeartbeatData, _trust: SessionTrustData): ValidationResult {
  return { valid: true, trustPenalty: 0, severity: "info", validator: "checksum" };
}

function validateRates(_heartbeat: HeartbeatData, _trust: SessionTrustData): ValidationResult {
  return { valid: true, trustPenalty: 0, severity: "info", validator: "rate" };
}

function validateTiming(_heartbeat: HeartbeatData, _trust: SessionTrustData): ValidationResult {
  return { valid: true, trustPenalty: 0, severity: "info", validator: "timing" };
}

function validateBehavior(_heartbeat: HeartbeatData, _trust: SessionTrustData): ValidationResult {
  return { valid: true, trustPenalty: 0, severity: "info", validator: "behavioral" };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- --reporter verbose src/services/antiFraud.test.ts`
Expected: PASS (all 7 tests)

**Step 5: Commit**

```bash
git add apps/api/src/services/antiFraud.ts apps/api/src/services/antiFraud.test.ts
git commit -m "feat(api): add anti-fraud pipeline types and orchestrator (Task 4 anti-fraud)"
```

---

### Task 2: Checksum Validator

**Files:**

- Modify: `apps/api/src/services/antiFraud.ts` (replace `validateChecksum` stub)
- Modify: `apps/api/src/services/antiFraud.test.ts` (add checksum tests)

**Step 1: Write failing checksum tests**

Add to `antiFraud.test.ts`:

```typescript
import { computeChecksum } from "./antiFraud.js";

describe("Checksum Validator", () => {
  const secret = "test-secret-key";

  it("generates deterministic checksums", () => {
    const a = computeChecksum("s1", 100, 2, 10, 1000, secret);
    const b = computeChecksum("s1", 100, 2, 10, 1000, secret);
    expect(a).toBe(b);
  });

  it("generates different checksums for different inputs", () => {
    const a = computeChecksum("s1", 100, 2, 10, 1000, secret);
    const b = computeChecksum("s1", 200, 2, 10, 1000, secret);
    expect(a).not.toBe(b);
  });

  it("pipeline passes with valid checksum", () => {
    const checksum = computeChecksum("session-1", 500, 2, 30, Date.now(), secret);
    const heartbeat: HeartbeatData = {
      sessionId: "session-1",
      playerId: "player-1",
      score: 500,
      wave: 2,
      kills: 30,
      timestamp: Date.now(),
      checksum,
    };
    const trust: SessionTrustData = {
      trustScore: 100,
      heartbeatCount: 1,
      lastHeartbeatTime: Date.now() - 30000,
      lastScore: 200,
      lastWave: 1,
      lastKills: 15,
      checksumSecret: secret,
      consecutiveChecksumFailures: 0,
      sessionStartTime: Date.now() - 60000,
    };
    const results = runValidationPipeline(heartbeat, trust);
    const checksumResult = results.find((r) => r.validator === "checksum")!;
    expect(checksumResult.valid).toBe(true);
    expect(checksumResult.trustPenalty).toBe(0);
  });

  it("pipeline penalizes invalid checksum with 40 points", () => {
    const heartbeat: HeartbeatData = {
      sessionId: "session-1",
      playerId: "player-1",
      score: 500,
      wave: 2,
      kills: 30,
      timestamp: Date.now(),
      checksum: "tampered-checksum",
    };
    const trust: SessionTrustData = {
      trustScore: 100,
      heartbeatCount: 1,
      lastHeartbeatTime: Date.now() - 30000,
      lastScore: 200,
      lastWave: 1,
      lastKills: 15,
      checksumSecret: secret,
      consecutiveChecksumFailures: 0,
      sessionStartTime: Date.now() - 60000,
    };
    const results = runValidationPipeline(heartbeat, trust);
    const checksumResult = results.find((r) => r.validator === "checksum")!;
    expect(checksumResult.valid).toBe(false);
    expect(checksumResult.trustPenalty).toBe(40);
    expect(checksumResult.severity).toBe("critical");
  });
});
```

**Step 2: Run to verify failure**

Run: `pnpm --filter api test -- --reporter verbose src/services/antiFraud.test.ts`
Expected: FAIL — `computeChecksum` not exported, checksum validator always returns valid

**Step 3: Implement checksum validator**

In `antiFraud.ts`, add `computeChecksum` and replace the stub:

```typescript
import { createHmac, createHash } from "crypto";

export function computeChecksumSecret(sessionId: string, walletAddress: string): string {
  return createHash("sha256").update(`${sessionId}${walletAddress}`).digest("hex");
}

export function computeChecksum(
  sessionId: string,
  score: number,
  wave: number,
  kills: number,
  timestamp: number,
  secret: string
): string {
  const payload = `${sessionId}${score}${wave}${kills}${timestamp}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function validateChecksum(heartbeat: HeartbeatData, trust: SessionTrustData): ValidationResult {
  const expected = computeChecksum(
    heartbeat.sessionId,
    heartbeat.score,
    heartbeat.wave,
    heartbeat.kills,
    heartbeat.timestamp,
    trust.checksumSecret
  );

  if (heartbeat.checksum === expected) {
    return { valid: true, trustPenalty: 0, severity: "info", validator: "checksum" };
  }

  return {
    valid: false,
    trustPenalty: 40,
    reason: "Checksum mismatch — client data may be tampered",
    severity: "critical",
    validator: "checksum",
  };
}
```

**Step 4: Run to verify pass**

Run: `pnpm --filter api test -- --reporter verbose src/services/antiFraud.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/antiFraud.ts apps/api/src/services/antiFraud.test.ts
git commit -m "feat(api): implement checksum validator with HMAC-SHA256"
```

---

### Task 3: Rate Validator

**Files:**

- Modify: `apps/api/src/services/antiFraud.ts` (replace `validateRates` stub)
- Modify: `apps/api/src/services/antiFraud.test.ts` (add rate tests)

**Step 1: Write failing rate tests**

Add to `antiFraud.test.ts`:

```typescript
describe("Rate Validator", () => {
  it("passes for normal score growth", () => {
    const heartbeat: HeartbeatData = {
      sessionId: "s1",
      playerId: "p1",
      score: 1000,
      wave: 2,
      kills: 50,
      timestamp: Date.now(),
      checksum: "x",
    };
    const trust: SessionTrustData = {
      trustScore: 100,
      heartbeatCount: 2,
      lastHeartbeatTime: Date.now() - 30000,
      lastScore: 500,
      lastWave: 1,
      lastKills: 25,
      checksumSecret: "x",
      consecutiveChecksumFailures: 0,
      sessionStartTime: Date.now() - 60000,
    };
    const results = runValidationPipeline(heartbeat, trust);
    const rate = results.find((r) => r.validator === "rate")!;
    expect(rate.valid).toBe(true);
    expect(rate.trustPenalty).toBe(0);
  });

  it("penalizes score decrease (impossible)", () => {
    const heartbeat: HeartbeatData = {
      sessionId: "s1",
      playerId: "p1",
      score: 100,
      wave: 2,
      kills: 50,
      timestamp: Date.now(),
      checksum: "x",
    };
    const trust: SessionTrustData = {
      trustScore: 100,
      heartbeatCount: 2,
      lastHeartbeatTime: Date.now() - 30000,
      lastScore: 500,
      lastWave: 1,
      lastKills: 25,
      checksumSecret: "x",
      consecutiveChecksumFailures: 0,
      sessionStartTime: Date.now() - 60000,
    };
    const results = runValidationPipeline(heartbeat, trust);
    const rate = results.find((r) => r.validator === "rate")!;
    expect(rate.valid).toBe(false);
    expect(rate.trustPenalty).toBeGreaterThanOrEqual(20);
  });

  it("penalizes impossible kill rate (>8 kills/sec)", () => {
    const now = Date.now();
    const heartbeat: HeartbeatData = {
      sessionId: "s1",
      playerId: "p1",
      score: 5000,
      wave: 2,
      kills: 500,
      timestamp: now,
      checksum: "x",
    };
    const trust: SessionTrustData = {
      trustScore: 100,
      heartbeatCount: 2,
      lastHeartbeatTime: now - 30000, // 30 seconds ago
      lastScore: 100,
      lastWave: 1,
      lastKills: 10,
      checksumSecret: "x",
      consecutiveChecksumFailures: 0,
      sessionStartTime: now - 60000,
    };
    // 490 kills in 30s = 16.3 kills/sec > max 8
    const results = runValidationPipeline(heartbeat, trust);
    const rate = results.find((r) => r.validator === "rate")!;
    expect(rate.valid).toBe(false);
    expect(rate.trustPenalty).toBeGreaterThanOrEqual(20);
  });

  it("penalizes wave jump >1 per heartbeat", () => {
    const heartbeat: HeartbeatData = {
      sessionId: "s1",
      playerId: "p1",
      score: 5000,
      wave: 5,
      kills: 100,
      timestamp: Date.now(),
      checksum: "x",
    };
    const trust: SessionTrustData = {
      trustScore: 100,
      heartbeatCount: 2,
      lastHeartbeatTime: Date.now() - 30000,
      lastScore: 1000,
      lastWave: 2,
      lastKills: 50,
      checksumSecret: "x",
      consecutiveChecksumFailures: 0,
      sessionStartTime: Date.now() - 60000,
    };
    const results = runValidationPipeline(heartbeat, trust);
    const rate = results.find((r) => r.validator === "rate")!;
    expect(rate.valid).toBe(false);
  });
});
```

**Step 2: Run to verify failure**

Expected: FAIL — rate validator stub always returns valid

**Step 3: Implement rate validator**

Replace the `validateRates` stub in `antiFraud.ts`:

```typescript
// Rate limits derived from game mechanics
const MAX_KILLS_PER_SECOND = 8;
const MAX_SCORE_PER_30S = 15000;
const MAX_WAVE_JUMP_PER_HEARTBEAT = 1;

function validateRates(heartbeat: HeartbeatData, trust: SessionTrustData): ValidationResult {
  // Skip for first heartbeat (no previous data to compare)
  if (trust.heartbeatCount <= 1) {
    return { valid: true, trustPenalty: 0, severity: "info", validator: "rate" };
  }

  const elapsedMs = heartbeat.timestamp - trust.lastHeartbeatTime;
  const elapsedSec = Math.max(elapsedMs / 1000, 1); // avoid division by zero

  // Check 1: Score must not decrease
  if (heartbeat.score < trust.lastScore) {
    return {
      valid: false,
      trustPenalty: 20,
      reason: `Score decreased from ${trust.lastScore} to ${heartbeat.score}`,
      severity: "warning",
      validator: "rate",
    };
  }

  // Check 2: Kill rate
  const killDelta = heartbeat.kills - trust.lastKills;
  const killRate = killDelta / elapsedSec;
  if (killRate > MAX_KILLS_PER_SECOND * 3) {
    return {
      valid: false,
      trustPenalty: 60,
      reason: `Kill rate ${killRate.toFixed(1)}/s exceeds 3x max (${MAX_KILLS_PER_SECOND * 3}/s)`,
      severity: "critical",
      validator: "rate",
    };
  }
  if (killRate > MAX_KILLS_PER_SECOND) {
    return {
      valid: false,
      trustPenalty: 20,
      reason: `Kill rate ${killRate.toFixed(1)}/s exceeds max (${MAX_KILLS_PER_SECOND}/s)`,
      severity: "warning",
      validator: "rate",
    };
  }

  // Check 3: Score growth rate
  const scoreDelta = heartbeat.score - trust.lastScore;
  const normalizedScoreGrowth = (scoreDelta / elapsedSec) * 30; // per 30s
  if (normalizedScoreGrowth > MAX_SCORE_PER_30S * 3) {
    return {
      valid: false,
      trustPenalty: 60,
      reason: `Score growth rate ${normalizedScoreGrowth.toFixed(0)}/30s exceeds 3x max`,
      severity: "critical",
      validator: "rate",
    };
  }

  // Check 4: Wave progression
  const waveDelta = heartbeat.wave - trust.lastWave;
  if (waveDelta > MAX_WAVE_JUMP_PER_HEARTBEAT) {
    return {
      valid: false,
      trustPenalty: 20,
      reason: `Wave jumped by ${waveDelta} (max ${MAX_WAVE_JUMP_PER_HEARTBEAT})`,
      severity: "warning",
      validator: "rate",
    };
  }

  return { valid: true, trustPenalty: 0, severity: "info", validator: "rate" };
}
```

**Step 4: Run to verify pass**

Run: `pnpm --filter api test -- --reporter verbose src/services/antiFraud.test.ts`

**Step 5: Commit**

```bash
git add apps/api/src/services/antiFraud.ts apps/api/src/services/antiFraud.test.ts
git commit -m "feat(api): implement rate validator with kill/score/wave limits"
```

---

### Task 4: Timing Validator

**Files:**

- Modify: `apps/api/src/services/antiFraud.ts` (replace `validateTiming` stub)
- Modify: `apps/api/src/services/antiFraud.test.ts` (add timing tests)

**Step 1: Write failing timing tests**

```typescript
describe("Timing Validator", () => {
  it("passes for normal 30s heartbeat interval", () => {
    const now = Date.now();
    const heartbeat: HeartbeatData = {
      sessionId: "s1",
      playerId: "p1",
      score: 500,
      wave: 2,
      kills: 30,
      timestamp: now,
      checksum: "x",
    };
    const trust: SessionTrustData = {
      trustScore: 100,
      heartbeatCount: 2,
      lastHeartbeatTime: now - 30000,
      lastScore: 200,
      lastWave: 1,
      lastKills: 15,
      checksumSecret: "x",
      consecutiveChecksumFailures: 0,
      sessionStartTime: now - 60000,
    };
    const results = runValidationPipeline(heartbeat, trust);
    const timing = results.find((r) => r.validator === "timing")!;
    expect(timing.valid).toBe(true);
  });

  it("penalizes too-fast heartbeat (<10s)", () => {
    const now = Date.now();
    const heartbeat: HeartbeatData = {
      sessionId: "s1",
      playerId: "p1",
      score: 500,
      wave: 2,
      kills: 30,
      timestamp: now,
      checksum: "x",
    };
    const trust: SessionTrustData = {
      trustScore: 100,
      heartbeatCount: 2,
      lastHeartbeatTime: now - 5000, // 5 seconds ago
      lastScore: 200,
      lastWave: 1,
      lastKills: 15,
      checksumSecret: "x",
      consecutiveChecksumFailures: 0,
      sessionStartTime: now - 60000,
    };
    const results = runValidationPipeline(heartbeat, trust);
    const timing = results.find((r) => r.validator === "timing")!;
    expect(timing.valid).toBe(false);
    expect(timing.trustPenalty).toBe(15);
  });

  it("penalizes session exceeding 30 minutes", () => {
    const now = Date.now();
    const heartbeat: HeartbeatData = {
      sessionId: "s1",
      playerId: "p1",
      score: 500,
      wave: 2,
      kills: 30,
      timestamp: now,
      checksum: "x",
    };
    const trust: SessionTrustData = {
      trustScore: 100,
      heartbeatCount: 10,
      lastHeartbeatTime: now - 30000,
      lastScore: 200,
      lastWave: 1,
      lastKills: 15,
      checksumSecret: "x",
      consecutiveChecksumFailures: 0,
      sessionStartTime: now - 31 * 60 * 1000, // 31 minutes ago
    };
    const results = runValidationPipeline(heartbeat, trust);
    const timing = results.find((r) => r.validator === "timing")!;
    expect(timing.valid).toBe(false);
    expect(timing.trustPenalty).toBe(15);
  });
});
```

**Step 2: Run to verify failure**

**Step 3: Implement timing validator**

Replace stub in `antiFraud.ts`:

```typescript
const MIN_HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds
const MAX_HEARTBEAT_INTERVAL_MS = 120000; // 2 minutes
const MAX_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function validateTiming(heartbeat: HeartbeatData, trust: SessionTrustData): ValidationResult {
  // Skip for first heartbeat
  if (trust.heartbeatCount <= 1) {
    return { valid: true, trustPenalty: 0, severity: "info", validator: "timing" };
  }

  const intervalMs = heartbeat.timestamp - trust.lastHeartbeatTime;
  const sessionDurationMs = heartbeat.timestamp - trust.sessionStartTime;

  // Too fast
  if (intervalMs < MIN_HEARTBEAT_INTERVAL_MS) {
    return {
      valid: false,
      trustPenalty: 15,
      reason: `Heartbeat interval ${intervalMs}ms < minimum ${MIN_HEARTBEAT_INTERVAL_MS}ms`,
      severity: "warning",
      validator: "timing",
    };
  }

  // Session too long
  if (sessionDurationMs > MAX_SESSION_DURATION_MS) {
    return {
      valid: false,
      trustPenalty: 15,
      reason: `Session duration ${Math.floor(sessionDurationMs / 60000)}min exceeds max 30min`,
      severity: "warning",
      validator: "timing",
    };
  }

  return { valid: true, trustPenalty: 0, severity: "info", validator: "timing" };
}
```

**Step 4: Run to verify pass**

**Step 5: Commit**

```bash
git add apps/api/src/services/antiFraud.ts apps/api/src/services/antiFraud.test.ts
git commit -m "feat(api): implement timing validator with interval and duration checks"
```

---

### Task 5: Behavioral Validator

**Files:**

- Modify: `apps/api/src/services/antiFraud.ts` (replace `validateBehavior` stub)
- Modify: `apps/api/src/services/antiFraud.test.ts` (add behavioral tests)

**Step 1: Write failing behavioral tests**

```typescript
describe("Behavioral Validator", () => {
  it("passes when score correlates with kills", () => {
    const now = Date.now();
    const heartbeat: HeartbeatData = {
      sessionId: "s1",
      playerId: "p1",
      score: 300,
      wave: 2,
      kills: 30, // ~10 XP per kill is reasonable
      timestamp: now,
      checksum: "x",
    };
    const trust: SessionTrustData = {
      trustScore: 100,
      heartbeatCount: 3,
      lastHeartbeatTime: now - 30000,
      lastScore: 100,
      lastWave: 1,
      lastKills: 10,
      checksumSecret: "x",
      consecutiveChecksumFailures: 0,
      sessionStartTime: now - 90000,
    };
    const results = runValidationPipeline(heartbeat, trust);
    const behavioral = results.find((r) => r.validator === "behavioral")!;
    expect(behavioral.valid).toBe(true);
  });

  it("penalizes score vastly disproportionate to kills", () => {
    const now = Date.now();
    const heartbeat: HeartbeatData = {
      sessionId: "s1",
      playerId: "p1",
      score: 50000,
      wave: 2,
      kills: 5, // 10000 XP per kill is impossible
      timestamp: now,
      checksum: "x",
    };
    const trust: SessionTrustData = {
      trustScore: 100,
      heartbeatCount: 3,
      lastHeartbeatTime: now - 30000,
      lastScore: 100,
      lastWave: 1,
      lastKills: 3,
      checksumSecret: "x",
      consecutiveChecksumFailures: 0,
      sessionStartTime: now - 90000,
    };
    const results = runValidationPipeline(heartbeat, trust);
    const behavioral = results.find((r) => r.validator === "behavioral")!;
    expect(behavioral.valid).toBe(false);
    expect(behavioral.trustPenalty).toBe(10);
  });

  it("penalizes kills decreasing (impossible)", () => {
    const now = Date.now();
    const heartbeat: HeartbeatData = {
      sessionId: "s1",
      playerId: "p1",
      score: 500,
      wave: 2,
      kills: 5,
      timestamp: now,
      checksum: "x",
    };
    const trust: SessionTrustData = {
      trustScore: 100,
      heartbeatCount: 3,
      lastHeartbeatTime: now - 30000,
      lastScore: 200,
      lastWave: 1,
      lastKills: 20, // kills went down
      checksumSecret: "x",
      consecutiveChecksumFailures: 0,
      sessionStartTime: now - 90000,
    };
    const results = runValidationPipeline(heartbeat, trust);
    const behavioral = results.find((r) => r.validator === "behavioral")!;
    expect(behavioral.valid).toBe(false);
  });
});
```

**Step 2: Run to verify failure**

**Step 3: Implement behavioral validator**

```typescript
const MAX_XP_PER_KILL = 100; // Highest-value enemy in game

function validateBehavior(heartbeat: HeartbeatData, trust: SessionTrustData): ValidationResult {
  // Skip for first two heartbeats (not enough data)
  if (trust.heartbeatCount <= 2) {
    return { valid: true, trustPenalty: 0, severity: "info", validator: "behavioral" };
  }

  // Check: kills must not decrease
  if (heartbeat.kills < trust.lastKills) {
    return {
      valid: false,
      trustPenalty: 10,
      reason: `Kills decreased from ${trust.lastKills} to ${heartbeat.kills}`,
      severity: "warning",
      validator: "behavioral",
    };
  }

  // Check: score-to-kill ratio
  if (heartbeat.kills > 0) {
    const scorePerKill = heartbeat.score / heartbeat.kills;
    if (scorePerKill > MAX_XP_PER_KILL * 5) {
      return {
        valid: false,
        trustPenalty: 10,
        reason: `Score/kill ratio ${scorePerKill.toFixed(0)} far exceeds max XP/kill (${MAX_XP_PER_KILL})`,
        severity: "info",
        validator: "behavioral",
      };
    }
  }

  return { valid: true, trustPenalty: 0, severity: "info", validator: "behavioral" };
}
```

**Step 4: Run to verify pass**

**Step 5: Commit**

```bash
git add apps/api/src/services/antiFraud.ts apps/api/src/services/antiFraud.test.ts
git commit -m "feat(api): implement behavioral validator with score/kill correlation"
```

---

### Task 6: Replay Detector

**Files:**

- Modify: `apps/api/src/services/antiFraud.ts` (add replay detection functions)
- Modify: `apps/api/src/services/antiFraud.test.ts` (add replay tests)

**Step 1: Write failing replay tests**

```typescript
import { generateSessionFingerprint, detectReplay } from "./antiFraud.js";

describe("Replay Detector", () => {
  it("generates deterministic fingerprints from heartbeat sequences", () => {
    const heartbeats = [
      { score: 100, wave: 1, kills: 10 },
      { score: 300, wave: 2, kills: 25 },
      { score: 600, wave: 3, kills: 50 },
    ];
    const a = generateSessionFingerprint(heartbeats);
    const b = generateSessionFingerprint(heartbeats);
    expect(a).toBe(b);
  });

  it("generates different fingerprints for different sequences", () => {
    const a = generateSessionFingerprint([{ score: 100, wave: 1, kills: 10 }]);
    const b = generateSessionFingerprint([{ score: 200, wave: 1, kills: 10 }]);
    expect(a).not.toBe(b);
  });

  it("detectReplay returns false when no previous fingerprints exist", async () => {
    // This test uses a mock Redis — returns empty
    const result = await detectReplay("player-1", "fingerprint-abc", {
      get: async () => null,
      setex: async () => "OK",
    } as any);
    expect(result).toBe(false);
  });

  it("detectReplay returns true when fingerprint matches stored", async () => {
    const mockRedis = {
      get: async () => JSON.stringify(["fingerprint-abc", "fingerprint-def"]),
      setex: async () => "OK",
    } as any;
    const result = await detectReplay("player-1", "fingerprint-abc", mockRedis);
    expect(result).toBe(true);
  });
});
```

**Step 2: Run to verify failure**

**Step 3: Implement replay detector**

Add to `antiFraud.ts`:

```typescript
import type Redis from "ioredis";

export function generateSessionFingerprint(
  heartbeats: Array<{ score: number; wave: number; kills: number }>
): string {
  const data = heartbeats.map((h) => `${h.score}:${h.wave}:${h.kills}`).join("|");
  return createHash("sha256").update(data).digest("hex").slice(0, 16);
}

export async function detectReplay(
  playerId: string,
  fingerprint: string,
  redis: Redis
): Promise<boolean> {
  const key = `replay:${playerId}`;
  const stored = await redis.get(key);
  const fingerprints: string[] = stored ? JSON.parse(stored) : [];

  if (fingerprints.includes(fingerprint)) {
    return true;
  }

  // Store new fingerprint (keep last 20, TTL 24h)
  fingerprints.push(fingerprint);
  if (fingerprints.length > 20) fingerprints.shift();
  await redis.setex(key, 86400, JSON.stringify(fingerprints));

  return false;
}
```

**Step 4: Run to verify pass**

**Step 5: Commit**

```bash
git add apps/api/src/services/antiFraud.ts apps/api/src/services/antiFraud.test.ts
git commit -m "feat(api): implement replay detector with session fingerprinting"
```

---

### Task 7: Ban System

**Files:**

- Modify: `apps/api/src/services/antiFraud.ts` (add ban functions)
- Modify: `apps/api/src/services/antiFraud.test.ts` (add ban tests)

**Step 1: Write failing ban tests**

```typescript
import { shouldBanPlayer, type PlayerFraudHistory } from "./antiFraud.js";

describe("Ban System", () => {
  it("returns no ban for clean history", () => {
    const history: PlayerFraudHistory = {
      flaggedSessionsLast24h: 0,
      flaggedSessionsLast7d: 0,
      currentBanUntil: null,
      banCount: 0,
    };
    const result = shouldBanPlayer(history);
    expect(result.shouldBan).toBe(false);
  });

  it("returns 24h ban for 3 flagged sessions in 24h", () => {
    const history: PlayerFraudHistory = {
      flaggedSessionsLast24h: 3,
      flaggedSessionsLast7d: 3,
      currentBanUntil: null,
      banCount: 0,
    };
    const result = shouldBanPlayer(history);
    expect(result.shouldBan).toBe(true);
    expect(result.banDurationHours).toBe(24);
  });

  it("returns 7-day ban for 5 flagged sessions in 7 days", () => {
    const history: PlayerFraudHistory = {
      flaggedSessionsLast24h: 1,
      flaggedSessionsLast7d: 5,
      currentBanUntil: null,
      banCount: 1,
    };
    const result = shouldBanPlayer(history);
    expect(result.shouldBan).toBe(true);
    expect(result.banDurationHours).toBe(168); // 7 days
  });

  it("does not re-ban if already banned", () => {
    const history: PlayerFraudHistory = {
      flaggedSessionsLast24h: 5,
      flaggedSessionsLast7d: 10,
      currentBanUntil: new Date(Date.now() + 3600000).toISOString(),
      banCount: 2,
    };
    const result = shouldBanPlayer(history);
    expect(result.shouldBan).toBe(false);
    expect(result.alreadyBanned).toBe(true);
  });
});
```

**Step 2: Run to verify failure**

**Step 3: Implement ban system**

Add to `antiFraud.ts`:

```typescript
export interface PlayerFraudHistory {
  flaggedSessionsLast24h: number;
  flaggedSessionsLast7d: number;
  currentBanUntil: string | null;
  banCount: number;
}

export interface BanDecision {
  shouldBan: boolean;
  banDurationHours?: number;
  alreadyBanned?: boolean;
  reason?: string;
}

export function shouldBanPlayer(history: PlayerFraudHistory): BanDecision {
  // Already banned
  if (history.currentBanUntil && new Date(history.currentBanUntil) > new Date()) {
    return { shouldBan: false, alreadyBanned: true };
  }

  // 5 flagged in 7 days → 7-day ban
  if (history.flaggedSessionsLast7d >= 5) {
    return {
      shouldBan: true,
      banDurationHours: 168,
      reason: `${history.flaggedSessionsLast7d} flagged sessions in 7 days`,
    };
  }

  // 3 flagged in 24h → 24h ban
  if (history.flaggedSessionsLast24h >= 3) {
    return {
      shouldBan: true,
      banDurationHours: 24,
      reason: `${history.flaggedSessionsLast24h} flagged sessions in 24 hours`,
    };
  }

  return { shouldBan: false };
}
```

**Step 4: Run to verify pass**

**Step 5: Commit**

```bash
git add apps/api/src/services/antiFraud.ts apps/api/src/services/antiFraud.test.ts
git commit -m "feat(api): implement ban system with escalating penalties"
```

---

### Task 8: Integrate Pipeline into Game Routes

**Files:**

- Modify: `apps/api/src/routes/game.ts` (wire up pipeline in heartbeat and session-end)
- Modify: `apps/api/src/lib/redis.ts` (add trust cache functions)
- Modify: `apps/api/src/routes/game.test.ts` (add integration tests)

**Step 1: Write failing integration tests**

Add to `game.test.ts` a new describe block:

```typescript
describe("Anti-Fraud Integration", () => {
  it("heartbeat response includes serverTime regardless of trust status (silent flagging)", async () => {
    // Set up mock for cached session with trust data
    const { getCachedSession } = await import("../lib/redis.js");
    (getCachedSession as any).mockResolvedValueOnce({
      playerId: testPlayerId,
      startedAt: new Date().toISOString(),
      lastHeartbeat: Date.now() - 30000,
      score: 100,
      wave: 1,
      kills: 10,
      trustScore: 100,
      checksumSecret: "test-secret",
      consecutiveChecksumFailures: 0,
      heartbeatCount: 1,
      sessionStartTime: Date.now() - 60000,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/game/session/heartbeat",
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        sessionId: testSessionId,
        score: 500,
        wave: 2,
        kills: 30,
        timestamp: Date.now(),
        checksum: "any-checksum",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("serverTime");
    // Response must NOT reveal trust status
    expect(body).not.toHaveProperty("trustScore");
    expect(body).not.toHaveProperty("flags");
  });
});
```

**Step 2: Run to verify failure (or current behavior)**

**Step 3: Wire up the pipeline**

Modify `apps/api/src/routes/game.ts`:

1. Import from antiFraud service
2. In session start: generate checksum secret, store with session cache, return to client
3. In heartbeat: build `HeartbeatData` and `SessionTrustData` from cache, call `runValidationPipeline()`, accumulate penalties, update trust in cache, store flags in DB
4. In session end: apply `getRewardMultiplier()` to reward calculation

Key changes to heartbeat handler (after line 112, replacing the TODO comments):

```typescript
// Run anti-fraud validation pipeline
const heartbeatData: HeartbeatData = {
  sessionId,
  playerId,
  score,
  wave,
  kills,
  timestamp,
  checksum,
};
const trustData: SessionTrustData = {
  trustScore: cachedSession.trustScore ?? 100,
  heartbeatCount: cachedSession.heartbeatCount ?? 1,
  lastHeartbeatTime: cachedSession.lastHeartbeat ?? Date.now(),
  lastScore: cachedSession.score ?? 0,
  lastWave: cachedSession.wave ?? 1,
  lastKills: cachedSession.kills ?? 0,
  checksumSecret: cachedSession.checksumSecret ?? "",
  consecutiveChecksumFailures: cachedSession.consecutiveChecksumFailures ?? 0,
  sessionStartTime: cachedSession.sessionStartTime ?? Date.now(),
};

const results = runValidationPipeline(heartbeatData, trustData);
const totalPenalty = results.reduce((sum, r) => sum + r.trustPenalty, 0);
const newTrustScore = Math.max(0, trustData.trustScore - totalPenalty);

// Store fraud flags for any violations (async, non-blocking)
const violations = results.filter((r) => !r.valid);
if (violations.length > 0) {
  for (const v of violations) {
    supabase.from("fraud_flags").insert({
      session_id: sessionId,
      player_id: playerId,
      validator: v.validator,
      severity: v.severity,
      penalty: v.trustPenalty,
      reason: v.reason || "Validation failed",
      heartbeat_index: trustData.heartbeatCount,
    });
  }
}
```

Key changes to session-end handler: multiply `vscReward` by `getRewardMultiplier(trustScore)`.

Key changes to session-start handler: add `checksumSecret`, `trustScore: 100`, `heartbeatCount: 0`, `sessionStartTime: Date.now()`, `consecutiveChecksumFailures: 0` to Redis cache. Return `checksumSecret` in response.

**Step 4: Run all API tests to verify pass**

Run: `pnpm --filter api test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add apps/api/src/routes/game.ts apps/api/src/lib/redis.ts apps/api/src/routes/game.test.ts
git commit -m "feat(api): integrate anti-fraud pipeline into game routes"
```

---

### Task 9: Client-Side Checksum

**Files:**

- Modify: `apps/web/src/hooks/useGameSession.ts` (add checksum computation)
- Modify: `apps/web/src/hooks/useGameSession.test.ts` (if exists, or create)

**Step 1: Write failing test for checksum computation**

Create or modify a test that verifies the hook produces valid checksums. Since this is a React hook, the simplest approach is to extract the checksum function as a standalone utility:

Create `apps/web/src/lib/checksum.ts`:

```typescript
export async function computeChecksum(
  sessionId: string,
  score: number,
  wave: number,
  kills: number,
  timestamp: number,
  secret: string
): Promise<string> {
  const payload = `${sessionId}${score}${wave}${kills}${timestamp}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

Create `apps/web/src/lib/checksum.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeChecksum } from "./checksum";

describe("computeChecksum", () => {
  it("produces deterministic output", async () => {
    const a = await computeChecksum("s1", 100, 2, 10, 1000, "secret");
    const b = await computeChecksum("s1", 100, 2, 10, 1000, "secret");
    expect(a).toBe(b);
  });

  it("changes with different inputs", async () => {
    const a = await computeChecksum("s1", 100, 2, 10, 1000, "secret");
    const b = await computeChecksum("s1", 200, 2, 10, 1000, "secret");
    expect(a).not.toBe(b);
  });

  it("returns hex string", async () => {
    const result = await computeChecksum("s1", 100, 2, 10, 1000, "secret");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

**Step 2: Run to verify failure**

**Step 3: Implement (create the file above)**

**Step 4: Run to verify pass**

**Step 5: Update `useGameSession.ts` to use the checksum**

Modify `sendHeartbeat` in `useGameSession.ts`:

- Store `checksumSecret` from session start response
- Import `computeChecksum` from `@lib/checksum`
- Replace the `checksum` parameter with auto-computed value

**Step 6: Commit**

```bash
git add apps/web/src/lib/checksum.ts apps/web/src/lib/checksum.test.ts apps/web/src/hooks/useGameSession.ts
git commit -m "feat(web): add client-side HMAC checksum for heartbeat integrity"
```

---

### Task 10: Update TASK_BREAKDOWN and Final Verification

**Files:**

- Modify: `docs/TASK_BREAKDOWN.md`

**Step 1: Run full test suite**

```bash
pnpm test
pnpm typecheck
pnpm format:check
```

All must pass.

**Step 2: Update TASK_BREAKDOWN.md**

- Mark anti-fraud validation subtask as complete in Phase 4
- Update SIWF as already complete (was already implemented)
- Update Phase 4 status to COMPLETE

**Step 3: Bump version**

```bash
npm version patch --no-git-tag-version
```

**Step 4: Commit everything**

```bash
git add docs/TASK_BREAKDOWN.md package.json
git commit -m "docs: mark Phase 4 complete — anti-fraud and SIWF done"
```

**Step 5: Push and create PR**

```bash
git push -u origin feature/anti-cheat-system
gh pr create --title "feat(api): full anti-cheat system with trust scoring and ban escalation" --body "..."
```

**Step 6: Wait for CI, merge if green**

---

## Summary

| Task      | What                                           | Tests         |
| --------- | ---------------------------------------------- | ------------- |
| 1         | Core types + pipeline orchestrator             | 7             |
| 2         | Checksum validator (HMAC-SHA256)               | 4             |
| 3         | Rate validator (kills/score/wave limits)       | 4             |
| 4         | Timing validator (intervals/duration)          | 3             |
| 5         | Behavioral validator (score-kill correlation)  | 3             |
| 6         | Replay detector (session fingerprinting)       | 4             |
| 7         | Ban system (escalating penalties)              | 4             |
| 8         | Route integration (wire pipeline into game.ts) | 1+            |
| 9         | Client-side checksum (Web Crypto HMAC)         | 3             |
| 10        | Task breakdown update + final verification     | —             |
| **Total** | **10 tasks**                                   | **~33 tests** |
