const mongoose = require("mongoose");

const Squads = new mongoose.Schema({
  series_id: { type: Number, required: true, unique: true },
  series: { type: mongoose.Schema.Types.ObjectId, required: true },
  teams: [
    {
      name: { type: String, required: true },
      short_name: { type: String, required: true },
      flag: { type: String, required: true },
      players: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PlayerNew",
        },
      ],
    },
  ],
});

module.exports = new mongoose.model("Squads", Squads);
