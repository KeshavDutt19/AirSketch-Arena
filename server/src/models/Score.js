import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: String,
    roomCode: String,
    points: Number,
    reason: String
  },
  { timestamps: true }
);

export const Score = mongoose.model("Score", scoreSchema);
