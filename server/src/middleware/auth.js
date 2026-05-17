import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signToken(user) {
  return jwt.sign({ id: user._id?.toString() || user.id, username: user.username }, env.jwtSecret, {
    expiresIn: "7d"
  });
}

export function authRequired(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.user = {
        id: `socket-guest-${socket.id}`,
        username: "Guest"
      };
      console.warn("Socket connected without token, using guest identity:", socket.id);
      return next();
    }
    socket.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch (error) {
    if (process.env.NODE_ENV === "production") return next(error);
    const decoded = jwt.decode(socket.handshake.auth?.token);
    socket.user = {
      id: decoded?.id || `socket-guest-${socket.id}`,
      username: decoded?.username || "Guest"
    };
    console.warn("Socket token rejected in development, using guest identity:", error.message);
    next();
  }
}
