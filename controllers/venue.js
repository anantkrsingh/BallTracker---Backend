const Venue = require("../models/venue");

async function getVenue(req, res) {
  try {
    const { venueId } = req.query;
  } catch (error) {
    console.error("[getVenue]", error);
  }
}
async function getVenues(req, res) {
  try {
    const { series, match } = req.query;
    if (!series && !match) {
      return res.status(400).json({ error: "Series or match is required" });
    }
    const venues = await Venue.find({ series_id: series, match });
    return res.status(200).json({ data: venues });
  } catch (error) {
    console.error("[getVenues]", error);
  }
}

module.exports = { getVenue, getVenues };
