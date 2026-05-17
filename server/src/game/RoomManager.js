import { nanoid } from "nanoid";
import { roomCode } from "../utils/security.js";
import { buildWordChoices, maskWord, revealNextIndex } from "./words.js";

const ROUND_RESULT_MS = 7000;
const WORD_CHOICE_MS = 15000;
const REMATCH_COUNTDOWN_MS = 4000;

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
  }

  createRoom(host, settings = {}) {
    let code = roomCode();
    while (this.rooms.has(code)) code = roomCode();
    const room = {
      code,
      hostId: host.id,
      players: new Map(),
      spectators: new Map(),
      settings: {
        maxPlayers: 8,
        roundSeconds: 80,
        rounds: 3,
        difficulty: "medium",
        wordTheme: "all",
        wordPack: [],
        powerUps: true,
        voiceChat: false,
        ...settings
      },
      status: "waiting",
      currentRound: 0,
      drawerIndex: -1,
      word: "",
      wordCategory: "",
      wordDifficulty: "",
      wordChoices: [],
      revealedIndexes: [],
      usedWords: new Set(),
      guessed: new Set(),
      strokes: [],
      timer: null,
      hintTimer: null,
      roundEndsAt: null,
      rematch: { requestedBy: null, accepted: new Set(), countdownEndsAt: null, timer: null },
      matchId: nanoid()
    };
    this.rooms.set(code, room);
    this.addPlayer(code, host);
    return this.publicRoom(room);
  }

  addPlayer(code, user, spectator = false) {
    const room = this.requireRoom(code);
    if (!spectator && room.players.size >= room.settings.maxPlayers) throw new Error("Room is full");
    const target = spectator ? room.spectators : room.players;
    const existing = target.get(user.id);
    target.set(user.id, {
      id: user.id,
      socketId: user.socketId,
      username: user.username,
      score: existing?.score || 0,
      connected: true,
      guessedAt: existing?.guessedAt || null,
      powerUps: existing?.powerUps || ["mirror", "slowmo"]
    });
    this.emitState(room);
    return this.publicRoom(room);
  }

  reconnect(code, user) {
    const room = this.requireRoom(code);
    const player = room.players.get(user.id) || room.spectators.get(user.id);
    if (player) {
      player.connected = true;
      player.socketId = user.socketId;
      player.username = user.username;
    }
    this.emitState(room);
  }

  updateProfile(user) {
    const updatedRooms = [];
    for (const room of this.rooms.values()) {
      const player = room.players.get(user.id);
      const spectator = room.spectators.get(user.id);
      if (player) {
        player.username = user.username;
        player.socketId = user.socketId;
        updatedRooms.push(room);
      }
      if (spectator) {
        spectator.username = user.username;
        spectator.socketId = user.socketId;
        updatedRooms.push(room);
      }
    }
    for (const room of new Set(updatedRooms)) {
      this.io.to(room.code).emit("player:updated", { id: user.id, username: user.username });
      this.emitState(room);
    }
  }

  getRoom(code) {
    return this.publicRoom(this.requireRoom(code));
  }

  getStrokes(code) {
    return this.requireRoom(code).strokes;
  }

  removePlayer(code, userId) {
    const room = this.rooms.get(code);
    if (!room) return;
    const player = room.players.get(userId);
    if (player) player.connected = false;
    const spectator = room.spectators.get(userId);
    if (spectator) room.spectators.delete(userId);
    this.emitState(room);
  }

  kick(code, hostId, targetId) {
    const room = this.requireRoom(code);
    if (room.hostId !== hostId) throw new Error("Only the host can kick players");
    room.players.delete(targetId);
    this.io.to(code).emit("player:kicked", targetId);
    this.emitState(room);
  }

  start(code, hostId) {
    const room = this.requireRoom(code);
    if (room.hostId !== hostId) throw new Error("Only host can start");
    if (room.players.size < 2) throw new Error("Need at least two players");
    room.status = "playing";
    room.currentRound = 0;
    room.drawerIndex = -1;
    room.usedWords.clear();
    room.rematch = { requestedBy: null, accepted: new Set(), countdownEndsAt: null, timer: null };
    this.nextRound(room);
  }

  nextRound(room) {
    clearTimeout(room.timer);
    clearTimeout(room.hintTimer);
    room.currentRound += 1;
    if (room.currentRound > room.settings.rounds) {
      room.status = "finished";
      this.io.to(room.code).emit("game:finished", this.leaderboard(room));
      this.emitState(room);
      return;
    }
    this.removeInactivePlayers(room);
    const players = [...room.players.values()];
    if (players.length < 2) {
      room.status = "waiting";
      this.io.to(room.code).emit("game:paused", { reason: "Waiting for more connected players" });
      this.emitState(room);
      return;
    }
    room.drawerIndex = (room.drawerIndex + 1) % players.length;
    room.status = "choosing";
    room.word = "";
    room.wordCategory = "";
    room.wordDifficulty = "";
    room.wordChoices = buildWordChoices(room.settings, room.usedWords, 3);
    room.revealedIndexes = [];
    room.guessed = new Set();
    room.strokes = [];
    room.roundEndsAt = null;
    this.io.to(room.code).emit("canvas:clear");
    this.io.to(room.code).emit("round:choosing", {
      round: room.currentRound,
      drawerId: players[room.drawerIndex].id,
      category: "Choosing...",
      choiceEndsAt: Date.now() + WORD_CHOICE_MS
    });
    this.io.to(players[room.drawerIndex].socketId).emit("round:word_choices", {
      choices: room.wordChoices,
      seconds: WORD_CHOICE_MS / 1000
    });
    this.emitState(room);
    room.timer = setTimeout(() => {
      if (room.status === "choosing") this.selectWord(room.code, players[room.drawerIndex].id, room.wordChoices[0]?.word);
    }, WORD_CHOICE_MS);
  }

  selectWord(code, userId, selectedWord) {
    const room = this.requireRoom(code);
    const drawer = [...room.players.values()][room.drawerIndex];
    if (room.status !== "choosing" || drawer?.id !== userId) return false;
    const choice = room.wordChoices.find((entry) => entry.word === selectedWord) || room.wordChoices[0];
    if (!choice) return false;
    clearTimeout(room.timer);
    room.status = "playing";
    room.word = choice.word;
    room.wordCategory = choice.category;
    room.wordDifficulty = choice.difficulty;
    room.usedWords.add(choice.word.toLowerCase());
    room.revealedIndexes = [];
    room.roundEndsAt = Date.now() + room.settings.roundSeconds * 1000;
    this.io.to(room.code).emit("round:started", {
      round: room.currentRound,
      drawerId: drawer.id,
      endsAt: room.roundEndsAt,
      hint: maskWord(room.word, room.revealedIndexes),
      category: room.wordCategory,
      difficulty: room.wordDifficulty,
      seconds: room.settings.roundSeconds
    });
    this.io.to(drawer.socketId).emit("round:secret", {
      word: room.word,
      category: room.wordCategory,
      difficulty: room.wordDifficulty
    });
    this.scheduleHintReveal(room, 1);
    this.emitState(room);
    room.timer = setTimeout(() => this.endRound(room), room.settings.roundSeconds * 1000);
    return true;
  }

  scheduleHintReveal(room, revealNumber) {
    clearTimeout(room.hintTimer);
    const delay = Math.round((room.settings.roundSeconds * 1000 * revealNumber) / 3);
    room.hintTimer = setTimeout(() => {
      if (room.status !== "playing") return;
      room.revealedIndexes = revealNextIndex(room.word, room.revealedIndexes);
      this.io.to(room.code).emit("round:hint", {
        hint: maskWord(room.word, room.revealedIndexes),
        category: room.wordCategory,
        revealed: room.revealedIndexes.length
      });
      this.emitState(room);
      if (revealNumber < 2) this.scheduleHintReveal(room, revealNumber + 1);
    }, delay);
  }

  endRound(room) {
    clearTimeout(room.timer);
    clearTimeout(room.hintTimer);
    if (room.status !== "playing") return;
    room.status = "round_result";
    const drawingQuality = Math.min(200, Math.round(room.strokes.length * 1.4));
    const drawer = [...room.players.values()][room.drawerIndex];
    if (drawer) drawer.score += Math.round(drawingQuality / 4);
    this.io.to(room.code).emit("round:ended", {
      word: room.word,
      drawingQuality,
      leaderboard: this.leaderboard(room)
    });
    this.emitState(room);
    setTimeout(() => {
      if (room.status === "round_result") this.nextRound(room);
    }, ROUND_RESULT_MS);
  }

  submitGuess(code, userId, message) {
    const room = this.requireRoom(code);
    const player = room.players.get(userId);
    if (!player || room.status !== "playing") return { correct: false };
    if (userId === [...room.players.values()][room.drawerIndex]?.id) return { correct: false };
    const correct = message.toLowerCase() === room.word.toLowerCase();
    if (correct && !room.guessed.has(userId)) {
      room.guessed.add(userId);
      player.guessedAt = Date.now();
      const remaining = Math.max(0, room.roundEndsAt - Date.now());
      const points = 100 + Math.round((remaining / (room.settings.roundSeconds * 1000)) * 400);
      player.score += points;
      this.io.to(room.code).emit("guess:correct", { userId, username: player.username, points });
      if (room.guessed.size >= room.players.size - 1) this.endRound(room);
      this.emitState(room);
      return { correct: true, points };
    }
    return { correct: false };
  }

  addStroke(code, userId, stroke) {
    const room = this.requireRoom(code);
    const drawer = [...room.players.values()][room.drawerIndex];
    if (room.status !== "playing" || drawer?.id !== userId) return false;
    const cleanStroke = {
      id: String(stroke.id || nanoid()),
      mode: stroke.mode === "erase" ? "erase" : "draw",
      color: String(stroke.color || "#57f7ff").slice(0, 24),
      size: Math.max(1, Math.min(64, Number(stroke.size || 6))),
      points: Array.isArray(stroke.points) ? stroke.points.slice(-6).map((p) => ({ x: +p.x, y: +p.y })) : []
    };
    room.strokes.push(cleanStroke);
    if (room.strokes.length > 4000) room.strokes.shift();
    this.io.to(code).emit("canvas:stroke", cleanStroke);
    return true;
  }

  undo(code, userId) {
    const room = this.requireRoom(code);
    const drawer = [...room.players.values()][room.drawerIndex];
    if (drawer?.id !== userId) return;
    room.strokes.pop();
    this.io.to(code).emit("canvas:hydrate", room.strokes);
  }

  clear(code, userId) {
    const room = this.requireRoom(code);
    const drawer = [...room.players.values()][room.drawerIndex];
    if (drawer?.id !== userId) return;
    room.strokes = [];
    this.io.to(code).emit("canvas:clear");
  }

  requestRematch(code, userId) {
    const room = this.requireRoom(code);
    const player = room.players.get(userId);
    if (!player) throw new Error("Player not found");
    room.rematch.requestedBy = userId;
    room.rematch.accepted.add(userId);
    const payload = this.rematchPayload(room);
    this.io.to(code).emit("rematch-request", { ...payload, requestedBy: player.username });
    this.io.to(code).emit("rematch-accepted", payload);
    this.maybeStartRematch(room);
    this.emitState(room);
    return payload;
  }

  acceptRematch(code, userId) {
    const room = this.requireRoom(code);
    if (!room.players.has(userId)) throw new Error("Player not found");
    room.rematch.accepted.add(userId);
    const payload = this.rematchPayload(room);
    this.io.to(code).emit("rematch-accepted", payload);
    this.maybeStartRematch(room);
    this.emitState(room);
    return payload;
  }

  maybeStartRematch(room) {
    const activePlayers = this.activePlayers(room);
    const needed = Math.max(1, Math.floor(activePlayers.length / 2) + 1);
    const acceptedActive = activePlayers.filter((player) => room.rematch.accepted.has(player.id)).length;
    if (acceptedActive < needed || room.rematch.countdownEndsAt) return;
    room.status = "rematch_countdown";
    room.rematch.countdownEndsAt = Date.now() + REMATCH_COUNTDOWN_MS;
    this.io.to(room.code).emit("rematch-start", {
      countdownEndsAt: room.rematch.countdownEndsAt,
      accepted: room.rematch.accepted.size,
      needed
    });
    clearTimeout(room.rematch.timer);
    room.rematch.timer = setTimeout(() => this.restartMatch(room), REMATCH_COUNTDOWN_MS);
  }

  restartMatch(room) {
    clearTimeout(room.timer);
    clearTimeout(room.hintTimer);
    this.removeInactivePlayers(room);
    for (const player of room.players.values()) {
      player.score = 0;
      player.guessedAt = null;
    }
    room.currentRound = 0;
    room.drawerIndex = -1;
    room.word = "";
    room.wordCategory = "";
    room.wordDifficulty = "";
    room.wordChoices = [];
    room.revealedIndexes = [];
    room.usedWords.clear();
    room.guessed = new Set();
    room.strokes = [];
    room.roundEndsAt = null;
    room.matchId = nanoid();
    room.rematch = { requestedBy: null, accepted: new Set(), countdownEndsAt: null, timer: null };
    this.io.to(room.code).emit("canvas:clear");
    this.io.to(room.code).emit("rematch:started");
    this.nextRound(room);
  }

  activePlayers(room) {
    return [...room.players.values()].filter((player) => player.connected);
  }

  removeInactivePlayers(room) {
    for (const [id, player] of room.players.entries()) {
      if (!player.connected) room.players.delete(id);
    }
  }

  rematchPayload(room) {
    const activePlayers = this.activePlayers(room);
    const acceptedActive = activePlayers.filter((player) => room.rematch.accepted.has(player.id)).length;
    return {
      requestedBy: room.rematch.requestedBy,
      accepted: acceptedActive,
      needed: Math.max(1, Math.floor(activePlayers.length / 2) + 1),
      players: activePlayers.map((player) => player.id),
      countdownEndsAt: room.rematch.countdownEndsAt
    };
  }

  leaderboard(room) {
    return [...room.players.values()].sort((a, b) => b.score - a.score);
  }

  publicRoom(room) {
    const drawer = [...room.players.values()][room.drawerIndex];
    return {
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      settings: room.settings,
      currentRound: room.currentRound,
      roundEndsAt: room.roundEndsAt,
      drawerId: drawer?.id,
      hint: room.word ? maskWord(room.word, room.revealedIndexes) : "",
      category: room.wordCategory,
      difficulty: room.wordDifficulty,
      rematch: this.rematchPayload(room),
      players: [...room.players.values()].map(({ socketId, ...player }) => player),
      spectators: [...room.spectators.values()].map(({ socketId, ...player }) => player)
    };
  }

  emitState(room) {
    this.io.to(room.code).emit("room:state", this.publicRoom(room));
  }

  requireRoom(code) {
    const room = this.rooms.get(String(code || "").toUpperCase());
    if (!room) throw new Error("Room not found");
    return room;
  }
}
