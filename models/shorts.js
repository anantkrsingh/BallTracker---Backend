const mongoose = require("mongoose");

const ShortsSchema = new mongoose.Schema(
  {
    news_id: {
      type: Number,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    image: {
      type: String,
    },
    pub_date: {
      type: String,
    },
    content: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Shorts", ShortsSchema);
