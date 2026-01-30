import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RouterProvider } from "react-router-dom";
import { AuthKitProvider } from "@farcaster/auth-kit";
import "@farcaster/auth-kit/styles.css";
import { config } from "@/lib/wagmi";
import { authKitConfig } from "@/lib/authKit";
import { router } from "./router";

const queryClient = new QueryClient();

function App() {
  return (
    <AuthKitProvider config={authKitConfig}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </WagmiProvider>
    </AuthKitProvider>
  );
}

export default App;
