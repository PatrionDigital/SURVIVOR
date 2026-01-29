import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gray-900 text-white">
          <header className="p-4 text-center">
            <h1 className="text-2xl font-bold text-primary-500">
              Farcaster Survivors
            </h1>
            <p className="text-gray-400">Loading...</p>
          </header>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
