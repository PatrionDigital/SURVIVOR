-- Migration 002: Add RPC functions and schema enhancements
-- This migration adds the update_player_stats function and other missing schema elements

-- Add missing columns to game_sessions for full spec compliance
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS survival_time INTEGER,
ADD COLUMN IF NOT EXISTS level_reached INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS reward_expiry TIMESTAMP WITH TIME ZONE;

-- Function: update_player_stats
-- Called when a game session ends to update player aggregate statistics
CREATE OR REPLACE FUNCTION update_player_stats(
    p_player_id UUID,
    p_score BIGINT,
    p_wave INTEGER,
    p_vsc NUMERIC(78, 0)
)
RETURNS VOID AS $$
BEGIN
    UPDATE players
    SET
        total_games_played = total_games_played + 1,
        total_vsc_earned = total_vsc_earned + COALESCE(p_vsc, 0),
        highest_wave = GREATEST(highest_wave, COALESCE(p_wave, 0)),
        highest_score = GREATEST(highest_score, COALESCE(p_score, 0)),
        last_played_at = NOW(),
        updated_at = NOW()
    WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql;

-- Function: get_player_rank
-- Returns the rank of a player for a given period
CREATE OR REPLACE FUNCTION get_player_rank(
    p_player_id UUID,
    p_period VARCHAR(20)
)
RETURNS INTEGER AS $$
DECLARE
    player_rank INTEGER;
BEGIN
    SELECT rank INTO player_rank
    FROM leaderboard_entries
    WHERE player_id = p_player_id
      AND period = p_period
      AND period_start = (
          SELECT MAX(period_start)
          FROM leaderboard_entries
          WHERE period = p_period
      )
    LIMIT 1;

    RETURN COALESCE(player_rank, 0);
END;
$$ LANGUAGE plpgsql;

-- Function: get_daily_rewards_summary
-- Returns the total rewards claimed by a player today
CREATE OR REPLACE FUNCTION get_daily_rewards_summary(
    p_player_id UUID
)
RETURNS TABLE (
    total_earned NUMERIC(78, 0),
    games_played INTEGER,
    remaining_cap NUMERIC(78, 0)
) AS $$
DECLARE
    daily_cap NUMERIC(78, 0) := 10000 * POWER(10, 18); -- 10,000 VSC in wei
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(dr.total_vsc_earned, 0::NUMERIC(78, 0)) as total_earned,
        COALESCE(dr.games_played, 0) as games_played,
        GREATEST(0::NUMERIC(78, 0), daily_cap - COALESCE(dr.total_vsc_earned, 0::NUMERIC(78, 0))) as remaining_cap
    FROM players p
    LEFT JOIN daily_rewards dr ON dr.player_id = p.id AND dr.date = CURRENT_DATE
    WHERE p.id = p_player_id;
END;
$$ LANGUAGE plpgsql;

-- Function: record_daily_reward
-- Records a reward earned by a player for today
CREATE OR REPLACE FUNCTION record_daily_reward(
    p_player_id UUID,
    p_vsc_amount NUMERIC(78, 0)
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO daily_rewards (player_id, date, total_vsc_earned, games_played)
    VALUES (p_player_id, CURRENT_DATE, p_vsc_amount, 1)
    ON CONFLICT (player_id, date)
    DO UPDATE SET
        total_vsc_earned = daily_rewards.total_vsc_earned + EXCLUDED.total_vsc_earned,
        games_played = daily_rewards.games_played + 1;
END;
$$ LANGUAGE plpgsql;

-- Function: check_nonce_used
-- Checks if a nonce has already been used (for replay protection)
CREATE OR REPLACE FUNCTION check_nonce_used(
    p_nonce VARCHAR(66)
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM claim_nonces WHERE nonce = p_nonce
    );
END;
$$ LANGUAGE plpgsql;

-- Function: use_nonce
-- Marks a nonce as used
CREATE OR REPLACE FUNCTION use_nonce(
    p_nonce VARCHAR(66),
    p_player_id UUID,
    p_session_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if already used
    IF EXISTS (SELECT 1 FROM claim_nonces WHERE nonce = p_nonce) THEN
        RETURN FALSE;
    END IF;

    -- Insert nonce
    INSERT INTO claim_nonces (nonce, player_id, session_id)
    VALUES (p_nonce, p_player_id, p_session_id);

    RETURN TRUE;
EXCEPTION
    WHEN unique_violation THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Add index for expired sessions cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_ended_unclaimed
    ON game_sessions(ended_at)
    WHERE reward_claimed = FALSE AND status = 'completed';

-- Add index for finding active sessions
CREATE INDEX IF NOT EXISTS idx_sessions_player_active
    ON game_sessions(player_id)
    WHERE status = 'active';
