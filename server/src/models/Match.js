import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    roomCode: String,
    startedAt: Date,
    endedAt: Date,
    rounds: [
      {
        drawerId: String,
        word: String,
        guesses: [{ userId: String, username: String, guessedAt: Date, points: Number }],
        drawingQualityScore: Number
      }
    ],
    finalScores: [{ userId: String, username: String, score: Number }]
  },
  { timestamps: true }
);

export const Match = mongoose.model("Match", matchSchema);
