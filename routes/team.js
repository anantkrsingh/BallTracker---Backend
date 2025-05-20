const express = require("express");
const router = express.Router();
const Config = require("../models/config");
const {
  insertTeam,
  getPaginatedTeams,
  getTeamById,
} = require("../controllers/team");

router.get("/", getPaginatedTeams);
router.get("/team/:teamId", getTeamById);

module.exports = router;
