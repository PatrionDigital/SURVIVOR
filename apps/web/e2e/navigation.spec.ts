import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should load the home page with title and navigation links", async ({ page }) => {
    await page.goto("/");

    // Verify page title
    await expect(page).toHaveTitle("Farcaster Survivors");

    // Verify main heading
    await expect(page.getByRole("heading", { name: "Farcaster Survivors" })).toBeVisible();

    // Verify description text
    await expect(page.getByText("crypto-native bullet heaven game")).toBeVisible();

    // Verify main action buttons
    await expect(page.getByRole("link", { name: "Play Now" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Leaderboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Gear Staking" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Gear Market" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
  });

  test("should have a header with desktop navigation links", async ({ page }) => {
    await page.goto("/");

    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Desktop nav links
    await expect(header.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Play" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Leaderboard" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Market" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Staking" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Profile" })).toBeVisible();
  });

  test("should have a footer with chain info", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByText("Built on Base L2")).toBeVisible();
  });

  test("should navigate to game page via Play Now button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Play Now" }).click();
    await expect(page).toHaveURL("/game");
  });

  test("should navigate to leaderboard page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Leaderboard" }).click();
    await expect(page).toHaveURL("/leaderboard");
  });

  test("should navigate to staking page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Gear Staking" }).click();
    await expect(page).toHaveURL("/staking");
  });

  test("should navigate to market page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Gear Market" }).click();
    await expect(page).toHaveURL("/market");
  });

  test("should navigate to profile page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL("/profile");
  });

  test("should navigate back to home from game page", async ({ page }) => {
    await page.goto("/game");
    await page.getByRole("link", { name: /Back/ }).click();
    await expect(page).toHaveURL("/");
  });

  test("should highlight active navigation item", async ({ page }) => {
    await page.goto("/leaderboard");

    // The active nav item should have the primary color class
    const activeLink = page.locator('header nav a[href="/leaderboard"]').first();
    await expect(activeLink).toHaveClass(/bg-primary-600/);
  });
});
