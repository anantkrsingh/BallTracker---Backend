const mongoose = require("mongoose");

const SeriesSchema = new mongoose.Schema({
  series_id: { type: Number, required: true, unique: true },
  series: { type: String, required: true },
  series_type: {
    type: String,
    required: true,
  },
  series_date: { type: String, required: true },
  total_matches: { type: Number, required: true },
  start_date: { type: String, required: true },
  end_date: { type: String, required: true },
  image: { type: String, required: true },
  month_wise: { type: String, required: true },
  recent_matches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Matches" }],
});

module.exports = mongoose.model("Series", SeriesSchema);
