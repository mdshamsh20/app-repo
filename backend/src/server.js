import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDb } from "./db.js";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";

const app = express();

app.use(
  cors({
    origin: config.frontendUrl
  })
);
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      if (req.path === "/health") {
        return true;
      }

      if (req.method === "GET" && req.path === "/api/tasks") {
        return true;
      }

      return false;
    },
    handler: (_req, res) => {
      res.status(429).json({
        message: "Too many requests, please try again later."
      });
    }
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

await connectDb();

app.listen(config.port, () => {
  console.log(`Backend listening on ${config.port}`);
});
