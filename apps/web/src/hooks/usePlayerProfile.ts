import { useState, useEffect, useCallback } from "react";

export interface PlayerStats {
  totalGamesPlayed: number;
  totalVscEarned: string;
  highestWave: number;
  highestScore: number;
}

export interface PlayerProfile {
  id: string;
  walletAddress: string;
  farcasterFid: number | null;
  farcasterUsername: string | null;
  createdAt: string;
  lastPlayedAt: string | null;
  stats: PlayerStats;
}

export interface GameSession {
  id: string;
  status: "active" | "completed" | "abandoned";
  final_score: number | null;
  final_wave: number | null;
  total_kills: number | null;
  started_at: string;
  ended_at: string | null;
}

export interface UsePlayerProfileReturn {
  profile: PlayerProfile | null;
  sessions: GameSession[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePlayerProfile(): UsePlayerProfileReturn {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get authentication token from localStorage
      const session = localStorage.getItem("farcaster_survivors_siwf_session");
      if (!session) {
        throw new Error("Not authenticated");
      }

      const { token } = JSON.parse(session);
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Fetch profile and sessions in parallel
      const [profileRes, sessionsRes] = await Promise.all([
        fetch("/api/player/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/player/sessions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!profileRes.ok) {
        throw new Error(`Failed to fetch profile: ${profileRes.statusText}`);
      }

      if (!sessionsRes.ok) {
        throw new Error(`Failed to fetch sessions: ${sessionsRes.statusText}`);
      }

      const profileData = await profileRes.json();
      const sessionsData = await sessionsRes.json();

      setProfile(profileData);
      setSessions(sessionsData.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      console.error("Failed to fetch player profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    sessions,
    isLoading,
    error,
    refetch: fetchProfile,
  };
}
