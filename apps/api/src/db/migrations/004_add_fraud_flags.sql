-- Migration 004: Add fraud_flags table for anti-cheat system
-- Stores validation violations detected by the anti-fraud pipeline

CREATE TABLE IF NOT EXISTS fraud_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    validator VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    penalty INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    heartbeat_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player ban tracking
CREATE TABLE IF NOT EXISTS player_bans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    banned_until TIMESTAMP WITH TIME ZONE NOT NULL,
    ban_count INTEGER NOT NULL DEFAULT 1
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fraud_flags_session ON fraud_flags(session_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_player ON fraud_flags(player_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_severity ON fraud_flags(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_created ON fraud_flags(created_at);
CREATE INDEX IF NOT EXISTS idx_player_bans_player ON player_bans(player_id);
CREATE INDEX IF NOT EXISTS idx_player_bans_until ON player_bans(banned_until);

-- Add trust_score column to game_sessions for final trust score at session end
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100;
