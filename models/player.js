const mongoose = require('mongoose');

const BattingSchema = new mongoose.Schema({
  matches: Number,
  innings: Number,
  runs_scored: Number,
  not_outs: Number,
  highest_inning_score: Number,
  strike_rate: Number,
  balls_faced: Number,
  average: Number,
  four_x: Number,
  six_x: Number,
  fow_score: Number,
  fow_balls: Number,
  hundreds: Number,
  fifties: Number
}, { _id: false });

const CareerSchema = new mongoose.Schema({
  resource: String,
  type: String,
  season_id: Number,
  player_id: Number,
  bowling: mongoose.Schema.Types.Mixed,
  batting: { type: BattingSchema, default: null },
  updated_at: Date
}, { _id: false });

const PlayerSchema = new mongoose.Schema({
  resource: String,
  id: { type: Number, unique: true },
  country_id: Number,
  firstname: String,
  lastname: String,
  fullname: String,
  image_path: String,
  dateofbirth: Date,
  gender: String,
  battingstyle: String,
  bowlingstyle: String,
  position: {
    resource: String,
    id: Number,
    name: String
  },
  updated_at: Date,
  career: [CareerSchema]
});

module.exports = mongoose.model('Player', PlayerSchema);
