const mongoose = require("mongoose");

const configSchema = new mongoose.Schema(
  {
    is_ads_show: {
      type: Number,
      default: false,
    },
    base_url: {
      type: String,
      required: true,
    },
    a_api_key: {
      type: String,
      required: true,
    },
    news_api_key: {
      type: String,
      required: true,
    },
    banner_id: {
      type: String,
      required: true,
    },
    interstitial_id: {
      type: String,
      required: true,
    },
    native_id: {
      type: String,
      required: true,
    },
    adMobCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Configs", configSchema);
