const mongoose = require("mongoose");

const TeamSummarySchema = new mongoose.Schema(
  {
    team_id: { type: Number, required: true },
    name: String,
    short_name: String,
    img: String,
    scores: String,
    overs: String,
  },
  { _id: false }
);

const VenueWeatherSchema = new mongoose.Schema(
  {
    temp_c: String,
    temp_f: String,
    weather: String,
    weather_icon: String,
    wind_mph: String,
    wind_kph: String,
    wind_dir: String,
    humidity: String,
    cloud: String,
  },
  { _id: false }
);

const MatchSchema = new mongoose.Schema(
  {
    match_id: { type: Number, required: true, unique: true },
    series: String,
    series_id: String,
    date_wise: String,
    match_date: String,
    match_time: String,
    matchs: String,
    venue_id: Number,
    venue: String,
    place: String,
    fav_team: String,
    min_rate: Number,
    max_rate: Number,
    is_hundred: { type: Number, default: 0 },
    is_impact: { type: String, default: "0" },
    series_type: String,
    match_type: String,
    match_status: { type: String },
    result: String,
    toss: String,
    umpire: String,
    third_umpire: String,
    referee: String,
    team_a_over: String,
    team_b_over: String,
    team_a_scores: String,
    team_a_scores: String,
    man_of_match: String,
    man_of_match_player: String,
    venue_weather: VenueWeatherSchema,
    team_a: TeamSummarySchema,
    team_b: TeamSummarySchema,

    scorecard: { type: mongoose.Types.ObjectId, ref: "Scorecard" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Match", MatchSchema);
