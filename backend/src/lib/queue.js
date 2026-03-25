import Redis from "ioredis";
import { config } from "../config.js";

export const queueName = "ai-tasks";

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 2
});

export async function enqueueTaskJob(data) {
  await redis.lpush(queueName, JSON.stringify(data));
}
