const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    pushToken: {
      type: String,
      unique: true,
    },
    toss: { type: Boolean, default: true },
    wicket: { type: Boolean, default: false },
    news: { type: Boolean, default: false },
    match: { type: Boolean, default: true },
    score: { type: Boolean, default: true },
    stats: { type: Boolean, default: true },
    result: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PushTokens", tokenSchema);
