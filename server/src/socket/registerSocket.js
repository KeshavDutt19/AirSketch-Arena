import { socketAuth } from "../middleware/auth.js";
import { moderateChat, sanitizeText } from "../utils/security.js";
import { ChatHistory } from "../models/ChatHistory.js";

const socketBuckets = new Map();

function limited(socketId, key, limit, windowMs) {
  const id = `${socketId}:${key}`;
  const now = Date.now();
  const bucket = socketBuckets.get(id) || { count: 0, reset: now + windowMs };
  if (now > bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + windowMs;
  }
  bucket.count += 1;
  socketBuckets.set(id, bucket);
  return bucket.count > limit;
}

function eventUser(socket, profile) {
  const stored = socket.data?.profile;
  return {
    id: sanitizeText(profile?.id || stored?.id || socket.user.id, 120),
    username: sanitizeText(profile?.username || stored?.username || socket.user.username, 24),
    socketId: socket.id
  };
}

export function registerSocket(io, rooms) {
  io.use(socketAuth);

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id, socket.user?.username || "unknown");

    socket.on("profile:update", ({ profile } = {}, ack) => {
      const user = eventUser(socket, profile);
      socket.data.profile = { id: user.id, username: user.username };
      rooms.updateProfile(user);
      console.log("profile:update received:", socket.id, user.username);
      ack?.({ ok: true, profile: socket.data.profile });
    });

    socket.on("room:create", ({ settings, profile } = {}, ack) => {
      const user = eventUser(socket, profile);
      socket.data.profile = { id: user.id, username: user.username };
      console.log("room:create received:", socket.id, user.username);
      try {
        const room = rooms.createRoom(user, settings);
        socket.join(room.code);
        console.log("Room created:", room.code, "by", user.username);
        ack?.({ ok: true, room });
      } catch (error) {
        console.error("Room create error:", error.message);
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on("room:join", ({ code, spectator, profile } = {}, ack) => {
      const user = eventUser(socket, profile);
      socket.data.profile = { id: user.id, username: user.username };
      console.log("room:join received:", socket.id, code, user.username);
      try {
        const normalized = sanitizeText(code, 8).toUpperCase();
        socket.join(normalized);
        const room = rooms.addPlayer(normalized, user, Boolean(spectator));
        socket.emit("canvas:hydrate", rooms.getStrokes(normalized));
        console.log("Room joined:", normalized, "by", user.username, spectator ? "(spectator)" : "(player)");
        ack?.({ ok: true, room });
      } catch (error) {
        console.error("Room join error:", error.message);
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on("room:state:get", ({ code } = {}, ack) => {
      try {
        const normalized = sanitizeText(code, 8).toUpperCase();
        ack?.({ ok: true, room: rooms.getRoom(normalized), strokes: rooms.getStrokes(normalized) });
      } catch (error) {
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on("room:start", ({ code } = {}, ack) => {
      const user = eventUser(socket);
      try {
        rooms.start(sanitizeText(code, 8).toUpperCase(), user.id);
        console.log("Room started:", sanitizeText(code, 8).toUpperCase(), "by", user.username);
        ack?.({ ok: true });
      } catch (error) {
        console.error("Room start error:", error.message);
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on("round:select_word", ({ code, word } = {}, ack) => {
      const user = eventUser(socket);
      try {
        const ok = rooms.selectWord(sanitizeText(code, 8).toUpperCase(), user.id, String(word || ""));
        console.log("Word selected:", sanitizeText(code, 8).toUpperCase(), "by", user.username, ok ? "ok" : "ignored");
        ack?.({ ok });
      } catch (error) {
        console.error("Word select error:", error.message);
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on("room:kick", ({ code, targetId } = {}, ack) => {
      const user = eventUser(socket);
      try {
        rooms.kick(sanitizeText(code, 8).toUpperCase(), user.id, sanitizeText(targetId, 80));
        ack?.({ ok: true });
      } catch (error) {
        console.error("Room kick error:", error.message);
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on("chat:send", async ({ code, message } = {}, ack) => {
      const user = eventUser(socket);
      if (limited(socket.id, "chat", 8, 5000)) return ack?.({ ok: false, error: "Slow down" });
      const roomCode = sanitizeText(code, 8).toUpperCase();
      const text = sanitizeText(message, 180);
      if (!text) return;
      const moderation = moderateChat(text);
      if (!moderation.allowed) return ack?.({ ok: false, error: "Message blocked by moderation" });
      const guess = rooms.submitGuess(roomCode, user.id, text);
      const payload = {
        id: `${Date.now()}-${socket.id}`,
        userId: user.id,
        username: user.username,
        message: guess.correct ? "guessed the word!" : text,
        type: guess.correct ? "guess" : "chat",
        at: Date.now()
      };
      io.to(roomCode).emit("chat:message", payload);
      ChatHistory.create({ roomCode, userId: user.id, username: user.username, message: text, type: payload.type, flagged: moderation.flagged }).catch(() => {});
      ack?.({ ok: true, correct: guess.correct });
    });

    socket.on("canvas:stroke", ({ code, stroke } = {}) => {
      const user = eventUser(socket);
      if (limited(socket.id, "stroke", 80, 1000)) return;
      rooms.addStroke(sanitizeText(code, 8).toUpperCase(), user.id, stroke);
    });

    socket.on("canvas:undo", ({ code } = {}) => {
      const user = eventUser(socket);
      rooms.undo(sanitizeText(code, 8).toUpperCase(), user.id);
    });

    socket.on("canvas:clear", ({ code } = {}) => {
      const user = eventUser(socket);
      rooms.clear(sanitizeText(code, 8).toUpperCase(), user.id);
    });

    socket.on("rematch-request", ({ code } = {}, ack) => {
      const user = eventUser(socket);
      try {
        console.log("rematch-request received:", code, user.username);
        const rematch = rooms.requestRematch(sanitizeText(code, 8).toUpperCase(), user.id);
        ack?.({ ok: true, rematch });
      } catch (error) {
        console.error("Rematch request error:", error.message);
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on("rematch-accepted", ({ code } = {}, ack) => {
      const user = eventUser(socket);
      try {
        console.log("rematch-accepted received:", code, user.username);
        const rematch = rooms.acceptRematch(sanitizeText(code, 8).toUpperCase(), user.id);
        ack?.({ ok: true, rematch });
      } catch (error) {
        console.error("Rematch accept error:", error.message);
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on("webrtc:signal", ({ code, targetId, data } = {}) => {
      const user = eventUser(socket);
      const room = rooms.rooms.get(sanitizeText(code, 8).toUpperCase());
      const target = room && [...room.players.values()].find((p) => p.id === targetId);
      if (target) io.to(target.socketId).emit("webrtc:signal", { from: user.id, data });
    });

    socket.on("disconnecting", () => {
      const user = eventUser(socket);
      for (const code of socket.rooms) {
        if (code !== socket.id) rooms.removePlayer(code, user.id);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("User disconnected:", socket.id, reason);
    });
  });
}
