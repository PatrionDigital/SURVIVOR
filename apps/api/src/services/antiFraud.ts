import crypto from "node:crypto";

// ── Types ──

export type TrustStatus = "clean" | "suspicious" | "flagged" | "banned";
export type Severity = "info" | "warning" | "critical";

export interface ValidationResult {
  valid: boolean;
  trustPenalty: number;
  severity: Severity;
  validator: string;
  reason?: string;
}

export interface HeartbeatData {
  sessionId: string;
  playerId: string;
  score: number;
  wave: number;
  kills: number;
  timestamp: number;
  checksum: string;
  heartbeatCount: number;
}

export interface SessionTrustData {
  sessionId: string;
  walletAddress: string;
  trustScore: number;
  flags: FraudFlag[];
  previousHeartbeat: HeartbeatData | null;
  sessionStartTime: number;
  heartbeatCount: number;
}

export interface FraudFlag {
  validator: string;
  severity: Severity;
  reason: string;
  timestamp: number;
  penalty: number;
}

// ── Constants ──

const MAX_KILLS_PER_SECOND = 8;
const MAX_SCORE_PER_30S = 15_000;
const MIN_HEARTBEAT_INTERVAL_MS = 10_000;
const MAX_SESSION_DURATION_MS = 30 * 60 * 1000;
const MAX_XP_PER_KILL = 100;

// ── Trust Status ──

export function computeTrustStatus(score: number): TrustStatus {
  if (score >= 70) return "clean";
  if (score >= 40) return "suspicious";
  if (score >= 1) return "flagged";
  return "banned";
}

// ── Reward Multiplier ──

export function getRewardMultiplier(trustScore: number): number {
  const status = computeTrustStatus(trustScore);
  switch (status) {
    case "clean":
      return 1.0;
    case "suspicious":
      return 0.5;
    case "flagged":
    case "banned":
      return 0.0;
  }
}

// ── Checksum Functions ──

export function computeChecksumSecret(sessionId: string, walletAddress: string): string {
  return crypto
    .createHash("sha256")
    .update(`${sessionId}:${walletAddress}`)
    .digest("hex");
}

export function computeChecksum(
  sessionId: string,
  score: number,
  wave: number,
  kills: number,
  timestamp: number,
  secret: string,
): string {
  const data = `${sessionId}:${score}:${wave}:${kills}:${timestamp}`;
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

// ── Validators ──

function validateChecksum(
  heartbeat: HeartbeatData,
  trust: SessionTrustData,
): ValidationResult {
  const secret = computeChecksumSecret(heartbeat.sessionId, trust.walletAddress);
  const expected = computeChecksum(
    heartbeat.sessionId,
    heartbeat.score,
    heartbeat.wave,
    heartbeat.kills,
    heartbeat.timestamp,
    secret,
  );
  if (heartbeat.checksum !== expected) {
    return {
      valid: false,
      trustPenalty: 40,
      severity: "critical",
      validator: "checksum",
      reason: "Checksum mismatch",
    };
  }
  return { valid: true, trustPenalty: 0, severity: "info", validator: "checksum" };
}

function validateRates(
  heartbeat: HeartbeatData,
  trust: SessionTrustData,
): ValidationResult {
  if (heartbeat.heartbeatCount <= 1 || !trust.previousHeartbeat) {
    return { valid: true, trustPenalty: 0, severity: "info", validator: "rates" };
  }

  const prev = trust.previousHeartbeat;
  const elapsedMs = heartbeat.timestamp - prev.timestamp;
  const elapsedSec = Math.max(elapsedMs / 1000, 0.001);

  if (heartbeat.score < prev.score) {
    return {
      valid: false,
      trustPenalty: 20,
      severity: "warning",
      validator: "rates",
      reason: "Score decreased",
    };
  }

  const killDelta = heartbeat.kills - prev.kills;
  const killRate = killDelta / elapsedSec;
  if (killRate > MAX_KILLS_PER_SECOND * 3) {
    return {
      valid: false,
      trustPenalty: 60,
      severity: "critical",
      validator: "rates",
      reason: `Kill rate ${killRate.toFixed(1)}/s exceeds 3x maximum`,
    };
  }
  if (killRate > MAX_KILLS_PER_SECOND) {
    return {
      valid: false,
      trustPenalty: 20,
      severity: "warning",
      validator: "rates",
      reason: `Kill rate ${killRate.toFixed(1)}/s exceeds maximum`,
    };
  }

  const scoreDelta = heartbeat.score - prev.score;
  const scorePer30s = (scoreDelta / elapsedSec) * 30;
  if (scorePer30s > MAX_SCORE_PER_30S * 3) {
    return {
      valid: false,
      trustPenalty: 60,
      severity: "critical",
      validator: "rates",
      reason: `Score growth ${scorePer30s.toFixed(0)}/30s exceeds 3x maximum`,
    };
  }

  const waveJump = heartbeat.wave - prev.wave;
  if (waveJump > 1) {
    return {
      valid: false,
      trustPenalty: 20,
      severity: "warning",
      validator: "rates",
      reason: `Wave jumped by ${waveJump}`,
    };
  }

  return { valid: true, trustPenalty: 0, severity: "info", validator: "rates" };
}

function validateTiming(
  heartbeat: HeartbeatData,
  trust: SessionTrustData,
): ValidationResult {
  if (heartbeat.heartbeatCount <= 1 || !trust.previousHeartbeat) {
    return { valid: true, trustPenalty: 0, severity: "info", validator: "timing" };
  }

  const prev = trust.previousHeartbeat;
  const intervalMs = heartbeat.timestamp - prev.timestamp;

  if (intervalMs < MIN_HEARTBEAT_INTERVAL_MS) {
    return {
      valid: false,
      trustPenalty: 15,
      severity: "warning",
      validator: "timing",
      reason: `Heartbeat interval ${intervalMs}ms is below minimum ${MIN_HEARTBEAT_INTERVAL_MS}ms`,
    };
  }

  const sessionDurationMs = heartbeat.timestamp - trust.sessionStartTime;
  if (sessionDurationMs > MAX_SESSION_DURATION_MS) {
    return {
      valid: false,
      trustPenalty: 15,
      severity: "warning",
      validator: "timing",
      reason: `Session duration ${Math.round(sessionDurationMs / 60_000)}min exceeds maximum 30min`,
    };
  }

  return { valid: true, trustPenalty: 0, severity: "info", validator: "timing" };
}

function validateBehavior(
  heartbeat: HeartbeatData,
  trust: SessionTrustData,
): ValidationResult {
  // Skip for first two heartbeats
  if (heartbeat.heartbeatCount <= 2 || !trust.previousHeartbeat) {
    return { valid: true, trustPenalty: 0, severity: "info", validator: "behavior" };
  }

  const prev = trust.previousHeartbeat;

  // Kills decreasing
  if (heartbeat.kills < prev.kills) {
    return {
      valid: false,
      trustPenalty: 10,
      severity: "warning",
      validator: "behavior",
      reason: `Kills decreased from ${prev.kills} to ${heartbeat.kills}`,
    };
  }

  // Score/kill ratio check
  if (heartbeat.kills > 0) {
    const scorePerKill = heartbeat.score / heartbeat.kills;
    if (scorePerKill > MAX_XP_PER_KILL * 5) {
      return {
        valid: false,
        trustPenalty: 10,
        severity: "info",
        validator: "behavior",
        reason: `Score/kill ratio ${scorePerKill.toFixed(1)} exceeds maximum ${MAX_XP_PER_KILL * 5}`,
      };
    }
  }

  return { valid: true, trustPenalty: 0, severity: "info", validator: "behavior" };
}

// ── Pipeline Orchestrator ──

export async function runValidationPipeline(
  heartbeat: HeartbeatData,
  trust: SessionTrustData,
): Promise<ValidationResult[]> {
  return [
    validateChecksum(heartbeat, trust),
    validateRates(heartbeat, trust),
    validateTiming(heartbeat, trust),
    validateBehavior(heartbeat, trust),
  ];
}
