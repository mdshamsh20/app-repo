import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { hashPassword, signToken, verifyPassword } from "../utils/auth.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email and password required" });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password)
  });

  return res.status(201).json({
    token: signToken(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.json({
    token: signToken(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  });
});

router.get("/me", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.sub).select("_id name email createdAt");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  });
});

export default router;
