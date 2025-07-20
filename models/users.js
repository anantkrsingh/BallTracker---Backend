const mongoose = require("mongoose");

const configSchema = new mongoose.Schema(
  {
    uuid: String,
    token: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Configs", configSchema);
