const express = require("express");
const {
  getSeries,
  getSeriesOverview,
  getSeriesMatches,
  getSeriesPointsTable,
  getSeriesTeamSquads,
  getSeriesSquads,
} = require("../controllers/series");
const router = express.Router();

router.get("/all", getSeries);
router.get("/overview", getSeriesOverview);
router.get("/matches", getSeriesMatches);
router.get("/pointsTable", getSeriesPointsTable);
router.get("/squads", getSeriesSquads);

router.get("/teamSquads", getSeriesTeamSquads);

module.exports = router;
