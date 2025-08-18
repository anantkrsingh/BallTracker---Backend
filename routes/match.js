const express = require("express");
const router = express.Router();
const {
  getMatches,
  getMatch,
  getMatchSquads,
  getMatchScorecard,
  getMatchCommentary,
  getMatchFeeds,
  fetchHomePageMatches,
  fetchLiveMatchData,
} = require("../controllers/matches");

router.get("/homepage", fetchHomePageMatches);
router.get("/live-match", fetchLiveMatchData);
router.get("/list", getMatches);
router.get("/get-match/:match_id", getMatch);
router.get("/get-match-scorecard/:match_id", getMatchScorecard);
router.get("/squads/:matchId", getMatchSquads);
router.get("/commentary/:matchId", getMatchCommentary);
router.get("/feeds/:matchId", getMatchFeeds);
module.exports = router;
