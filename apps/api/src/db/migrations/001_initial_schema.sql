-- Farcaster Survivors - Initial Database Schema
-- This file is automatically run on first PostgreSQL container startup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) NOT NULL UNIQUE,
    farcaster_fid INTEGER UNIQUE,
    farcaster_username VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_played_at TIMESTAMP WITH TIME ZONE,
    total_games_played INTEGER DEFAULT 0,
    total_vsc_earned NUMERIC(78, 0) DEFAULT 0,
    highest_wave INTEGER DEFAULT 0,
    highest_score BIGINT DEFAULT 0
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'invalid')),
    final_score BIGINT DEFAULT 0,
    final_wave INTEGER DEFAULT 0,
    total_kills INTEGER DEFAULT 0,
    damage_dealt BIGINT DEFAULT 0,
    damage_taken BIGINT DEFAULT 0,
    xp_earned BIGINT DEFAULT 0,
    vsc_reward NUMERIC(78, 0) DEFAULT 0,
    reward_claimed BOOLEAN DEFAULT FALSE,
    reward_signature VARCHAR(132),
    reward_nonce VARCHAR(66),
    gear_snapshot JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session heartbeats for anti-fraud
CREATE TABLE IF NOT EXISTS session_heartbeats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    score BIGINT NOT NULL,
    wave INTEGER NOT NULL,
    kills INTEGER NOT NULL,
    timestamp BIGINT NOT NULL,
    checksum VARCHAR(66) NOT NULL,
    server_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_valid BOOLEAN DEFAULT TRUE
);

-- Daily rewards tracking
CREATE TABLE IF NOT EXISTS daily_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_vsc_earned NUMERIC(78, 0) DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, date)
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    UNIQUE(player_id, achievement_type)
);

-- Leaderboard entries (materialized for performance)
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'all_time')),
    period_start DATE NOT NULL,
    score BIGINT NOT NULL,
    wave INTEGER NOT NULL,
    rank INTEGER,
    session_id UUID REFERENCES game_sessions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, period, period_start)
);

-- Claim nonces for replay protection
CREATE TABLE IF NOT EXISTS claim_nonces (
    nonce VARCHAR(66) PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    session_id UUID REFERENCES game_sessions(id),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification tokens for Farcaster notifications
CREATE TABLE IF NOT EXISTS notification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) DEFAULT 'farcaster',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, platform)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_players_wallet ON players(wallet_address);
CREATE INDEX IF NOT EXISTS idx_players_fid ON players(farcaster_fid);
CREATE INDEX IF NOT EXISTS idx_sessions_player ON game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON game_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_heartbeats_session ON session_heartbeats(session_id);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_player_date ON daily_rewards(player_id, date);
CREATE INDEX IF NOT EXISTS idx_leaderboard_period_score ON leaderboard_entries(period, period_start, score DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to players table
DROP TRIGGER IF EXISTS update_players_updated_at ON players;
CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to notification_tokens table
DROP TRIGGER IF EXISTS update_notification_tokens_updated_at ON notification_tokens;
CREATE TRIGGER update_notification_tokens_updated_at
    BEFORE UPDATE ON notification_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
