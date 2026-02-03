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

// Helper function to send Farcaster notification
async function sendFarcasterNotification(token: string, message: string): Promise<boolean> {
  try {
    // TODO: Implement actual Farcaster notification API call
    // For now, just log the notification
    console.log(`[Notification] Token: ${token.slice(0, 10)}..., Message: ${message}`);

    // In production, this would call the Farcaster notification API
    // Example: POST to Farcaster notification endpoint with token and message
    /*
    const response = await fetch('https://api.warpcast.com/v2/notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FARCASTER_API_KEY}`
      },
      body: JSON.stringify({
        token,
        message,
        url: process.env.APP_URL
      })
    });

    return response.ok;
    */

    return true;
  } catch (error) {
    console.error("Failed to send Farcaster notification:", error);
    return false;
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
  if (!tokenData || !tokenData.token) {
    console.log(`No notification token for player ${playerId}`);
    return { success: false, reason: "no_token" };
  }

  // Format message based on rank and period
  let message = "";
  const periodLabel = period === "all_time" ? "all-time" : period;

  if (rank === 1) {
    message = `🏆 You're #1 on the ${periodLabel} leaderboard! Keep it up!`;
  } else if (rank <= 3) {
    message = `🥉 You're #${rank} on the ${periodLabel} leaderboard! So close to the top!`;
  } else if (rank <= 10) {
    message = `⭐ You're #${rank} on the ${periodLabel} leaderboard! You're in the top 10!`;
  } else {
    message = `📊 You're #${rank} on the ${periodLabel} leaderboard! Keep climbing!`;
  }

  // Send notification
  const success = await sendFarcasterNotification(tokenData.token, message);

  return { success, playerId, rank, period };
}

// Process maintenance warning notification
async function processMaintenanceNotification(job: Job<MaintenanceWarningData>) {
  const { playerId, maintenancePercentage, threshold } = job.data;

  // Import here to avoid circular dependencies
  const { getNotificationToken } = await import("../db/queries.js");

  // Get notification token
  const tokenData = await getNotificationToken(playerId);
  if (!tokenData || !tokenData.token) {
    console.log(`No notification token for player ${playerId}`);
    return { success: false, reason: "no_token" };
  }

  // Format warning message
  const message = `⚠️ Maintenance Warning: Your maintenance is at ${maintenancePercentage.toFixed(0)}% (threshold: ${threshold.toFixed(0)}%). Top up your maintenance pool to keep your gear bonuses active!`;

  // Send notification
  const success = await sendFarcasterNotification(tokenData.token, message);

  return { success, playerId, maintenancePercentage };
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
