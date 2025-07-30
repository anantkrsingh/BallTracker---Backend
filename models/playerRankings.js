const mongoose = require("mongoose");

const PlayerRankingsSchema = new mongoose.Schema({
  style: String,
  id: Number,
  name: String,
  rating: Number,
  country: String,
  type: String,
  rankingType: String,
  position: Number,
  player: { type: mongoose.Schema.Types.ObjectId, ref: "PlayerNew" },
});

module.exports = mongoose.model("PlayerRankings", PlayerRankingsSchema);