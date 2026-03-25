import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri:
    process.env.MONGO_URI || "mongodb://mongo:27017/ai-task-platform",
  redisUrl: process.env.REDIS_URL || "redis://redis:6379",
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173"
};

