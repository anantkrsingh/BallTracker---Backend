const express = require("express");
const router = express.Router();
const { getTeamRankings } = require("../controllers/ranking");

router.get("/", getTeamRankings);

module.exports = router;
