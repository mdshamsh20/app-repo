import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { Task } from "../models/Task.js";
import { enqueueTaskJob } from "../lib/queue.js";

const router = express.Router();
const allowedOperations = new Set(["uppercase", "lowercase", "reverse", "word_count"]);

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const tasks = await Task.find({ userId: req.user.sub }).sort({ createdAt: -1 });
  return res.json(tasks);
});

router.post("/", async (req, res) => {
  const title = req.body.title?.trim();
  const inputText = req.body.inputText?.trim();
  const operation = req.body.operation;

  if (!title || !inputText || !operation) {
    return res.status(400).json({
      message: "title, inputText and operation are required"
    });
  }

  if (!allowedOperations.has(operation)) {
    return res.status(400).json({
      message: "operation must be one of uppercase, lowercase, reverse, word_count"
    });
  }

  const task = await Task.create({
    userId: req.user.sub,
    title,
    inputText,
    operation,
    status: "pending",
    logs: ["Task created"]
  });

  try {
    await enqueueTaskJob({
      taskId: task._id.toString(),
      userId: req.user.sub,
      title,
      inputText,
      operation
    });
  } catch {
    task.status = "failed";
    task.errorMessage = "Queue unavailable";
    task.logs.push("Failed to enqueue task");
    await task.save();
    return res.status(503).json({ message: "Unable to enqueue task" });
  }

  task.logs.push("Task queued in Redis");
  await task.save();

  return res.status(201).json(task);
});

router.get("/:taskId", async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.taskId,
    userId: req.user.sub
  });

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  return res.json(task);
});

export default router;
