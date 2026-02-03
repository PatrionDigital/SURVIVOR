import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";

// Redis connection for BullMQ
const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

// Notification job data types
export interface LeaderboardNotificationData {
  playerId: string;
  rank: number;
  period: "daily" | "weekly" | "all_time";
}

export interface MaintenanceWarningData {
  playerId: string;
  maintenancePercentage: number;
  threshold: number;
}

// Create notification queue
export const notificationQueue = new Queue("notifications", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

/**
 * Helper function to send Farcaster notification
 * @param url - The notification URL from Farcaster webhook
 * @param token - The notification token
 * @param notificationId - Unique ID for deduplication (valid 24h)
 * @param title - Notification title (max 32 chars)
 * @param body - Notification body (max 128 chars)
 * @param targetUrl - URL to open when notification is clicked (max 1024 chars)
 * @returns Object with success status and token categorization
 */
async function sendFarcasterNotification(
  url: string,
  token: string,
  notificationId: string,
  title: string,
  body: string,
  targetUrl: string
): Promise<{ success: boolean; invalidTokens?: string[] }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId,
        title: title.slice(0, 32), // Enforce max length
        body: body.slice(0, 128), // Enforce max length
        targetUrl: targetUrl.slice(0, 1024), // Enforce max length
        tokens: [token],
      }),
    });

    if (!response.ok) {
      console.error(`[Notification] Failed to send: ${response.status} ${response.statusText}`);
      return { success: false };
    }

    const responseData = (await response.json()) as {
      result?: {
        successfulTokens?: string[];
        invalidTokens?: string[];
        rateLimitedTokens?: string[];
      };
      successfulTokens?: string[];
      invalidTokens?: string[];
      rateLimitedTokens?: string[];
    };
    // Handle nested result format from Farcaster API
    const result = responseData.result || responseData;

    const { successfulTokens, invalidTokens, rateLimitedTokens } = result;

    if (invalidTokens && invalidTokens.length > 0) {
      console.warn(`[Notification] Invalid tokens:`, invalidTokens);
      return { success: false, invalidTokens };
    }

    if (rateLimitedTokens && rateLimitedTokens.length > 0) {
      console.warn(`[Notification] Rate limited tokens:`, rateLimitedTokens);
      return { success: false };
    }

    if (successfulTokens && successfulTokens.length > 0) {
      console.log(`[Notification] Successfully sent to ${successfulTokens.length} tokens`);
      return { success: true };
    }

    return { success: false };
  } catch (error) {
    console.error("[Notification] Failed to send Farcaster notification:", error);
    return { success: false };
  }
}

// Worker for processing notification jobs
export const notificationWorker = new Worker(
  "notifications",
  async (job: Job) => {
    const { type } = job.data;

    switch (type) {
      case "leaderboard":
        return await processLeaderboardNotification(job);
      case "maintenance":
        return await processMaintenanceNotification(job);
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

// Process leaderboard notification
async function processLeaderboardNotification(job: Job<LeaderboardNotificationData>) {
  const { playerId, rank, period } = job.data;

  // Import here to avoid circular dependencies
  const { getNotificationToken } = await import("../db/queries.js");

  // Get notification token
  const tokenData = await getNotificationToken(playerId);
  if (!tokenData || !tokenData.token || !tokenData.url) {
    console.log(`No notification token or URL for player ${playerId}`);
    return { success: false, reason: "no_token" };
  }

  // Format title and body based on rank and period
  const periodLabel = period === "all_time" ? "all-time" : period;
  const title = "Leaderboard Update";
  let body = "";

  if (rank === 1) {
    body = `🏆 You're #1 on the ${periodLabel} leaderboard!`;
  } else if (rank <= 3) {
    body = `🥉 You're #${rank} on the ${periodLabel} leaderboard!`;
  } else if (rank <= 10) {
    body = `⭐ You're #${rank} on the ${periodLabel} leaderboard!`;
  } else {
    body = `📊 You're #${rank} on the ${periodLabel} leaderboard!`;
  }

  // Create unique notification ID for deduplication (valid 24h)
  const today = new Date().toISOString().split("T")[0];
  const notificationId = `leaderboard-${period}-${today}-${playerId}`;

  // Target URL - link to leaderboard
  const targetUrl = process.env.APP_URL || "https://survivors.farcaster.xyz";

  // Send notification
  const result = await sendFarcasterNotification(
    tokenData.url,
    tokenData.token,
    notificationId,
    title,
    body,
    targetUrl
  );

  // Clean up invalid tokens
  if (result.invalidTokens && result.invalidTokens.length > 0) {
    const { saveNotificationToken } = await import("../db/queries.js");
    await saveNotificationToken(playerId, "", null, "farcaster");
  }

  return { success: result.success, playerId, rank, period };
}

// Process maintenance warning notification
async function processMaintenanceNotification(job: Job<MaintenanceWarningData>) {
  const { playerId, maintenancePercentage, threshold } = job.data;

  // Import here to avoid circular dependencies
  const { getNotificationToken } = await import("../db/queries.js");

  // Get notification token
  const tokenData = await getNotificationToken(playerId);
  if (!tokenData || !tokenData.token || !tokenData.url) {
    console.log(`No notification token or URL for player ${playerId}`);
    return { success: false, reason: "no_token" };
  }

  // Format title and body
  const title = "⚠️ Maintenance Warning";
  const body = `Maintenance at ${maintenancePercentage.toFixed(0)}% (threshold: ${threshold.toFixed(0)}%). Top up to keep gear bonuses!`;

  // Create unique notification ID for deduplication (valid 24h)
  const timestamp = Date.now();
  const notificationId = `maintenance-${timestamp}-${playerId}`;

  // Target URL - link to maintenance page
  const targetUrl = process.env.APP_URL || "https://survivors.farcaster.xyz";

  // Send notification
  const result = await sendFarcasterNotification(
    tokenData.url,
    tokenData.token,
    notificationId,
    title,
    body,
    targetUrl
  );

  // Clean up invalid tokens
  if (result.invalidTokens && result.invalidTokens.length > 0) {
    const { saveNotificationToken } = await import("../db/queries.js");
    await saveNotificationToken(playerId, "", null, "farcaster");
  }

  return { success: result.success, playerId, maintenancePercentage };
}

// Worker event handlers
notificationWorker.on("completed", (job) => {
  console.log(`[Notification] Job ${job.id} completed:`, job.returnvalue);
});

notificationWorker.on("failed", (job, err) => {
  console.error(`[Notification] Job ${job?.id} failed:`, err);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing notification worker...");
  await notificationWorker.close();
  await connection.quit();
});
