import { useState, useCallback, useEffect } from "react";
import sdk from "@farcaster/miniapp-sdk";
import { useMiniApp } from "./useMiniApp";

export interface UseNotificationsReturn {
  isEnabled: boolean;
  isLoading: boolean;
  error: Error | null;
  requestPermission: () => Promise<boolean>;
  checkStatus: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isInMiniApp } = useMiniApp();

  // Check notification status on mount
  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkStatus = useCallback(async () => {
    if (!isInMiniApp) {
      // Not in mini app - notifications not available
      setIsEnabled(false);
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setIsEnabled(false);
        return;
      }

      const response = await fetch("/api/notifications/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsEnabled(data.registered);
      }
    } catch (err) {
      console.error("Failed to check notification status:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [isInMiniApp]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isInMiniApp) {
      setError(new Error("Notifications only available in Farcaster Mini App"));
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Generate a unique notification token
      // In production, this would come from the Farcaster SDK
      // For now, we use a combination of FID and a random string
      const context = await sdk.context;
      if (!context?.user?.fid) {
        throw new Error("Farcaster user context not available");
      }

      const tokenId = `fc_${context.user.fid}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const notificationToken = tokenId;

      // Send token to backend
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/notifications/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          token: notificationToken,
          platform: "farcaster",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to register notification token");
      }

      setIsEnabled(true);
      return true;
    } catch (err) {
      console.error("Failed to request notification permission:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInMiniApp]);

  return {
    isEnabled,
    isLoading,
    error,
    requestPermission,
    checkStatus,
  };
}
