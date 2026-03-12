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
  // Skip for first heartbeat
  if (heartbeat.heartbeatCount <= 1 || !trust.previousHeartbeat) {
    return { valid: true, trustPenalty: 0, severity: "info", validator: "rates" };
  }

  const prev = trust.previousHeartbeat;
  const elapsedMs = heartbeat.timestamp - prev.timestamp;
  const elapsedSec = Math.max(elapsedMs / 1000, 0.001); // avoid division by zero

  // Score must not decrease
  if (heartbeat.score < prev.score) {
    return {
      valid: false,
      trustPenalty: 20,
      severity: "warning",
      validator: "rates",
      reason: "Score decreased",
    };
  }

  // Kill rate check
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

  // Score growth per 30s
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

  // Wave jump > 1
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
  _heartbeat: HeartbeatData,
  _trust: SessionTrustData,
): ValidationResult {
  return { valid: true, trustPenalty: 0, severity: "info", validator: "timing" };
}

function validateBehavior(
  _heartbeat: HeartbeatData,
  _trust: SessionTrustData,
): ValidationResult {
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
