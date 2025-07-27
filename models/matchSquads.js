const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
  player_id: { type: Number, required: true },
  player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
  name: { type: String, required: true },
  play_role: { type: String, required: true },
  image: { type: String, required: true },
});

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  short_name: { type: String, required: true },
  flag: { type: String, required: true },
  player: [PlayerSchema],
});

const MatchTeamsSchema = new mongoose.Schema(
  {
    status: { type: Boolean, required: true },
    msg: { type: String, required: true },
    data: {
      team_a: { type: TeamSchema, required: true },
      team_b: { type: TeamSchema, required: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MatchSquads", MatchTeamsSchema);
