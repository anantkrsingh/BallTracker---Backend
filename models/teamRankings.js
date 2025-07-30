const mongoose = require("mongoose");

const TeamRankingsSchema = new mongoose.Schema({
  style: String,
  id: Number,
  name: String,
  rating: Number,
  points: Number,
  type: String,
  rankingType: String,
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  position: Number,
});

module.exports = mongoose.model("TeamRankings", TeamRankingsSchema);