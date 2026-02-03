-- Add URL field to notification_tokens table for Farcaster notification endpoint

ALTER TABLE notification_tokens
ADD COLUMN IF NOT EXISTS url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_tokens_player_platform ON notification_tokens(player_id, platform);
