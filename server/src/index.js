import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import aiRoutes from "./routes/ai.js";
import { RoomManager } from "./game/RoomManager.js";
import { registerSocket } from "./socket/registerSocket.js";

const app = express();
const server = http.createServer(app);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ["GET", "POST"],
  credentials: true
};
const io = new Server(server, {
  cors: corsOptions,
  transports: ["websocket", "polling"],
  pingInterval: 25000,
  pingTimeout: 20000
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get("/health", (_, res) => res.json({ ok: true, service: "AirSketch Arena" }));
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);

const rooms = new RoomManager(io);
registerSocket(io, rooms);

io.engine.on("connection_error", (error) => {
  console.error("Socket engine connection error:", {
    code: error.code,
    message: error.message,
    context: error.context
  });
});

connectDatabase()
  .catch((error) => console.warn("MongoDB unavailable, continuing with in-memory rooms:", error.message))
  .finally(() => {
    server.listen(env.port, () => console.log(`AirSketch Arena server listening on ${env.port}`));
  });
