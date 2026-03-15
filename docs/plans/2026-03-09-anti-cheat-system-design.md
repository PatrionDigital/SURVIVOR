# Anti-Cheat System Design

**Date:** 2026-03-09
**Status:** Approved
**Task:** Phase 4 — Anti-fraud validation (remaining backend task)

## Overview

A layered validation pipeline that runs on every heartbeat and session-end request. Independent validators each produce a trust penalty. Accumulated penalties reduce a session's trust score, which determines reward eligibility.

## Architecture

```
Heartbeat → [Checksum] → [Rate] → [Timing] → [Behavioral] → Trust Score → Accept/Flag/Reject
Session End → [All above] + [Replay Detector] → Final Trust → Reward Multiplier
```

### Core Types

```typescript
interface ValidationResult {
  valid: boolean;
  trustPenalty: number; // 0-100
  reason?: string;
  severity: "info" | "warning" | "critical";
}

interface SessionTrust {
  sessionId: string;
  trustScore: number; // Starts at 100
  flags: FraudFlag[];
  status: "clean" | "suspicious" | "flagged" | "banned";
}
```

### Trust Thresholds

| Score  | Status     | Reward Multiplier   |
| ------ | ---------- | ------------------- |
| 100-70 | clean      | 1.0x (full)         |
| 69-40  | suspicious | 0.5x                |
| 39-1   | flagged    | 0.0x                |
| 0      | banned     | Session invalidated |

## Validators

### 1. Checksum Validator

Client computes HMAC of game state each heartbeat:

```
checksum = HMAC-SHA256(sessionId + score + wave + kills + timestamp, secret)
secret = SHA256(sessionId + playerWallet)
```

Session-specific secret derived from `sessionId + playerWallet`. Not unbreakable but stops casual tampering. Server recomputes and compares.

**Penalty:** Mismatch = 40 (critical). Two consecutive = session invalidated.

### 2. Rate Validator

Validates that stats don't grow faster than theoretically possible.

| Metric                  | Max Rate       | Basis                             |
| ----------------------- | -------------- | --------------------------------- |
| Kills per second        | ~8             | 60 max enemies, 50ms min cooldown |
| Score per 30s heartbeat | ~15,000        | Max kill rate x max XP            |
| Wave per heartbeat      | 1              | Game mechanic limit               |
| Score direction         | Non-decreasing | Cannot lose score                 |

**Penalty:** Exceeding max = 20 (warning). 3x max = 60 (critical).

### 3. Timing Validator

Checks heartbeat intervals and session duration.

- Expected interval: ~30s, tolerance 15-90s
- Too fast (< 10s): suspicious (speed hack)
- Too slow (> 120s gap): potential manipulation
- Max session: 30 minutes (victory condition)

**Penalty:** Anomaly = 15 (warning).

### 4. Behavioral Validator

Pattern analysis across session heartbeat history.

- Score should correlate with kills x average XP value
- Kills should grow proportionally to time
- Wave progression should match session duration
- Checks for impossible stat combinations

**Penalty:** Anomaly = 10 (info/warning).

### 5. Replay Detector

Compares current session's heartbeat fingerprint against recent sessions from the same player. Detects identical or near-identical stat sequences.

Fingerprints stored in Redis with 24h TTL.

**Penalty:** Replay detected = 100 (immediate ban).

### 6. Ban System

Escalating penalties across sessions:

- 3 flagged sessions in 24h: temp ban (24h)
- 5 flagged sessions in 7 days: extended ban (7 days)
- Manual review queue for banned players

## Integration Points

### Session Start (`/api/game/session/start`)

- Generate checksum secret: `SHA256(sessionId + playerWallet)`
- Store in Redis with session cache
- Return secret to client
- Initialize trust score at 100

### Heartbeat (`/api/game/session/heartbeat`)

- Run validators 1-4 against heartbeat data
- Accumulate penalties, update trust in Redis
- Store flags in `fraud_flags` table
- Silent flagging: API response is identical regardless of trust status

### Session End (`/api/game/session/end`)

- Run all 5 validators (including replay detection)
- Apply reward multiplier based on final trust:
  - 100-70: 1.0x, 69-40: 0.5x, below 40: 0.0x
- Store session fingerprint for replay detection
- Update player's rolling fraud score

### Silent Flagging

The API never reveals flagging status to the client. Responses look identical. This prevents cheaters from knowing which validator caught them.

## Database Changes

### New table: `fraud_flags`

```sql
CREATE TABLE fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id),
  player_id UUID NOT NULL REFERENCES players(id),
  validator TEXT NOT NULL,
  severity TEXT NOT NULL,
  penalty INTEGER NOT NULL,
  reason TEXT NOT NULL,
  heartbeat_index INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New columns on `players` table

- `ban_until: TIMESTAMPTZ | NULL`
- `ban_count: INTEGER DEFAULT 0`
- `fraud_score: REAL DEFAULT 0` (rolling average across sessions)

## Files

| File                                      | Purpose                                |
| ----------------------------------------- | -------------------------------------- |
| `apps/api/src/services/antiFraud.ts`      | Pipeline orchestrator + all validators |
| `apps/api/src/services/antiFraud.test.ts` | Unit + integration tests               |
| `apps/web/src/hooks/useGameSession.ts`    | Add client-side checksum computation   |

## Testing Strategy

Each validator is a pure function — unit testable with crafted inputs.

- Legitimate play sessions pass clean
- Each cheat type triggers the correct validator
- Trust score accumulation works correctly
- Reward multiplier applied correctly
- Ban escalation logic
- Silent flagging (responses identical for clean vs flagged)
