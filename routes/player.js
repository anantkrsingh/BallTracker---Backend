const express = require("express");
const router = express.Router();
const Config = require("../models/config");
const { insertTeam } = require("../controllers/team");
const { getPaginatedPlayers, getPlayerById, getOldPlayerById } = require("../controllers/players");

router.get("/", getPaginatedPlayers);
router.get("/player/:playerId",getPlayerById);
router.get("/oldPlayer/:playerId",getOldPlayerById)

module.exports = router;
