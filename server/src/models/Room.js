import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    players: [{ userId: mongoose.Schema.Types.ObjectId, username: String, score: Number }],
    settings: {
      maxPlayers: { type: Number, default: 8 },
      roundSeconds: { type: Number, default: 80 },
      rounds: { type: Number, default: 3 },
      difficulty: { type: String, enum: ["casual", "standard", "chaos"], default: "standard" },
      wordPack: { type: [String], default: [] },
      powerUps: { type: Boolean, default: true },
      voiceChat: { type: Boolean, default: false }
    },
    status: { type: String, enum: ["waiting", "playing", "finished"], default: "waiting" }
  },
  { timestamps: true }
);

export const Room = mongoose.model("Room", roomSchema);
