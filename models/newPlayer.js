const mongoose = require('mongoose');

const BattingCareerSchema = new mongoose.Schema({
  match_type: { type: String, enum: ['ODI', 'T20', 'Test', 'IPL'], required: true },
  matches: Number,
  inning: Number,
  runs: Number,
  balls: Number,
  hundreds: Number,
  fifty: Number,
  high_score: Number,
  sr: Number,
  avg: Number,
  fours: Number,
  sixes: Number,
  not_out: Number,
  ducks: Number,
  two_hundreds: Number,
  three_hundreds: Number,
  four_hundreds: Number
}, { _id: false });

const BowlingCareerSchema = new mongoose.Schema({
  match_type: { type: String, enum: ['ODI', 'T20', 'Test', 'IPL'], required: true },
  matches: Number,
  inning: Number,
  overs: Number,
  runs: Number,
  wickets: Number,
  best_figures: String,
  average: Number,
  econ: Number,
  sr: Number,
  four_wickets: Number,
  five_wickets: Number,
  ten_wickets: Number
}, { _id: false })

const PlayerSchema = new mongoose.Schema({
  player_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  play_role: String,
  image: String,
  style_bating: String,
  style_bowling: String,
  born: String,
  height: String,
  birth_place: String,
  description: String, 
  teams: String,
  batting_career: [BattingCareerSchema],
  bowling_career: [BowlingCareerSchema]
}, { timestamps: true });

module.exports = mongoose.model('PlayerNew', PlayerSchema);
