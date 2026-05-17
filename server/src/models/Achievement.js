import mongoose from "mongoose";

const achievementSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true },
    name: String,
    description: String,
    icon: String
  },
  { timestamps: true }
);

export const Achievement = mongoose.model("Achievement", achievementSchema);
