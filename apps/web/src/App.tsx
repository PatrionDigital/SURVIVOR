import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RouterProvider } from "react-router-dom";
import { SiwfAuthProvider } from "@/lib/siwfAuth";
import { config, isLocalDev } from "@/lib/wagmi";
import { router } from "./router";

const queryClient = new QueryClient();

// Expose queryClient for dev tools
if (isLocalDev) {
  (window as unknown as { __queryClient: QueryClient }).__queryClient = queryClient;
}

/**
 * Dev-only hook to add keyboard shortcut for cache refresh
 * Press Ctrl+Shift+R to invalidate all queries and refetch
 */
function useDevCacheRefresh() {
  useEffect(() => {
    if (!isLocalDev) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+R (or Cmd+Shift+R on Mac) to refresh contract data
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "R") {
        e.preventDefault();
        console.log("[Dev] Invalidating all queries and refetching...");
        queryClient.invalidateQueries();
        queryClient.refetchQueries();
        console.log("[Dev] Cache invalidated, refetching data");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

function App() {
  useDevCacheRefresh();

  return (
    <SiwfAuthProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </WagmiProvider>
    </SiwfAuthProvider>
  );
}

export default App;
