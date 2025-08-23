const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    pushToken: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PushTokens", tokenSchema);
