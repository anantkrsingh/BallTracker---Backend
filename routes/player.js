const express = require("express");
const router = express.Router();
const { getPaginatedPlayers, getPlayerById, getOldPlayerById, getPlayerByIdV1 } = require("../controllers/players");

router.get("/", getPaginatedPlayers);
router.get("/player/:playerId",getPlayerById);
router.get("/v1/player/:playerId",getPlayerByIdV1)
router.get("/oldPlayer/:playerId",getOldPlayerById)

module.exports = router;
