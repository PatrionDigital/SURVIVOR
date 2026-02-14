import { test, expect } from "@playwright/test";

test.describe("Game Page", () => {
  test("should render game page with header and canvas", async ({ page }) => {
    await page.goto("/game");

    // Game header with title and back link
    await expect(page.getByRole("heading", { name: "Farcaster Survivors" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Back/ })).toBeVisible();

    // Canvas element should be present (PixiJS renders into a canvas)
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });
  });

  test("should render canvas with proper dimensions", async ({ page }) => {
    await page.goto("/game");

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    // Canvas should have non-zero dimensions
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test("should not show game overlays before game starts", async ({ page }) => {
    await page.goto("/game");

    // Wait for canvas to load
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });

    // Level-up modal should not be visible
    await expect(page.getByText("Level Up!")).not.toBeVisible();

    // Pause menu should not be visible
    await expect(page.getByText("Game Paused")).not.toBeVisible();
  });
});
