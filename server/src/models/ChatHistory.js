import mongoose from "mongoose";

const chatHistorySchema = new mongoose.Schema(
  {
    roomCode: { type: String, index: true },
    userId: String,
    username: String,
    message: String,
    type: { type: String, enum: ["chat", "guess", "system"], default: "chat" },
    flagged: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const ChatHistory = mongoose.model("ChatHistory", chatHistorySchema);
