const mongoose = require("mongoose");

const BatterSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: "PlayerNew" },
    name: String,
    run: Number,
    ball: Number,
    fours: Number,
    sixes: Number,
    strike_rate: String,
    impact_status: Number,
    out_by: String,
  },
  { _id: false }
);

const BowlerSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: "PlayerNew" },
    name: String,
    over: String,
    maiden: Number,
    run: Number,
    wicket: Number,
    economy: String,
    dot_ball: Number,
    impact_status: Number,
  },
  { _id: false }
);

// Fall of wickets
const FallWicketSchema = new mongoose.Schema(
  {
    score: Number,
    name: String,
    player: { type: mongoose.Schema.Types.ObjectId, ref: "PlayerNew" },
    wicket: String,
    over: String,
  },
  { _id: false }
);

const PartnershipSchema = new mongoose.Schema(
  {
    player_a_id: { type: mongoose.Schema.Types.ObjectId, ref: "PlayerNew" },
    player_b_id: { type: mongoose.Schema.Types.ObjectId, ref: "PlayerNew" },
    players_name: String,
    run: Number,
    ball: Number,
  },
  { _id: false }
);

const InningsSchema = new mongoose.Schema(
  {
    inning: Number, 
    team: {
      team_id: Number,
      name: String,
      short_name: String,
      flag: String,
      score: Number,
      wicket: Number,
      test_declare: Number,
      over: String,
      extras: String,
    },
    batsmen: [BatterSchema],
    bowlers: [BowlerSchema],
    fallwicket: [FallWicketSchema],
    partnership: [PartnershipSchema],
  },
  { _id: false }
);

const MatchSchema = new mongoose.Schema(
  {
    matchId: { type: Number, unique: true },
    result: { type: String },
    is_hundred: { type: Number },
    innings: [InningsSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Scorecard", MatchSchema);
