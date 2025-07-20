const express = require("express");
const router = express.Router();
const {
  getMatches,
  getMatch,
  getMatchScorecard,
} = require("../controllers/matches");


router.get("/list", getMatches);
router.get("/get-match/:match_id", getMatch);
router.get("/get-match-scorecard/:match_id", getMatchScorecard);


module.exports = router;
