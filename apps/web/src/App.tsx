import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RouterProvider } from "react-router-dom";
import { SiwfAuthProvider } from "@/lib/siwfAuth";
import { config } from "@/lib/wagmi";
import { router } from "./router";

const queryClient = new QueryClient();

function App() {
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
