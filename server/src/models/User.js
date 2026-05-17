import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 24 },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: "pilot" },
    totalScore: { type: Number, default: 0 },
    achievements: [{ type: mongoose.Schema.Types.ObjectId, ref: "Achievement" }]
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
