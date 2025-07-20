const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    team_id: {
      type: String,
      required: true,
      unique: true,
    },
    series_id: {
      type: String,
      required: true,
    },

    teams: {
      type: String,
      required: true,
    },
    flag: {
      type: String,
      required: true,
    },
    P: {
      type: Number,
      required: true,
    },
    W: {
      type: Number,
      required: true,
    },
    L: {
      type: Number,
      required: true,
    },
    NR: {
      type: Number,
      required: true,
    },
    Pts: {
      type: Number,
      required: true,
    },
    NRR: {
      type: String,
      required: true,
    },
    QE: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PointsTable", teamSchema);
