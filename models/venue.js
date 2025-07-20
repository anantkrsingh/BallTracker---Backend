const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema({
  id: Number,
  name: String,
  place: String,
  image: String,
  series_id: Number,
  created_at: Date,
  updated_at: Date,
  match_id: Number,
  series: { type: mongoose.Schema.Types.ObjectId, ref: "Series" },
  match: { type: mongoose.Schema.Types.ObjectId, ref: "Match" },
});

module.exports = mongoose.model("Venue", venueSchema);
