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

// ── Validators (stubs for Task 1, replaced in Tasks 2-5) ──

function validateChecksum(
  _heartbeat: HeartbeatData,
  _trust: SessionTrustData,
): ValidationResult {
  return { valid: true, trustPenalty: 0, severity: "info", validator: "checksum" };
}

function validateRates(
  _heartbeat: HeartbeatData,
  _trust: SessionTrustData,
): ValidationResult {
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

// Keep crypto import used (will be needed in Task 2+)
void crypto;
