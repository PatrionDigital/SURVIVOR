/**
 * SIWF Auth Provider with localStorage persistence
 *
 * Auth-kit doesn't persist sessions across page refreshes.
 * This provider wraps AuthKitProvider and adds localStorage persistence.
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { AuthKitProvider, useProfile } from "@farcaster/auth-kit";
import "@farcaster/auth-kit/styles.css";
import { authKitConfig } from "./authKit";

const SIWF_STORAGE_KEY = "farcaster_survivors_siwf_session";

export interface SiwfUser {
  fid: number;
  username: string | null;
  displayName: string | null;
  pfpUrl: string | null;
  custody: `0x${string}` | null;
}

interface SiwfAuthContextValue {
  user: SiwfUser | null;
  isAuthenticated: boolean;
  signOut: () => void;
}

const SiwfAuthContext = createContext<SiwfAuthContextValue>({
  user: null,
  isAuthenticated: false,
  signOut: () => {},
});

// Helper to safely access localStorage
function getStoredUser(): SiwfUser | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SIWF_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as SiwfUser;
    }
  } catch {
    localStorage.removeItem(SIWF_STORAGE_KEY);
  }
  return null;
}

function saveUser(user: SiwfUser): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIWF_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Storage full or other error
  }
}

function clearUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SIWF_STORAGE_KEY);
}

/**
 * Inner provider that has access to auth-kit hooks
 */
function SiwfAuthInner({ children }: { children: ReactNode }) {
  // State from localStorage (restored on mount)
  const [storedUser, setStoredUser] = useState<SiwfUser | null>(() => getStoredUser());

  // Auth-kit's profile hook (only valid during current session)
  const { isAuthenticated: authKitAuthenticated, profile } = useProfile();

  // Sync auth-kit state to localStorage when sign-in completes
  useEffect(() => {
    if (authKitAuthenticated && profile?.fid) {
      const user: SiwfUser = {
        fid: profile.fid,
        username: profile.username ?? null,
        displayName: profile.displayName ?? null,
        pfpUrl: profile.pfpUrl ?? null,
        custody: (profile.custody as `0x${string}`) ?? null,
      };
      saveUser(user);
      setStoredUser(user);
    }
  }, [authKitAuthenticated, profile]);

  // Sign out clears both auth-kit state and localStorage
  const signOut = useCallback(() => {
    clearUser();
    setStoredUser(null);
    // Note: auth-kit's signOut is called separately in useWallet
  }, []);

  // Use auth-kit state if available, otherwise fall back to stored state
  const user: SiwfUser | null =
    authKitAuthenticated && profile?.fid
      ? {
          fid: profile.fid,
          username: profile.username ?? null,
          displayName: profile.displayName ?? null,
          pfpUrl: profile.pfpUrl ?? null,
          custody: (profile.custody as `0x${string}`) ?? null,
        }
      : storedUser;

  const isAuthenticated = authKitAuthenticated || storedUser !== null;

  return (
    <SiwfAuthContext.Provider value={{ user, isAuthenticated, signOut }}>
      {children}
    </SiwfAuthContext.Provider>
  );
}

/**
 * Main provider that wraps AuthKitProvider
 */
export function SiwfAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthKitProvider config={authKitConfig}>
      <SiwfAuthInner>{children}</SiwfAuthInner>
    </AuthKitProvider>
  );
}

/**
 * Hook to access SIWF authentication state with persistence
 */
export function useSiwfAuth() {
  return useContext(SiwfAuthContext);
}
