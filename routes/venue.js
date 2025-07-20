const express = require("express");

const { getVenues, getVenue } = require("../controllers/venue");
const router = express.Router();

router.get("/get", getVenues);
router.get("/get/:venueId", getVenue);


module.exports = router;
