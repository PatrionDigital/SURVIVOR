import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { HomePage, GamePage, LeaderboardPage, ProfilePage, StakingPage, MarketPage } from "./pages";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "game",
        element: <GamePage />,
      },
      {
        path: "leaderboard",
        element: <LeaderboardPage />,
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "staking",
        element: <StakingPage />,
      },
      {
        path: "market",
        element: <MarketPage />,
      },
    ],
  },
]);
