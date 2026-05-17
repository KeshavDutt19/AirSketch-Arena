import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { signToken } from "../middleware/auth.js";
import { sanitizeText } from "../utils/security.js";

const router = Router();
const credentials = z.object({
  username: z.string().min(3).max(24),
  password: z.string().min(6).max(72)
});

router.post("/register", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid username or password" });
  const username = sanitizeText(parsed.data.username, 24);
  const exists = await User.findOne({ username });
  if (exists) return res.status(409).json({ error: "Username taken" });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await User.create({ username, passwordHash });
  res.json({ token: signToken(user), user: { id: user._id, username: user.username, avatar: user.avatar } });
});

router.post("/login", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid username or password" });
  const user = await User.findOne({ username: sanitizeText(parsed.data.username, 24) });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  res.json({ token: signToken(user), user: { id: user._id, username: user.username, avatar: user.avatar } });
});

router.post("/guest", async (req, res) => {
  const username = sanitizeText(req.body.username || "Guest", 24);
  const id = sanitizeText(req.body.id || `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`, 120);
  res.json({ token: signToken({ id, username }), user: { id, username } });
});

export default router;
