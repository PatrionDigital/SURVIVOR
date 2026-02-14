import { test, expect } from "@playwright/test";

test.describe("Full User Flow", () => {
  test("should navigate from home to game and back", async ({ page }) => {
    // Start at home
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Farcaster Survivors" })).toBeVisible();

    // Navigate to game
    await page.getByRole("link", { name: "Play Now" }).click();
    await expect(page).toHaveURL("/game");

    // Wait for game canvas to render
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });

    // Navigate back to home
    await page.getByRole("link", { name: /Back/ }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Farcaster Survivors" })).toBeVisible();
  });

  test("should navigate through all main pages via header nav", async ({ page }) => {
    await page.goto("/");

    const routes = [
      { name: "Play", url: "/game" },
      { name: "Leaderboard", url: "/leaderboard" },
      { name: "Market", url: "/market" },
      { name: "Staking", url: "/staking" },
      { name: "Profile", url: "/profile" },
      { name: "Home", url: "/" },
    ];

    for (const route of routes) {
      // Click the desktop nav link in the header
      await page.locator("header").getByRole("link", { name: route.name }).first().click();
      await expect(page).toHaveURL(route.url);
    }
  });

  test("should preserve page state during navigation cycle", async ({ page }) => {
    // Visit leaderboard
    await page.goto("/leaderboard");
    const leaderboardUrl = page.url();

    // Navigate to market
    await page.locator("header").getByRole("link", { name: "Market" }).first().click();
    await expect(page).toHaveURL("/market");

    // Use browser back to return to leaderboard
    await page.goBack();
    expect(page.url()).toBe(leaderboardUrl);
  });

  test("should render game page with all expected UI regions", async ({ page }) => {
    await page.goto("/game");

    // Game header bar with back link and title
    await expect(page.getByRole("link", { name: /Back/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Farcaster Survivors" })).toBeVisible();

    // Canvas area
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });
  });

  test("should handle direct URL navigation to each page", async ({ page }) => {
    // Direct URL to leaderboard
    await page.goto("/leaderboard");
    await expect(page.locator("header")).toBeVisible();

    // Direct URL to market
    await page.goto("/market");
    await expect(page.locator("header")).toBeVisible();

    // Direct URL to staking
    await page.goto("/staking");
    await expect(page.locator("header")).toBeVisible();

    // Direct URL to profile
    await page.goto("/profile");
    await expect(page.locator("header")).toBeVisible();

    // Direct URL to game
    await page.goto("/game");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });
  });
});
