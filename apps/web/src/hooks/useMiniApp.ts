import { useEffect, useState } from "react";
import sdk from "@farcaster/miniapp-sdk";

export interface MiniAppContext {
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
}

export interface UseMiniAppReturn {
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  context: MiniAppContext | null;
  isInMiniApp: boolean;
}

/**
 * Hook to initialize the Farcaster Mini App SDK
 * Must be called at the app root to signal the app is ready
 */
export function useMiniApp(): UseMiniAppReturn {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [context, setContext] = useState<MiniAppContext | null>(null);

  // Check if we're running inside a Farcaster client
  const isInMiniApp = typeof window !== "undefined" && !!window.parent && window.parent !== window;

  useEffect(() => {
    const initMiniApp = async () => {
      try {
        // If not in a mini app context, skip initialization
        if (!isInMiniApp) {
          setIsLoading(false);
          setIsReady(true);
          return;
        }

        // Get the context from the SDK
        const sdkContext = await sdk.context;

        if (sdkContext?.user) {
          setContext({
            user: {
              fid: sdkContext.user.fid,
              username: sdkContext.user.username,
              displayName: sdkContext.user.displayName,
              pfpUrl: sdkContext.user.pfpUrl,
            },
          });
        }

        // Signal to the Farcaster client that the app is ready
        await sdk.actions.ready();

        setIsReady(true);
      } catch (err) {
        console.error("Failed to initialize Mini App:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
        // Still mark as ready to allow fallback behavior
        setIsReady(true);
      } finally {
        setIsLoading(false);
      }
    };

    initMiniApp();
  }, [isInMiniApp]);

  return {
    isReady,
    isLoading,
    error,
    context,
    isInMiniApp,
  };
}
